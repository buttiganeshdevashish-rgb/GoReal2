import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { getFeed, getComments, getUserCommunities, hasPostedToday } from "@/lib/queries";
import { computeStreaks, getHeatmap } from "@/lib/stats";
import { getPartnerRecommendations } from "@/lib/ai";
import PostCard from "@/components/PostCard";
import Composer from "@/components/Composer";
import Heatmap from "@/components/Heatmap";
import Avatar from "@/components/Avatar";

export const dynamic = "force-dynamic";

export default async function HomePage({ searchParams }: { searchParams: { posted?: string } }) {
  const user = (await getCurrentUser())!;
  const feed = await getFeed(user.id);
  const comments = await getComments(feed.map((p) => p.id));
  const myCommunities = await getUserCommunities(user.id);
  const posted = await hasPostedToday(user.id);
  const streaks = await computeStreaks(user.id);
  const heatmap = await getHeatmap(user.id, 62);
  const partnersFull = await getPartnerRecommendations(user);
  const partners = partnersFull.slice(0, 3);

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_310px]">
      <div className="space-y-5">
        {searchParams.posted && (
          <div className="card flex items-center gap-3 border-mint-500/30 bg-mint-500/10 p-4 text-mint-400">
            <span className="text-xl">🎉</span>
            <p className="font-semibold">Proof posted! Streak: {streaks.current} days. See you tomorrow.</p>
          </div>
        )}
        <Composer communities={myCommunities} posted={posted} />
        <div className="space-y-5">
          {feed.map((post) => (
            <PostCard key={post.id} post={post} comments={comments[post.id] || []} viewerName={user.name} viewerHue={user.avatar_hue} />
          ))}
        </div>
      </div>

      <aside className="hidden space-y-5 lg:block">
        <div className="card p-5">
          <div className="flex items-center justify-between">
            <h3 className="font-display font-semibold text-white">Your consistency</h3>
            <Link href={`/profile/${user.username}`} className="text-xs text-brand-300 hover:underline">View profile →</Link>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2 text-center">
            <div className="rounded-xl bg-white/[0.04] p-3">
              <p className="text-xl font-bold text-flame-400">🔥 {streaks.current}</p>
              <p className="mt-1 text-[11px] text-ink-400">Current</p>
            </div>
            <div className="rounded-xl bg-white/[0.04] p-3">
              <p className="text-xl font-bold text-white">{streaks.longest}</p>
              <p className="mt-1 text-[11px] text-ink-400">Longest</p>
            </div>
            <div className="rounded-xl bg-white/[0.04] p-3">
              <p className="text-xl font-bold text-mint-400">{streaks.consistency30}%</p>
              <p className="mt-1 text-[11px] text-ink-400">30-day</p>
            </div>
          </div>
          <div className="mt-4">
            <Heatmap days={heatmap} />
          </div>
        </div>

        <div className="card p-5">
          <h3 className="font-display font-semibold text-white">✨ AI partner picks</h3>
          <p className="mt-1 text-xs text-ink-400">People matched to your goal & pace</p>
          <div className="mt-4 space-y-3">
            {partners.map(({ user: p, reason, match }) => (
              <div key={p.id} className="flex items-center gap-3">
                <Link href={`/profile/${p.username}`}>
                  <Avatar name={p.name} hue={p.avatar_hue} size={36} />
                </Link>
                <div className="min-w-0 flex-1">
                  <Link href={`/profile/${p.username}`} className="block truncate text-sm font-semibold text-white hover:underline">{p.name}</Link>
                  <p className="truncate text-xs text-ink-400">{reason}</p>
                </div>
                <span className="chip border-brand-500/30 bg-brand-500/10 text-brand-300">{match}%</span>
              </div>
            ))}
          </div>
          <Link href="/coach" className="mt-4 block text-center text-xs text-brand-300 hover:underline">See all matches →</Link>
        </div>

        <div className="card p-5">
          <h3 className="font-display font-semibold text-white">Your communities</h3>
          <div className="mt-3 space-y-2">
            {myCommunities.map((c) => (
              <Link key={c.id} href={`/communities/${c.slug}`} className="flex items-center gap-3 rounded-xl p-2 transition-colors hover:bg-white/[0.05]">
                <span
                  className="flex h-9 w-9 items-center justify-center rounded-xl text-sm font-bold text-white"
                  style={{ background: `linear-gradient(135deg, hsl(${c.banner_hue},65%,50%), hsl(${(c.banner_hue + 60) % 360},60%,38%))` }}
                >
                  {c.name[0]}
                </span>
                <span className="truncate text-sm font-medium text-ink-200">{c.name}</span>
                {c.is_private ? <span className="ml-auto text-xs">🔒</span> : null}
              </Link>
            ))}
            <Link href="/communities" className="block pt-1 text-center text-xs text-brand-300 hover:underline">Browse all →</Link>
          </div>
        </div>
      </aside>
    </div>
  );
}
