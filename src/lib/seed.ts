import type Database from "better-sqlite3";
import { scryptSync, randomBytes } from "crypto";
import { dateStr, mondayOf } from "./db";

// Deterministic RNG so every fresh install looks identical
function rng(seedNum: number) {
  let s = seedNum;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

const USERS = [
  ["Ganesh Butti", "ganesh", "demo@goalreal.app", "Shipping something every single day.", "Code 2 hours daily", "Coding", 262],
  ["Aarav Mehta", "aarav.codes", "aarav@goalreal.app", "DSA grind, one problem at a time.", "Solve 3 LeetCode problems daily", "Coding", 210],
  ["Priya Sharma", "priya.reads", "priya@goalreal.app", "Book a week, mind on fire.", "Read 30 pages daily", "Reading", 330],
  ["Rohan Iyer", "rohan.lifts", "rohan@goalreal.app", "Progressive overload, every day.", "Gym 6 days a week", "Fitness", 20],
  ["Sneha Reddy", "sneha.runs", "sneha@goalreal.app", "Training for my first half marathon.", "Run 5km daily", "Fitness", 150],
  ["Vikram Nair", "vikram.upsc", "vikram@goalreal.app", "UPSC 2027. No excuses.", "Study 8 hours daily", "Learning", 240],
  ["Ananya Das", "ananya.zen", "ananya@goalreal.app", "Finding stillness in the chaos.", "Meditate 20 minutes daily", "Meditation", 280],
  ["Karthik Rao", "karthik.builds", "karthik@goalreal.app", "Building my SaaS in public.", "Ship one feature daily", "Business", 195],
  ["Ishita Gupta", "ishita.strings", "ishita@goalreal.app", "Guitar covers, someday originals.", "Practice guitar 45 min daily", "Music", 310],
  ["Arjun Pillai", "arjun.yoga", "arjun@goalreal.app", "Flexibility is a superpower.", "Yoga every morning", "Health", 100],
  ["Meera Joshi", "meera.writes", "meera@goalreal.app", "Writing my way to clarity.", "Journal 500 words daily", "Learning", 45],
  ["Aditya Verma", "aditya.chess", "aditya.v@goalreal.app", "1800 ELO or bust.", "10 chess puzzles daily", "Sports", 220],
  ["Kavya Krishnan", "kavya.paints", "kavya@goalreal.app", "One sketch a day keeps the block away.", "Sketch daily", "Custom", 350],
  ["Dev Patel", "dev.swims", "dev@goalreal.app", "Swim, eat, sleep, repeat.", "Swim 1km daily", "Sports", 180],
  ["Nisha Menon", "nisha.eats", "nisha@goalreal.app", "Healthy eating, one plate at a time.", "Cook a healthy meal daily", "Health", 60],
  ["Rahul Bose", "rahul.walks", "rahul@goalreal.app", "10k steps before 10am.", "Walk 10,000 steps daily", "Fitness", 130],
  ["Tanvi Kulkarni", "tanvi.langs", "tanvi@goalreal.app", "Learning Japanese, slowly but surely.", "30 min Japanese daily", "Learning", 300],
  ["Siddharth Roy", "sid.reads", "sid@goalreal.app", "Non-fiction only. Fight me.", "Read 20 pages daily", "Reading", 25],
  ["Pooja Hegde", "pooja.medits", "pooja@goalreal.app", "Calm mind, sharp focus.", "Meditate morning & night", "Meditation", 270],
  ["Amit Saxena", "amit.miles", "amit@goalreal.app", "Marathon #3 in training.", "Run 8km daily", "Fitness", 10],
] as const;

const COMMUNITIES = [
  ["100 Days of Code", "100-days-of-code", "Daily coding accountability. Ship code, post proof, no zero days. From LeetCode grinds to side projects — if you wrote code today, you belong here.", "Coding", 250, 0, 1],
  ["Morning Movers", "morning-movers", "Gym, runs, yoga, walks — move your body before the world wakes up. Post your sweaty proof every day.", "Fitness", 15, 0, 4],
  ["Bookworms Anonymous", "bookworms", "A chapter a day. Post the page you're on, share one takeaway, and keep each other reading.", "Reading", 330, 0, 3],
  ["Deep Focus Club", "deep-focus", "Meditation, journaling, and deep work. Quiet consistency, loud results.", "Meditation", 280, 0, 7],
  ["Founders Daily", "founders-daily", "Build in public. One shipped thing a day — a feature, a call, a landing page. Private circle for serious builders.", "Business", 200, 1, 8],
] as const;

// community index -> member user indices (0-based)
const MEMBERSHIP_MAP: Record<number, number[]> = {
  0: [0, 1, 7, 10, 16, 12, 5],
  1: [3, 4, 9, 13, 15, 19, 14, 0],
  2: [2, 17, 10, 16, 6],
  3: [6, 18, 9, 2, 5, 12],
  4: [7, 0, 1, 13, 11],
};

const CAPTIONS: Record<string, string[]> = {
  Coding: [
    "Solved 3 LeetCode problems — two mediums, one hard. The hard one took 40 minutes but I got it without hints.",
    "Shipped the auth flow for my side project. Cookies, sessions, the whole thing.",
    "2 hours of deep work on the API layer. Refactored 400 lines down to 150.",
    "Day {n} of the grind. Dynamic programming finally clicking.",
    "Built a small CLI tool tonight. Rust is starting to feel natural.",
    "Code review + 2 features merged. Momentum is real.",
    "Debugged a race condition for an hour. Painful but satisfying.",
    "Finished the graph algorithms module. On to system design.",
  ],
  Reading: [
    "Finished Chapter 8 of Atomic Habits. The 2-minute rule is genius.",
    "35 pages of Deep Work done before breakfast.",
    "Halfway through Sapiens. Mind-bending stuff about shared myths.",
    "Finished my book of the week! Starting Thinking Fast and Slow tomorrow.",
    "30 pages + notes in the margins. Slow reading is underrated.",
    "Library session. Two chapters of Zero to One.",
    "Read on the commute — 25 pages. Small windows count.",
  ],
  Fitness: [
    "Ran 5 km in 28:40. Shaved 30 seconds off my pace!",
    "Leg day done. Squats felt heavy but form was clean.",
    "Morning run by the lake. 6.2 km, cool breeze, perfect.",
    "Push day — new PR on bench: 80 kg for 3.",
    "10,500 steps before 10am. Streak intact.",
    "Interval training: 8x400m. Lungs on fire, heart happy.",
    "Recovery run + stretching. Listening to my body today.",
    "Gym at 6am. Nobody there. Best hour of the day.",
  ],
  Meditation: [
    "20 minutes of breath work before sunrise. Mind like water today.",
    "Meditated through the restlessness. Showing up matters more than feeling zen.",
    "Morning sit + evening body scan. Double session day.",
    "10 minutes felt like 2 today. Deep session.",
    "Meditated on the balcony. Birdsong as background music.",
    "Day {n}. The mind wanders less each week.",
  ],
  Learning: [
    "3 hours of polity + 2 hours of geography. Mocks this weekend.",
    "Finished the modern history module. Notes condensed to 4 pages.",
    "30 minutes of Japanese — 20 new kanji down.",
    "Journaled 600 words on this week's lessons. Clarity achieved.",
    "Answer writing practice: 3 essays, timed. Improving.",
    "Current affairs + editorial analysis done before 8am.",
  ],
  Health: [
    "Meal-prepped 4 healthy lunches. Future me says thanks.",
    "Morning yoga — 40 minutes of flow. Hips finally opening up.",
    "Cooked a rainbow bowl. Zero processed food today.",
    "Sun salutations at sunrise. Cliché but incredible.",
    "Green smoothie + 8 glasses of water. Basics done right.",
  ],
  Business: [
    "Shipped the pricing page. Conversion experiment live.",
    "3 customer calls today. Found our next feature in call #2.",
    "Landing page rewrite done. A/B test starts tomorrow.",
    "Closed our first annual plan! Champagne (sparkling water).",
    "Wrote the investor update. Growth: +18% MoM.",
    "Built the onboarding email sequence. 5 emails, all scheduled.",
  ],
  Music: [
    "45 minutes of barre chord practice. F major finally rings clean.",
    "Learned the intro riff to my favorite song. Fingers hurt, worth it.",
    "Scales + a full run-through of two songs. Recording soon.",
    "Practiced fingerpicking patterns for an hour. Muscle memory building.",
  ],
  Sports: [
    "10 chess puzzles + one rapid game. Rating up 12 points.",
    "Swam 1.2 km — 48 laps. Shoulders are jelly.",
    "Won 2 of 3 blitz games. The endgame study is paying off.",
    "1km swim in 24 minutes. New personal best.",
  ],
  Custom: [
    "Daily sketch done — tried two-point perspective today.",
    "Sketched the street outside my window. 40 minutes flew by.",
    "Portrait practice. Eyes are still hard. Day {n}.",
    "Inktober-style sketch with just a ballpoint pen.",
  ],
};

const COMMENTS_POOL = [
  "Beast mode! 🔥", "This consistency is inspiring!", "Let's gooo!", "Keep it up, you're on fire!",
  "Respect the grind 💪", "Day after day. That's how it's done.", "You're making the rest of us look bad 😄",
  "Needed this motivation today, thank you!", "Incredible streak!", "Proud of you!",
  "This is the way.", "Consistency > intensity. You get it.", "Insane dedication 🙌",
  "How do you stay so consistent?", "Saving this as motivation for tomorrow.",
  "Great pace!", "Clean form too, I bet.", "That's a serious streak building up!",
  "Small steps, big results.", "You showed up. That's everything.",
];

// Per-user posting probability — creates realistic variance in consistency
const CONSISTENCY = [0.93, 0.9, 0.86, 0.88, 0.82, 0.95, 0.8, 0.85, 0.7, 0.75, 0.78, 0.65, 0.72, 0.68, 0.74, 0.83, 0.7, 0.62, 0.77, 0.87];

export async function seed(db: any) {
  const rand = rng(42);
  const pick = <T,>(arr: readonly T[]) => arr[Math.floor(rand() * arr.length)];

  const insertUser = db.prepare(
    "INSERT INTO users (email, password_hash, name, username, avatar_hue, bio, goal, goal_category) VALUES (?,?,?,?,?,?,?,?)"
  );
  const pw = hashPassword("demo1234");
  for (const [name, username, email, bio, goal, cat, hue] of USERS) {
    await insertUser.run(email, pw, name, username, hue, bio, goal, cat);
  }

  const insertCommunity = db.prepare(
    "INSERT INTO communities (name, slug, description, category, banner_hue, is_private, created_by) VALUES (?,?,?,?,?,?,?)"
  );
  for (const [name, slug, desc, cat, hue, priv, creator] of COMMUNITIES) {
    await insertCommunity.run(name, slug, desc, cat, hue, priv, creator);
  }

  const insertMembership = db.prepare(
    "INSERT INTO memberships (user_id, community_id, role, status, joined_at) VALUES (?,?,?,?,datetime('now','-' || ? || ' days'))"
  );
  for (const [cIdx, members] of Object.entries(MEMBERSHIP_MAP)) {
    const communityId = Number(cIdx) + 1;
    let i = 0;
    for (const uIdx of members) {
      const role = i === 0 ? "admin" : "member";
      await insertMembership.run(uIdx + 1, communityId, role, "active", 60 - Math.floor(rand() * 20));
      i++;
    }
  }

  // Posts: last 60 days per user, weighted by consistency; nobody posts "today" for demo user
  const insertPost = db.prepare(
    "INSERT INTO posts (user_id, community_id, image_url, caption, progress_note, post_date, created_at) VALUES (?,?,?,?,?,?,?)"
  );
  const userCommunity: Record<number, number[]> = {};
  for (const [cIdx, members] of Object.entries(MEMBERSHIP_MAP)) {
    for (const uIdx of members) {
      (userCommunity[uIdx + 1] ||= []).push(Number(cIdx) + 1);
    }
  }

  const postIdsByUser: Record<number, number[]> = {};
  const allPostIds: { id: number; userId: number; date: string }[] = [];

  for (let u = 1; u <= USERS.length; u++) {
    const cat = USERS[u - 1][5] as string;
    const captions = CAPTIONS[cat] || CAPTIONS.Custom;
    const p = CONSISTENCY[u - 1];
    let capIdx = Math.floor(rand() * captions.length);
    for (let back = 60; back >= 0; back--) {
      // Demo user (u=1) skips today so the judge can post live
      if (back === 0 && u === 1) continue;
      // Weekend dip for realism
      const d = new Date();
      d.setDate(d.getDate() - back);
      const isWeekend = d.getDay() === 0 || d.getDay() === 6;
      const prob = isWeekend ? p * 0.8 : p;
      if (rand() > prob) continue;
      const date = dateStr(d);
      const caption = captions[capIdx % captions.length].replace("{n}", String(61 - back));
      capIdx++;
      const communities = userCommunity[u] || [];
      const communityId = communities.length ? communities[Math.floor(rand() * communities.length)] : null;
      const hour = 6 + Math.floor(rand() * 15);
      const createdAt = `${date} ${String(hour).padStart(2, "0")}:${String(Math.floor(rand() * 60)).padStart(2, "0")}:00`;
      const img = `/seed/${cat.toLowerCase()}-${(Math.floor(rand() * 3) + 1)}.svg`;
      const note = pick(["Felt great", "Tough day but done", "Best session this week", "Steady progress", "Pushed through", "Easy win today"]);
      const info = await insertPost.run(u, communityId, img, caption, note, date, createdAt);
      const pid = Number(info.lastInsertRowid);
      (postIdsByUser[u] ||= []).push(pid);
      allPostIds.push({ id: pid, userId: u, date });
    }
  }

  // Likes & comments — recent posts get more engagement
  const insertLike = db.prepare("INSERT OR IGNORE INTO likes (post_id, user_id, created_at) VALUES (?,?,?)");
  const insertComment = db.prepare("INSERT INTO comments (post_id, user_id, body, created_at) VALUES (?,?,?,?)");
  for (const post of allPostIds) {
    const ageBoost = post.date >= dateStr(new Date(Date.now() - 7 * 864e5)) ? 1.6 : 1;
    const likeCount = Math.floor(rand() * 8 * ageBoost) + 1;
    const likers = new Set<number>();
    for (let i = 0; i < likeCount; i++) {
      const liker = Math.floor(rand() * USERS.length) + 1;
      if (liker !== post.userId) likers.add(liker);
    }
    for (const liker of likers) {
      await insertLike.run(post.id, liker, `${post.date} ${String(10 + Math.floor(rand() * 12)).padStart(2, "0")}:00:00`);
    }
    if (rand() < 0.45 * ageBoost) {
      const n = 1 + Math.floor(rand() * 3);
      for (let i = 0; i < n; i++) {
        const commenter = Math.floor(rand() * USERS.length) + 1;
        if (commenter === post.userId) continue;
        await insertComment.run(post.id, commenter, pick(COMMENTS_POOL), `${post.date} ${String(11 + Math.floor(rand() * 10)).padStart(2, "0")}:30:00`);
      }
    }
  }

  // Follows
  const insertFollow = db.prepare("INSERT OR IGNORE INTO follows (follower_id, following_id) VALUES (?,?)");
  for (let u = 1; u <= USERS.length; u++) {
    const n = 3 + Math.floor(rand() * 6);
    for (let i = 0; i < n; i++) {
      const target = Math.floor(rand() * USERS.length) + 1;
      if (target !== u) {
        await insertFollow.run(u, target);
      }
    }
  }

  // Notifications for demo user
  const insertNotif = db.prepare(
    "INSERT INTO notifications (user_id, actor_id, type, post_id, body, read, created_at) VALUES (?,?,?,?,?,?,datetime('now','-' || ? || ' minutes'))"
  );
  const demoPosts = postIdsByUser[1] || [];
  const lastPost = demoPosts[demoPosts.length - 1];
  await insertNotif.run(1, 2, "like", lastPost, "Aarav Mehta liked your post", 0, 32);
  await insertNotif.run(1, 3, "comment", lastPost, 'Priya Sharma commented: "This consistency is inspiring!"', 0, 55);
  await insertNotif.run(1, 8, "like", lastPost, "Karthik Rao liked your post", 0, 140);
  await insertNotif.run(1, 6, "milestone", null, "Vikram Nair just hit a 30-day streak! 🎉", 0, 300);
  await insertNotif.run(1, null, "reminder", null, "You haven't posted today. Keep your streak alive! 🔥", 0, 10);
  await insertNotif.run(1, 4, "like", demoPosts[demoPosts.length - 2] ?? lastPost, "Rohan Iyer liked your post", 1, 60 * 26);
  await insertNotif.run(1, 11, "comment", demoPosts[demoPosts.length - 2] ?? lastPost, 'Meera Joshi commented: "Respect the grind 💪"', 1, 60 * 30);

  // Weekly challenges (current week) for each community
  const insertChallenge = db.prepare(
    "INSERT OR IGNORE INTO challenges (community_id, title, description, week_start) VALUES (?,?,?,?)"
  );
  const wk = mondayOf(new Date());
  const CHALLENGES = [
    [1, "No Zero Days Week", "Every member commits at least one line of code, every single day this week."],
    [2, "No Skip Saturday", "Weekends are where streaks die. This Saturday, everybody moves — post your proof."],
    [3, "100 Pages Week", "Read 100 pages between Monday and Sunday. Chapter screenshots count."],
    [4, "Sunrise Sessions", "Complete your practice before 8 AM at least 4 days this week."],
    [5, "Ship & Tell", "Ship one user-facing improvement and post a before/after."],
  ] as const;
  for (const [cid, title, desc] of CHALLENGES) {
    await insertChallenge.run(cid, title, desc, wk);
  }
}
