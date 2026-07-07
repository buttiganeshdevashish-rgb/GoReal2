import Link from "next/link";
import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import {
  getCommunityBySlug,
  getCommunityFeed,
  getComments,
  getCommunityMembers,
  getMembership,
  getCommunityStats,
} from "@/lib/queries";
import { getCommunityLeaderboard } from "@/lib/stats";
import { getCommunityInsight, getCurrentChallenge } from "@/lib/ai";
import PostCard from "@/components/PostCard";
import Avatar from "@/components/Avatar";
import JoinButton from "@/components/JoinButton";

export const dynamic = "force-dynamic";

export default async function CommunityPage({ params }: { params: { slug: string } }) {
  const user = (await getCurrentUser())!;
  const community = await getCommunityBySlug(params.slug);
  if (!community) notFound();

  const membership = await getMembership(user.id, community.id);
  const isMember = membership?.status === "active";
  const feed = await getCommunityFeed(user.id, community.id);
  const comments = await getComments(feed.map((p) => p.id));
  const members = await getCommunityMembers(community.id);
  const leaderboardFull = await getCommunityLeaderboard(community.id);
  const leaderboard = leaderboardFull.slice(0, 8);
  const stats = await getCommunityStats(community.id);
  const challenge = await getCurrentChallenge(community.id);
  const { insight } = await getCommunityInsight(community.id);

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="card overflow-hidden">
        <div
          className="flex h-36 items-end justify-between p-5"
          style={{
            background: `linear-gradient(120deg, hsl(${community.banner_hue},60%,32%), hsl(${(community.banner_hue + 70) % 360},55%,16%))`,
          }}
        >
          <div>
            <span className="chip bg-black/30 text-white backdrop-blur">{community.category}</span>
            {community.is_private ? <span className="chip ml-2 bg-black/30 text-white backdrop-blur">🔒 Private</span> : null}
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 p-5">
          <div>
            <h1 className="font-display text-2xl font-bold text-white">{community.name}</h1>
            <p className="mt-1 max-w-2xl text-sm leading-relaxed text-ink-300">{community.description}</p>
          </div>
          <JoinButton
            communityId={community.id}
            isMember={isMember}
            isPending={membership?.status === "pending"}
            isPrivate={!!community.is_private}
          />
        </div>
        <div className="grid grid-cols-2 gap-px border-t border-white/[0.06] bg-white/[0.03] sm:grid-cols-4">
          {[
            [stats.members, "Members"],
            [stats.posts7, "Posts this week"],
            [stats.activeToday, "Active today"],
            [stats.totalPosts, "Total proofs"],
          ].map(([v, l]) => (
            <div key={l as string} className="bg-ink-900 p-4 text-center">
              <p className="text-xl font-bold text-white">{v}</p>
              <p className="text-xs text-ink-400">{l}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_310px]">
        <div className="space-y-5">
          {/* Weekly challenge */}
          {challenge && (
            <div className="card border-brand-500/25 bg-gradient-to-r from-brand-500/10 to-transparent p-5">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-brand-300">
                ✨ AI weekly challenge
              </div>
              <h3 className="mt-1 font-display text-lg font-bold text-white">{challenge.title}</h3>
              <p className="mt-1 text-sm text-ink-300">{challenge.description}</p>
            </div>
          )}

          {feed.length === 0 ? (
            <div className="card p-10 text-center text-ink-400">No proofs yet this week. Be the first. 👀</div>
          ) : (
            feed.map((post) => (
              <PostCard key={post.id} post={post} comments={comments[post.id] || []} viewerName={user.name} viewerHue={user.avatar_hue} />
            ))
          )}
        </div>

        <aside className="space-y-5">
          {/* AI community insights */}
          <div className="card p-5">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-brand-300">✨ AI community pulse</div>
            <h3 className="mt-2 font-display font-semibold text-white">{insight.headline}</h3>
            <div className="mt-3 grid grid-cols-2 gap-2">
              {insight.stats.map((s) => (
                <div key={s.label} className="rounded-xl bg-white/[0.04] p-2.5 text-center">
                  <p className="text-sm font-bold text-white">{s.value}</p>
                  <p className="text-[10px] text-ink-400">{s.label}</p>
                </div>
              ))}
            </div>
            <ul className="mt-3 space-y-1.5 text-xs leading-relaxed text-ink-300">
              {insight.observations.slice(0, 3).map((o, i) => (
                <li key={i}>· {o}</li>
              ))}
            </ul>
          </div>

          {/* Leaderboard */}
          <div className="card p-5">
            <h3 className="font-display font-semibold text-white">🏆 Weekly leaderboard</h3>
            <div className="mt-3 space-y-2.5">
              {leaderboard.map((row, i) => (
                <Link key={row.user.id} href={`/profile/${row.user.username}`} className="flex items-center gap-3 rounded-lg p-1 hover:bg-white/[0.04]">
                  <span className={`w-5 text-center text-sm font-bold ${i === 0 ? "text-yellow-400" : i === 1 ? "text-ink-200" : i === 2 ? "text-orange-400" : "text-ink-500"}`}>
                    {i + 1}
                  </span>
                  <Avatar name={row.user.name} hue={row.user.avatar_hue} size={30} />
                  <span className="min-w-0 flex-1 truncate text-sm font-medium text-ink-100">{row.user.name}</span>
                  <span className="text-xs text-flame-400">🔥 {row.currentStreak}</span>
                  <span className="w-10 text-right text-xs text-mint-400">{row.consistency}%</span>
                </Link>
              ))}
            </div>
          </div>

          {/* Members */}
          <div className="card p-5">
            <h3 className="font-display font-semibold text-white">Members ({members.length})</h3>
            <div className="mt-3 flex flex-wrap gap-2">
              {members.map((m) => (
                <Link key={m.id} href={`/profile/${m.username}`} title={`${m.name}${m.role === "admin" ? " · admin" : ""}`}>
                  <Avatar name={m.name} hue={m.avatar_hue} size={34} ring={m.role === "admin"} />
                </Link>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
