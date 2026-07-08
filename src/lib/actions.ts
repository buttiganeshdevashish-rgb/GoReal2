"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import fs from "fs";
import path from "path";
import { getDb, todayStr } from "./db";
import { getCurrentUser, setSessionCookie, clearSessionCookie, hashPassword, verifyPassword } from "./auth";
import { moderateWithAI, moderateText } from "./ai";
import type { User } from "./types";

// ---------- Auth ----------

export async function signupAction(_prev: any, formData: FormData): Promise<{ error?: string }> {
  const name = String(formData.get("name") || "").trim();
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const password = String(formData.get("password") || "");
  const goal = String(formData.get("goal") || "").trim();
  const category = String(formData.get("category") || "Custom");

  if (!name || !email || !password) return { error: "Please fill in all required fields." };
  if (password.length < 8) return { error: "Password must be at least 8 characters." };
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { error: "Please enter a valid email." };

  try {
    const db = getDb();
    if (await db.prepare("SELECT id FROM users WHERE email = ?").get(email)) return { error: "An account with this email already exists." };

    let username = email.split("@")[0].replace(/[^a-z0-9_.]/gi, "").toLowerCase() || "user";
    let suffix = 0;
    while (await db.prepare("SELECT id FROM users WHERE username = ?").get(suffix ? `${username}${suffix}` : username)) suffix++;
    if (suffix) username = `${username}${suffix}`;

    const hue = Math.floor(Math.random() * 360);
    const info = await db
      .prepare("INSERT INTO users (email, password_hash, name, username, avatar_hue, goal, goal_category, bio) VALUES (?,?,?,?,?,?,?,?)")
      .run(email, hashPassword(password), name, username, hue, goal || "Show up every day", category, "");
    setSessionCookie(Number(info.lastInsertRowid));
  } catch (err: any) {
    console.error("Signup exception caught in server action:", err);
    return { error: err.message || "An unexpected error occurred during signup." };
  }

  redirect("/home");
}

export async function loginAction(_prev: any, formData: FormData): Promise<{ error?: string }> {
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const password = String(formData.get("password") || "");
  
  try {
    const db = getDb();
    const user = (await db.prepare("SELECT * FROM users WHERE email = ?").get(email)) as User | undefined;
    if (!user || !verifyPassword(password, user.password_hash)) return { error: "Invalid email or password." };
    setSessionCookie(user.id);
  } catch (err: any) {
    console.error("Login exception caught in server action:", err);
    return { error: err.message || "An unexpected error occurred during sign-in." };
  }

  redirect("/home");
}

export async function demoLoginAction() {
  const db = getDb();
  const user = (await db.prepare("SELECT * FROM users WHERE email = 'demo@goalreal.app'").get()) as User;
  setSessionCookie(user.id);
  return { success: true };
}

export async function logoutAction() {
  clearSessionCookie();
  redirect("/login?logout=true");
}

// ---------- Posts ----------

export async function createPostAction(_prev: any, formData: FormData): Promise<{ error?: string }> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const caption = String(formData.get("caption") || "").trim();
  const progress = String(formData.get("progress") || "").trim();
  const communityId = Number(formData.get("community_id") || 0) || null;
  const image = formData.get("image") as File | null;

  if (!caption) return { error: "Add a caption — what did you do today?" };
  const db = getDb();
  const today = todayStr();
  const existing = await db.prepare("SELECT id FROM posts WHERE user_id = ? AND post_date = ?").get(user.id, today);
  if (existing) return { error: "You've already posted your proof today. One real post per day — that's the deal. 🔒" };

  const mod = await moderateWithAI(caption + " " + progress);

  let imageUrl = "";
  if (image && typeof image === "object" && image.size > 0) {
    if (image.size > 8 * 1024 * 1024) return { error: "Image must be under 8 MB." };
    const ext = (image.type.split("/")[1] || "jpg").replace(/[^a-z0-9]/gi, "");
    if (!["jpg", "jpeg", "png", "webp", "gif", "avif"].includes(ext.toLowerCase())) return { error: "Please upload an image file." };
    try {
      const dir = path.join(process.cwd(), "public", "uploads");
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      const filename = `${user.id}-${Date.now()}.${ext}`;
      fs.writeFileSync(path.join(dir, filename), Buffer.from(await image.arrayBuffer()));
      imageUrl = `/uploads/${filename}`;
    } catch (e) {
      imageUrl = `/seed/${user.goal_category.toLowerCase()}-${1 + (user.id % 3)}.svg`;
    }
  } else {
    imageUrl = `/seed/${user.goal_category.toLowerCase()}-${1 + (user.id % 3)}.svg`;
  }

  const info = await db
    .prepare("INSERT INTO posts (user_id, community_id, image_url, caption, progress_note, post_date, flagged, flag_reason) VALUES (?,?,?,?,?,?,?,?)")
    .run(user.id, communityId, imageUrl, caption, progress, today, mod.flagged ? 1 : 0, mod.reason);

  // Milestone notifications to followers
  const { computeStreaks } = await import("./stats");
  const s = await computeStreaks(user.id);
  if ([7, 14, 30, 50, 100].includes(s.current)) {
    const followers = (await db.prepare("SELECT follower_id f FROM follows WHERE following_id = ?").all(user.id)) as { f: number }[];
    const notif = db.prepare("INSERT INTO notifications (user_id, actor_id, type, post_id, body) VALUES (?,?,?,?,?)");
    for (const { f } of followers) {
      await notif.run(f, user.id, "milestone", Number(info.lastInsertRowid), `${user.name} just hit a ${s.current}-day streak! 🎉`);
    }
  }

  revalidatePath("/home");
  redirect("/home?posted=1");
}

export async function toggleLikeAction(postId: number) {
  const user = await getCurrentUser();
  if (!user) return;
  const db = getDb();
  const existing = await db.prepare("SELECT id FROM likes WHERE post_id = ? AND user_id = ?").get(postId, user.id);
  if (existing) {
    await db.prepare("DELETE FROM likes WHERE post_id = ? AND user_id = ?").run(postId, user.id);
  } else {
    await db.prepare("INSERT INTO likes (post_id, user_id) VALUES (?,?)").run(postId, user.id);
    const post = (await db.prepare("SELECT user_id FROM posts WHERE id = ?").get(postId)) as { user_id: number } | undefined;
    if (post && post.user_id !== user.id) {
      await db.prepare("INSERT INTO notifications (user_id, actor_id, type, post_id, body) VALUES (?,?,?,?,?)").run(
        post.user_id, user.id, "like", postId, `${user.name} liked your post`
      );
    }
  }
  revalidatePath("/home");
}

export async function addCommentAction(postId: number, body: string): Promise<{ error?: string; hidden?: boolean }> {
  const user = await getCurrentUser();
  if (!user) return { error: "Not signed in" };
  const text = body.trim();
  if (!text) return { error: "Comment cannot be empty" };
  if (text.length > 500) return { error: "Comment too long" };

  const mod = moderateText(text);
  const db = getDb();
  await db.prepare("INSERT INTO comments (post_id, user_id, body, flagged, flag_reason) VALUES (?,?,?,?,?)").run(
    postId, user.id, text, mod.flagged ? 1 : 0, mod.reason
  );
  if (!mod.flagged) {
    const post = (await db.prepare("SELECT user_id FROM posts WHERE id = ?").get(postId)) as { user_id: number } | undefined;
    if (post && post.user_id !== user.id) {
      await db.prepare("INSERT INTO notifications (user_id, actor_id, type, post_id, body) VALUES (?,?,?,?,?)").run(
        post.user_id, user.id, "comment", postId, `${user.name} commented: "${text.slice(0, 80)}"`
      );
    }
  }
  revalidatePath("/home");
  return mod.flagged ? { hidden: true } : {};
}

// ---------- Communities ----------

export async function joinCommunityAction(communityId: number) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const db = getDb();
  const community = (await db.prepare("SELECT * FROM communities WHERE id = ?").get(communityId)) as { is_private: number; name: string } | undefined;
  if (!community) return;
  const status = community.is_private ? "pending" : "active";
  await db.prepare("INSERT OR IGNORE INTO memberships (user_id, community_id, status) VALUES (?,?,?)").run(user.id, communityId, status);
  revalidatePath("/communities");
  revalidatePath(`/communities/${communityId}`);
}

export async function leaveCommunityAction(communityId: number) {
  const user = await getCurrentUser();
  if (!user) return;
  const db = getDb();
  await db.prepare("DELETE FROM memberships WHERE user_id = ? AND community_id = ?").run(user.id, communityId);
  revalidatePath("/communities");
  revalidatePath(`/communities/${communityId}`);
}

export async function createCommunityAction(_prev: any, formData: FormData): Promise<{ error?: string }> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const name = String(formData.get("name") || "").trim();
  const description = String(formData.get("description") || "").trim();
  const category = String(formData.get("category") || "Custom");
  const isPrivate = formData.get("is_private") === "on" ? 1 : 0;
  if (!name) return { error: "Give your community a name." };

  const db = getDb();
  let slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "community";
  let suffix = 0;
  while (await db.prepare("SELECT id FROM communities WHERE slug = ?").get(suffix ? `${slug}-${suffix}` : slug)) suffix++;
  if (suffix) slug = `${slug}-${suffix}`;

  const hue = Math.floor(Math.random() * 360);
  const info = await db
    .prepare("INSERT INTO communities (name, slug, description, category, banner_hue, is_private, created_by) VALUES (?,?,?,?,?,?,?)")
    .run(name, slug, description, category, hue, isPrivate, user.id);
  await db.prepare("INSERT INTO memberships (user_id, community_id, role, status) VALUES (?,?,'admin','active')").run(
    user.id, Number(info.lastInsertRowid)
  );
  redirect(`/communities/${slug}`);
}

// ---------- Social ----------

export async function toggleFollowAction(targetId: number) {
  const user = await getCurrentUser();
  if (!user || user.id === targetId) return;
  const db = getDb();
  const existing = await db.prepare("SELECT 1 FROM follows WHERE follower_id = ? AND following_id = ?").get(user.id, targetId);
  if (existing) {
    await db.prepare("DELETE FROM follows WHERE follower_id = ? AND following_id = ?").run(user.id, targetId);
  } else {
    await db.prepare("INSERT INTO follows (follower_id, following_id) VALUES (?,?)").run(user.id, targetId);
  }
  revalidatePath("/coach");
}

export async function markAllReadAction() {
  const user = await getCurrentUser();
  if (!user) return;
  await getDb().prepare("UPDATE notifications SET read = 1 WHERE user_id = ?").run(user.id);
  revalidatePath("/notifications");
}
