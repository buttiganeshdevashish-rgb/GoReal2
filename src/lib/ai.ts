import { getDb, daysAgo, mondayOf, todayStr } from "./db";
import { computeStreaks } from "./stats";
import type { InsightPayload, User } from "./types";

// ---------- OpenAI wrapper (configurable endpoint, graceful fallback) ----------

async function callOpenAI(system: string, userText: string): Promise<string | null> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return null;
  try {
    const base = process.env.OPENAI_BASE_URL || "https://api.openai.com/v1";
    const res = await fetch(`${base}/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || "gpt-4o-mini",
        messages: [
          { role: "system", content: system },
          { role: "user", content: userText },
        ],
        temperature: 0.7,
        max_tokens: 500,
        response_format: { type: "json_object" },
      }),
      signal: AbortSignal.timeout(12000),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.choices?.[0]?.message?.content ?? null;
  } catch {
    return null;
  }
}

// ---------- 1. AI Weekly Coach ----------

async function buildUserWeekStats(userId: number) {
  const db = getDb();
  const days: { date: string; posted: boolean; dow: number; hour: number | null; likes: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const date = daysAgo(i);
    const post = (await db.prepare("SELECT id, created_at FROM posts WHERE user_id = ? AND post_date = ?").get(userId, date)) as
      | { id: number; created_at: string }
      | undefined;
    const likesRow = post
      ? ((await db.prepare("SELECT COUNT(*) c FROM likes WHERE post_id = ?").get(post.id)) as { c: number })
      : null;
    const likes = likesRow ? likesRow.c : 0;
    days.push({
      date,
      posted: !!post,
      dow: new Date(date + "T12:00:00").getDay(),
      hour: post ? Number(post.created_at.slice(11, 13)) : null,
      likes,
    });
  }
  const prevWeekPostsRow = (await db
    .prepare("SELECT COUNT(*) c FROM posts WHERE user_id = ? AND post_date >= ? AND post_date < ?")
    .get(userId, daysAgo(13), daysAgo(6))) as { c: number } | undefined;
  const prevWeekPosts = prevWeekPostsRow ? prevWeekPostsRow.c : 0;
  return { days, prevWeekPosts };
}

const DOW = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export async function engineWeeklyCoach(user: User): Promise<InsightPayload> {
  const { days, prevWeekPosts } = await buildUserWeekStats(user.id);
  const posted = days.filter((d) => d.posted).length;
  const s = await computeStreaks(user.id);
  const missedDows = days.filter((d) => !d.posted).map((d) => DOW[d.dow]);
  const hours = days.filter((d) => d.hour !== null).map((d) => d.hour as number);
  const avgHour = hours.length ? Math.round(hours.reduce((a, b) => a + b, 0) / hours.length) : null;
  const totalLikes = days.reduce((a, d) => a + d.likes, 0);
  const delta = prevWeekPosts > 0 ? Math.round(((posted - prevWeekPosts) / prevWeekPosts) * 100) : posted > 0 ? 100 : 0;

  const observations: string[] = [];
  observations.push(`You posted ${posted} out of 7 days this week${posted >= 6 ? " — elite consistency." : "."}`);
  if (missedDows.length === 1) observations.push(`${missedDows[0]} was your only miss. One planned backup slot fixes it.`);
  else if (missedDows.length > 1) observations.push(`${missedDows.slice(0, 2).join(" and ")} are your weakest days lately.`);
  if (avgHour !== null) observations.push(`You usually complete your goal around ${avgHour}:00 — ${avgHour < 12 ? "morning momentum suits you" : avgHour < 18 ? "afternoons are your zone" : "you're a night finisher"}.`);
  if (delta !== 0) observations.push(`Your consistency ${delta > 0 ? "improved" : "dropped"} ${Math.abs(delta)}% vs last week.`);
  if (totalLikes > 0) observations.push(`Your posts earned ${totalLikes} likes this week — community's watching.`);

  const suggestion =
    posted >= 6
      ? `Protect the streak: schedule your ${missedDows[0] || "toughest"} session the night before, and don't break the chain — you're ${Math.max(0, 30 - s.current)} days from the 💎 30-day badge.`
      : posted >= 4
        ? `Anchor your goal to an existing habit (right after ${avgHour !== null && avgHour < 12 ? "breakfast" : "dinner"}). Aim for 6/7 next week — one more day than this week.`
        : `Shrink the goal until it's un-skippable: commit to just 10 minutes on your hardest days. Consistency first, intensity later.`;

  return {
    headline: posted >= 6 ? "Outstanding week 🔥" : posted >= 4 ? "Solid week — one tweak away from great" : "Let's rebuild momentum",
    stats: [
      { label: "Days posted", value: `${posted}/7` },
      { label: "Current streak", value: `${s.current} days` },
      { label: "vs last week", value: `${delta >= 0 ? "+" : ""}${delta}%` },
      { label: "Likes earned", value: String(totalLikes) },
    ],
    observations,
    suggestion,
  };
}

export async function getWeeklyCoach(user: User): Promise<{ insight: InsightPayload; source: string }> {
  const db = getDb();
  const wk = mondayOf(new Date());
  const cached = (await db
    .prepare("SELECT content, source FROM ai_insights WHERE scope='user' AND user_id=? AND week_start=?")
    .get(user.id, wk)) as { content: string; source: string } | undefined;
  if (cached) return { insight: JSON.parse(cached.content), source: cached.source };

  const engine = await engineWeeklyCoach(user);
  let insight = engine;
  let source = "engine";

  const { days, prevWeekPosts } = await buildUserWeekStats(user.id);
  const raw = await callOpenAI(
    `You are a supportive but direct accountability coach for a goal-tracking app. Reply with JSON: {"headline": string, "observations": string[3-4 short sentences], "suggestion": string (one actionable tip)}. Be specific, use the data, no fluff.`,
    JSON.stringify({ goal: user.goal, category: user.goal_category, thisWeek: days, prevWeekPosts })
  );
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      insight = {
        headline: parsed.headline || engine.headline,
        stats: engine.stats,
        observations: Array.isArray(parsed.observations) ? parsed.observations : engine.observations,
        suggestion: parsed.suggestion || engine.suggestion,
      };
      source = "openai";
    } catch {}
  }

  await db.prepare("INSERT INTO ai_insights (scope, user_id, week_start, content, source) VALUES ('user', ?, ?, ?, ?)").run(
    user.id, wk, JSON.stringify(insight), source
  );
  return { insight, source };
}

// ---------- 2. AI Accountability Partner ----------

export async function getPartnerRecommendations(user: User): Promise<{ user: User; reason: string; match: number }[]> {
  const db = getDb();
  const others = (await db.prepare("SELECT * FROM users WHERE id != ?").all(user.id)) as User[];
  const mine = await computeStreaks(user.id);
  const followedRows = (await db.prepare("SELECT following_id f FROM follows WHERE follower_id = ?").all(user.id)) as { f: number }[];
  const followed = new Set(followedRows.map((r) => r.f));

  const scored = await Promise.all(
    others
      .filter((o) => !followed.has(o.id))
      .map(async (o) => {
        const s = await computeStreaks(o.id);
        let match = 50;
        const reasons: string[] = [];
        if (o.goal_category && user.goal_category && o.goal_category.toLowerCase() === user.goal_category.toLowerCase()) {
          match += 30;
          reasons.push(`also grinding on ${o.goal_category.toLowerCase()}`);
        }
        const consistencyGap = Math.abs(s.consistency30 - mine.consistency30);
        if (consistencyGap <= 15) {
          match += 15;
          reasons.push("matches your consistency level");
        } else if (s.consistency30 > mine.consistency30) {
          match += 8;
          reasons.push(`${s.consistency30}% consistent — will pull you up`);
        }
        if (Math.abs(s.current - mine.current) <= 5) {
          match += 5;
          reasons.push(`${s.current}-day streak, right beside yours`);
        }
        return { user: o, match: Math.min(match, 98), reason: reasons.slice(0, 2).join(" · ") || "active daily poster" };
      })
  );
  return scored.sort((a, b) => b.match - a.match).slice(0, 4);
}

// ---------- 3. AI Community Insights + 5. Challenge generator ----------

export async function engineCommunityInsight(communityId: number): Promise<InsightPayload> {
  const db = getDb();
  const thisWeekRow = (await db.prepare("SELECT COUNT(*) c FROM posts WHERE community_id = ? AND post_date >= ?").get(communityId, daysAgo(6))) as { c: number } | undefined;
  const thisWeek = thisWeekRow ? thisWeekRow.c : 0;

  const lastWeekRow = (await db.prepare("SELECT COUNT(*) c FROM posts WHERE community_id = ? AND post_date >= ? AND post_date < ?").get(communityId, daysAgo(13), daysAgo(6))) as { c: number } | undefined;
  const lastWeek = lastWeekRow ? lastWeekRow.c : 0;

  const membersRow = (await db.prepare("SELECT COUNT(*) c FROM memberships WHERE community_id = ? AND status='active'").get(communityId)) as { c: number } | undefined;
  const members = membersRow ? membersRow.c : 0;

  const weekendPostsRow = (await db.prepare(
    `SELECT COUNT(*) c FROM posts WHERE community_id = ? AND post_date >= ?
     AND CAST(strftime('%w', post_date) AS INTEGER) IN (0, 6)`
  ).get(communityId, daysAgo(13))) as { c: number } | undefined;
  const weekendPosts = weekendPostsRow ? weekendPostsRow.c : 0;

  const weekdayPostsRow = (await db.prepare(
    `SELECT COUNT(*) c FROM posts WHERE community_id = ? AND post_date >= ?
     AND CAST(strftime('%w', post_date) AS INTEGER) NOT IN (0, 6)`
  ).get(communityId, daysAgo(13))) as { c: number } | undefined;
  const weekdayPosts = weekdayPostsRow ? weekdayPostsRow.c : 0;

  const eveningShareRow = (await db.prepare(
    `SELECT COUNT(*) c FROM posts WHERE community_id = ? AND post_date >= ? AND CAST(substr(created_at, 12, 2) AS INTEGER) < 20`
  ).get(communityId, daysAgo(13))) as { c: number } | undefined;
  const eveningShare = eveningShareRow ? eveningShareRow.c : 0;

  const total2w = weekendPosts + weekdayPosts;
  const delta = lastWeek > 0 ? Math.round(((thisWeek - lastWeek) / lastWeek) * 100) : 0;
  const weekendRate = total2w ? Math.round((weekendPosts / total2w) * 100) : 0;
  const before8pm = total2w ? Math.round((eveningShare / total2w) * 100) : 0;

  const observations = [
    `Engagement ${delta >= 0 ? "increased" : "dropped"} ${Math.abs(delta)}% vs last week (${thisWeek} proofs posted).`,
    weekendRate < 25
      ? `Weekend participation is the weak spot — only ${weekendRate}% of posts land on Sat/Sun.`
      : `Weekend energy is strong: ${weekendRate}% of posts land on Sat/Sun.`,
    `${before8pm}% of members complete their goals before 8 PM.`,
    `${members} active members this week.`,
  ];

  return {
    headline: delta >= 10 ? "Community on the rise 📈" : delta <= -10 ? "Momentum dip — time to rally" : "Steady week for the community",
    stats: [
      { label: "Posts this week", value: String(thisWeek) },
      { label: "vs last week", value: `${delta >= 0 ? "+" : ""}${delta}%` },
      { label: "Weekend share", value: `${weekendRate}%` },
      { label: "Done before 8 PM", value: `${before8pm}%` },
    ],
    observations,
    suggestion:
      weekendRate < 25
        ? 'Launch a "No Skip Saturday" challenge — weekend posts count double on the leaderboard this week.'
        : "Ride the momentum: pin a weekly challenge and celebrate the top 3 streaks in the feed.",
  };
}

export async function getCommunityInsight(communityId: number): Promise<{ insight: InsightPayload; source: string }> {
  const db = getDb();
  const wk = mondayOf(new Date());
  const cached = (await db
    .prepare("SELECT content, source FROM ai_insights WHERE scope='community' AND community_id=? AND week_start=?")
    .get(communityId, wk)) as { content: string; source: string } | undefined;
  if (cached) return { insight: JSON.parse(cached.content), source: cached.source };

  const insight = await engineCommunityInsight(communityId);
  await db.prepare("INSERT INTO ai_insights (scope, community_id, week_start, content, source) VALUES ('community', ?, ?, ?, 'engine')").run(
    communityId, wk, JSON.stringify(insight)
  );
  return { insight, source: "engine" };
}

const CHALLENGE_TEMPLATES: Record<string, [string, string][]> = {
  Coding: [
    ["No Zero Days Week", "Commit at least one line of code every day this week."],
    ["Bug Bounty Week", "Fix one bug a day — yours or open source."],
  ],
  Fitness: [
    ["No Skip Saturday", "Weekends kill streaks. This Saturday, everybody moves."],
    ["20 km Challenge", "Log 20 km of running/walking as a community this week."],
  ],
  Reading: [
    ["100 Pages Week", "Read 100 pages between Monday and Sunday."],
    ["One Takeaway Daily", "Post one insight from your reading each day."],
  ],
  Meditation: [
    ["Sunrise Sessions", "Complete your practice before 8 AM at least 4 days."],
    ["Streak Shield Week", "Nobody in the community breaks their streak this week."],
  ],
  Business: [
    ["Ship & Tell", "Ship one user-facing improvement and post a before/after."],
    ["Customer Voice Week", "Talk to one customer daily and share one insight."],
  ],
};

export async function generateChallenge(communityId: number): Promise<{ title: string; description: string }> {
  const db = getDb();
  const community = (await db.prepare("SELECT category FROM communities WHERE id = ?").get(communityId)) as { category: string } | undefined;
  const pool = CHALLENGE_TEMPLATES[community?.category || ""] || CHALLENGE_TEMPLATES.Fitness;
  const idx = (communityId + Math.floor(Date.now() / (7 * 864e5))) % pool.length;
  return { title: pool[idx][0], description: pool[idx][1] };
}

export async function getCurrentChallenge(communityId: number) {
  const db = getDb();
  const wk = mondayOf(new Date());
  let ch = (await db.prepare("SELECT * FROM challenges WHERE community_id = ? AND week_start = ?").get(communityId, wk)) as
    | { id: number; title: string; description: string; week_start: string }
    | undefined;
  if (!ch) {
    const gen = await generateChallenge(communityId);
    await db.prepare("INSERT OR IGNORE INTO challenges (community_id, title, description, week_start) VALUES (?,?,?,?)").run(
      communityId, gen.title, gen.description, wk
    );
    ch = (await db.prepare("SELECT * FROM challenges WHERE community_id = ? AND week_start = ?").get(communityId, wk)) as typeof ch;
  }
  return ch;
}

// ---------- 4. AI Moderation ----------

const TOXIC_PATTERNS: [RegExp, string][] = [
  [/\b(idiot|stupid|dumb|loser|pathetic|worthless|ugly|fat)\b/i, "insulting language"],
  [/\b(hate you|kill your|shut up)\b/i, "hostile language"],
  [/\b(buy now|limited offer|click here|discount code|promo code|dm me to earn|earn \$|crypto pump|guaranteed returns)\b/i, "promotional spam"],
  [/(https?:\/\/\S+){3,}/i, "link spam"],
  [/(.)\1{9,}/, "character spam"],
];

export function moderateText(text: string): { flagged: boolean; reason: string } {
  for (const [pattern, reason] of TOXIC_PATTERNS) {
    if (pattern.test(text)) return { flagged: true, reason };
  }
  return { flagged: false, reason: "" };
}

export async function moderateWithAI(text: string): Promise<{ flagged: boolean; reason: string }> {
  const local = moderateText(text);
  if (local.flagged) return local;
  const key = process.env.OPENAI_API_KEY;
  if (!key) return local;
  try {
    const base = process.env.OPENAI_BASE_URL || "https://api.openai.com/v1";
    const res = await fetch(`${base}/moderations`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({ input: text }),
      signal: AbortSignal.timeout(6000),
    });
    if (!res.ok) return local;
    const data = await res.json();
    const r = data.results?.[0];
    if (r?.flagged) {
      const cats = Object.entries(r.categories || {}).filter(([, v]) => v).map(([k]) => k);
      return { flagged: true, reason: cats.join(", ") || "policy violation" };
    }
  } catch {}
  return local;
}
