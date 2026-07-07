import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getUserByUsername, getUserPosts, getComments, getFollowCounts, isFollowing, getUserCommunities } from "@/lib/queries";
import { computeStreaks, getHeatmap, getBadges } from "@/lib/stats";
import PostCard from "@/components/PostCard";
import Avatar from "@/components/Avatar";
import Heatmap from "@/components/Heatmap";
import FollowButton from "@/components/FollowButton";

export const dynamic = "force-dynamic";

export default function ProfilePage({ params }: { params: { username: string } }) {
  const viewer = getCurrentUser()!;
  const user = getUserByUsername(params.username);
  if (!user) notFound();

  const posts = getUserPosts(viewer.id, user.id);
  const comments = getComments(posts.map((p) => p.id));
  const streaks = computeStreaks(user.id);
  const heatmap = getHeatmap(user.id);
  const badges = getBadges(user.id);
  const { followers, following } = getFollowCounts(user.id);
  const communities = getUserCommunities(user.id);
  const isMe = viewer.id === user.id;

  return (
    <div className="space-y-6">
      {/* Profile header */}
      <div className="card p-6">
        <div className="flex flex-wrap items-start gap-5">
          <Avatar name={user.name} hue={user.avatar_hue} size={84} ring />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="font-display text-2xl font-bold text-white">{user.name}</h1>
              <span className="text-sm text-ink-400">@{user.username}</span>
              {!isMe && <FollowButton targetId={user.id} initialFollowing={isFollowing(viewer.id, user.id)} />}
            </div>
            {user.bio && <p className="mt-1.5 text-sm text-ink-300">{user.bio}</p>}
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="chip border-brand-500/30 bg-brand-500/10 text-brand-300">🎯 {user.goal}</span>
              <span className="chip">{user.goal_category}</span>
              <span className="chip">{followers} followers</span>
              <span className="chip">{following} following</span>
            </div>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-5">
          {[
            [`🔥 ${streaks.current}`, "Current streak"],
            [String(streaks.longest), "Longest streak"],
            [String(streaks.totalPosts), "Total proofs"],
            [`${streaks.consistency30}%`, "30-day consistency"],
            [String(streaks.activeDays30), "Active days (30d)"],
          ].map(([v, l]) => (
            <div key={l} className="rounded-xl bg-white/[0.04] p-3 text-center">
              <p className="text-lg font-bold text-white">{v}</p>
              <p className="mt-0.5 text-[11px] text-ink-400">{l}</p>
            </div>
          ))}
        </div>

        {/* Heatmap */}
        <div className="mt-6">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-ink-200">Consistency calendar</h3>
            <div className="flex items-center gap-1.5 text-[10px] text-ink-500">
              less
              <span className="h-[10px] w-[10px] rounded-[3px] bg-white/[0.05]" />
              <span className="h-[10px] w-[10px] rounded-[3px] bg-brand-700/60" />
              <span className="h-[10px] w-[10px] rounded-[3px] bg-brand-500" />
              <span className="h-[10px] w-[10px] rounded-[3px] bg-mint-500" />
              more
            </div>
          </div>
          <Heatmap days={heatmap} />
        </div>

        {/* Badges */}
        <div className="mt-6">
          <h3 className="mb-2 text-sm font-semibold text-ink-200">Achievements</h3>
          <div className="flex flex-wrap gap-2">
            {badges.map((b) => (
              <span
                key={b.label}
                title={b.label}
                className={`chip py-1.5 ${b.earned ? "border-brand-500/40 bg-brand-500/10 text-white" : "opacity-35 grayscale"}`}
              >
                {b.emoji} {b.label}
              </span>
            ))}
          </div>
        </div>

        {communities.length > 0 && (
          <p className="mt-5 text-xs text-ink-400">
            Member of {communities.map((c) => c.name).join(" · ")}
          </p>
        )}
      </div>

      {/* Posts */}
      <h2 className="font-display text-lg font-semibold text-white">Daily proofs</h2>
      <div className="space-y-5">
        {posts.length === 0 ? (
          <div className="card p-10 text-center text-ink-400">No proofs yet.</div>
        ) : (
          posts.map((post) => (
            <PostCard key={post.id} post={post} comments={comments[post.id] || []} viewerName={viewer.name} viewerHue={viewer.avatar_hue} />
          ))
        )}
      </div>
    </div>
  );
}
