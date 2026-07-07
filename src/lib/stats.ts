import { getDb, todayStr, daysAgo } from "./db";
import type { Streaks, HeatmapDay, LeaderboardRow, User } from "./types";

export function getUserDates(userId: number): string[] {
  const db = getDb();
  return (db.prepare("SELECT post_date FROM posts WHERE user_id = ? ORDER BY post_date DESC").all(userId) as { post_date: string }[]).map((r) => r.post_date);
}

export function computeStreaks(userId: number): Streaks {
  const dates = getUserDates(userId);
  const set = new Set(dates);
  const today = todayStr();

  // Current streak: count back from today (or yesterday, if not posted yet today)
  const current = countBack(set, set.has(today) ? 0 : 1);

  // Longest streak
  let longest = 0;
  const sorted = [...set].sort();
  let run = 0;
  let prev: string | null = null;
  for (const d of sorted) {
    if (prev && nextDay(prev) === d) run++;
    else run = 1;
    if (run > longest) longest = run;
    prev = d;
  }

  let activeDays30 = 0;
  for (let i = 0; i < 30; i++) if (set.has(daysAgo(i))) activeDays30++;

  return {
    current,
    longest,
    totalPosts: dates.length,
    activeDays30,
    consistency30: Math.round((activeDays30 / 30) * 100),
  };
}

function countBack(set: Set<string>, startOffset: number): number {
  let c = 0;
  while (set.has(daysAgo(startOffset + c))) c++;
  return c;
}

function nextDay(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00");
  d.setDate(d.getDate() + 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function getHeatmap(userId: number, days = 119): HeatmapDay[] {
  const db = getDb();
  const rows = db
    .prepare("SELECT post_date AS date, COUNT(*) AS count FROM posts WHERE user_id = ? AND post_date >= ? GROUP BY post_date")
    .all(userId, daysAgo(days)) as HeatmapDay[];
  const map = new Map(rows.map((r) => [r.date, r.count]));
  const out: HeatmapDay[] = [];
  for (let i = days; i >= 0; i--) {
    const date = daysAgo(i);
    out.push({ date, count: map.get(date) || 0 });
  }
  return out;
}

export function getCommunityLeaderboard(communityId: number): LeaderboardRow[] {
  const db = getDb();
  const members = db
    .prepare(
      `SELECT u.* FROM users u JOIN memberships m ON m.user_id = u.id
       WHERE m.community_id = ? AND m.status = 'active'`
    )
    .all(communityId) as User[];
  const rows = members.map((user) => {
    const s = computeStreaks(user.id);
    return {
      user,
      currentStreak: s.current,
      consistency: s.consistency30,
      totalPosts: s.totalPosts,
      score: s.current * 3 + s.consistency30 + Math.min(s.totalPosts, 60),
    };
  });
  return rows.sort((a, b) => b.score - a.score);
}

export function getWeeklyActivity(userId: number): { day: string; posts: number; likes: number }[] {
  const db = getDb();
  const out: { day: string; posts: number; likes: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const date = daysAgo(i);
    const d = new Date(date + "T12:00:00");
    const posts = (db.prepare("SELECT COUNT(*) c FROM posts WHERE user_id = ? AND post_date = ?").get(userId, date) as { c: number }).c;
    const likes = (
      db.prepare("SELECT COUNT(*) c FROM likes l JOIN posts p ON p.id = l.post_id WHERE p.user_id = ? AND l.created_at LIKE ?").get(userId, date + "%") as { c: number }
    ).c;
    out.push({ day: d.toLocaleDateString("en-US", { weekday: "short" }), posts, likes });
  }
  return out;
}

export function getMonthlyTrend(userId: number): { week: string; posts: number; consistency: number }[] {
  const db = getDb();
  const out: { week: string; posts: number; consistency: number }[] = [];
  for (let w = 7; w >= 0; w--) {
    const start = daysAgo(w * 7 + 6);
    const end = daysAgo(w * 7);
    const posts = (
      db.prepare("SELECT COUNT(*) c FROM posts WHERE user_id = ? AND post_date >= ? AND post_date <= ?").get(userId, start, end) as { c: number }
    ).c;
    out.push({ week: end.slice(5), posts, consistency: Math.round((posts / 7) * 100) });
  }
  return out;
}

export function getBadges(userId: number): { emoji: string; label: string; earned: boolean }[] {
  const s = computeStreaks(userId);
  return [
    { emoji: "🌱", label: "First Post", earned: s.totalPosts >= 1 },
    { emoji: "🔥", label: "7-Day Streak", earned: s.longest >= 7 },
    { emoji: "⚡", label: "14-Day Streak", earned: s.longest >= 14 },
    { emoji: "💎", label: "30-Day Streak", earned: s.longest >= 30 },
    { emoji: "📈", label: "80% Consistent", earned: s.consistency30 >= 80 },
    { emoji: "💯", label: "50 Posts", earned: s.totalPosts >= 50 },
    { emoji: "🏆", label: "Century Club", earned: s.totalPosts >= 100 },
  ];
}
