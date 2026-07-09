import { getDb, todayStr } from "./db";
import type { Post, CommentRow, Community, User } from "./types";

const POST_SELECT = `
  SELECT p.*, u.name, u.username, u.avatar_hue, u.goal_category,
    c.name AS community_name, c.slug AS community_slug,
    (SELECT COUNT(*) FROM likes l WHERE l.post_id = p.id) AS like_count,
    (SELECT COUNT(*) FROM comments cm WHERE cm.post_id = p.id AND cm.flagged = 0) AS comment_count,
    (SELECT COUNT(*) FROM likes l2 WHERE l2.post_id = p.id AND l2.user_id = @viewerId) AS liked_by_me
  FROM posts p
  JOIN users u ON u.id = p.user_id
  LEFT JOIN communities c ON c.id = p.community_id
  WHERE p.flagged = 0
`;

export async function getFeed(viewerId: number, limit = 40): Promise<Post[]> {
  const db = getDb();
  return (await db
    .prepare(`${POST_SELECT} ORDER BY p.created_at DESC LIMIT @limit`)
    .all({ viewerId, limit })) as Post[];
}

export async function getCommunityFeed(viewerId: number, communityId: number, limit = 40): Promise<Post[]> {
  const db = getDb();
  return (await db
    .prepare(`${POST_SELECT} AND p.community_id = @communityId ORDER BY p.created_at DESC LIMIT @limit`)
    .all({ viewerId, communityId, limit })) as Post[];
}

export async function getUserPosts(viewerId: number, userId: number, limit = 30): Promise<Post[]> {
  const db = getDb();
  return (await db
    .prepare(`${POST_SELECT} AND p.user_id = @userId ORDER BY p.created_at DESC LIMIT @limit`)
    .all({ viewerId, userId, limit })) as Post[];
}

export async function getComments(postIds: number[]): Promise<Record<number, CommentRow[]>> {
  if (postIds.length === 0) return {};
  const db = getDb();
  const placeholders = postIds.map(() => "?").join(",");
  const rows = (await db
    .prepare(
      `SELECT cm.*, u.name, u.username, u.avatar_hue FROM comments cm
       JOIN users u ON u.id = cm.user_id
       WHERE cm.post_id IN (${placeholders}) AND cm.flagged = 0
       ORDER BY cm.created_at ASC`
    )
    .all(...postIds)) as CommentRow[];
  const map: Record<number, CommentRow[]> = {};
  for (const r of rows) (map[r.post_id] ||= []).push(r);
  return map;
}

export async function getCommunities(userId: number): Promise<(Community & { member_count: number; is_member: number; is_pending: number })[]> {
  const db = getDb();
  return (await db
    .prepare(
      `SELECT c.*,
        (SELECT COUNT(*) FROM memberships m WHERE m.community_id = c.id AND m.status='active') AS member_count,
        (SELECT COUNT(*) FROM memberships m2 WHERE m2.community_id = c.id AND m2.user_id = ? AND m2.status='active') AS is_member,
        (SELECT COUNT(*) FROM memberships m3 WHERE m3.community_id = c.id AND m3.user_id = ? AND m3.status='pending') AS is_pending
       FROM communities c ORDER BY member_count DESC`
    )
    .all(userId, userId)) as (Community & { member_count: number; is_member: number; is_pending: number })[];
}

export async function getCommunityBySlug(slug: string): Promise<Community | undefined> {
  return (await getDb().prepare("SELECT * FROM communities WHERE slug = ?").get(slug)) as Community | undefined;
}

export async function getCommunityMembers(communityId: number): Promise<(User & { role: string })[]> {
  return (await getDb()
    .prepare(
      `SELECT u.*, m.role FROM users u JOIN memberships m ON m.user_id = u.id
       WHERE m.community_id = ? AND m.status = 'active' ORDER BY m.role = 'admin' DESC, u.name`
    )
    .all(communityId)) as (User & { role: string })[];
}

export async function getMembership(userId: number, communityId: number): Promise<{ status: string; role: string } | undefined> {
  return (await getDb()
    .prepare("SELECT status, role FROM memberships WHERE user_id = ? AND community_id = ?")
    .get(userId, communityId)) as { status: string; role: string } | undefined;
}

export async function getUserByUsername(username: string): Promise<User | undefined> {
  return (await getDb().prepare("SELECT * FROM users WHERE username = ?").get(username)) as User | undefined;
}

export async function getNotifications(userId: number, limit = 30): Promise<any[]> {
  return (await getDb()
    .prepare(
      `SELECT n.*, u.name AS actor_name, u.username AS actor_username, u.avatar_hue AS actor_hue
       FROM notifications n LEFT JOIN users u ON u.id = n.actor_id
       WHERE n.user_id = ? ORDER BY n.created_at DESC LIMIT ?`
    )
    .all(userId, limit)) as any[];
}

export async function getUnreadCount(userId: number): Promise<number> {
  const row = (await getDb().prepare("SELECT COUNT(*) c FROM notifications WHERE user_id = ? AND read = 0").get(userId)) as { c: number };
  return row ? row.c : 0;
}

export async function hasPostedToday(userId: number): Promise<boolean> {
  return !!(await getDb().prepare("SELECT 1 FROM posts WHERE user_id = ? AND post_date = ?").get(userId, todayStr()));
}

export async function getUserCommunities(userId: number): Promise<Community[]> {
  return (await getDb()
    .prepare(
      `SELECT c.* FROM communities c JOIN memberships m ON m.community_id = c.id
       WHERE m.user_id = ? AND m.status = 'active'`
    )
    .all(userId)) as Community[];
}

export async function getFollowCounts(userId: number): Promise<{ followers: number; following: number }> {
  const db = getDb();
  const followersRow = (await db.prepare("SELECT COUNT(*) c FROM follows WHERE following_id = ?").get(userId)) as { c: number };
  const followingRow = (await db.prepare("SELECT COUNT(*) c FROM follows WHERE follower_id = ?").get(userId)) as { c: number };
  return {
    followers: followersRow ? followersRow.c : 0,
    following: followingRow ? followingRow.c : 0,
  };
}

export async function isFollowing(viewerId: number, targetId: number): Promise<boolean> {
  return !!(await getDb().prepare("SELECT 1 FROM follows WHERE follower_id = ? AND following_id = ?").get(viewerId, targetId));
}

export async function getCommunityStats(communityId: number): Promise<{ posts7: number; members: number; totalPosts: number; activeToday: number }> {
  const db = getDb();
  const posts7Row = (await db.prepare("SELECT COUNT(*) c FROM posts WHERE community_id = ? AND post_date >= date('now','-6 days')").get(communityId)) as { c: number };
  const membersRow = (await db.prepare("SELECT COUNT(*) c FROM memberships WHERE community_id = ? AND status='active'").get(communityId)) as { c: number };
  const totalPostsRow = (await db.prepare("SELECT COUNT(*) c FROM posts WHERE community_id = ?").get(communityId)) as { c: number };
  const activeTodayRow = (await db.prepare("SELECT COUNT(DISTINCT user_id) c FROM posts WHERE community_id = ? AND post_date = date('now','localtime')").get(communityId)) as { c: number };
  return {
    posts7: posts7Row ? Number(posts7Row.c || 0) : 0,
    members: membersRow ? Number(membersRow.c || 0) : 0,
    totalPosts: totalPostsRow ? Number(totalPostsRow.c || 0) : 0,
    activeToday: activeTodayRow ? Number(activeTodayRow.c || 0) : 0,
  };
}
