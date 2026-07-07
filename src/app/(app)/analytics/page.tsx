import { getCurrentUser } from "@/lib/auth";
import { computeStreaks, getWeeklyActivity, getMonthlyTrend, getHeatmap } from "@/lib/stats";
import { getDb, daysAgo } from "@/lib/db";
import Heatmap from "@/components/Heatmap";
import { WeeklyBars, TrendArea } from "@/components/Charts";

export const dynamic = "force-dynamic";

export default async function AnalyticsPage() {
  const user = (await getCurrentUser())!;
  const streaks = await computeStreaks(user.id);
  const weekly = await getWeeklyActivity(user.id);
  const trend = await getMonthlyTrend(user.id);
  const heatmap = await getHeatmap(user.id);

  const db = getDb();
  const communityGrowthRow = (
    await db.prepare("SELECT COUNT(*) c FROM memberships WHERE status='active' AND joined_at >= datetime('now','-30 days')").get()
  ) as { c: number } | undefined;
  const communityGrowth = communityGrowthRow ? communityGrowthRow.c : 0;

  const totalLikesRow = (
    await db.prepare("SELECT COUNT(*) c FROM likes l JOIN posts p ON p.id = l.post_id WHERE p.user_id = ?").get(user.id)
  ) as { c: number } | undefined;
  const totalLikes = totalLikesRow ? totalLikesRow.c : 0;

  const totalCommentsRow = (
    await db.prepare("SELECT COUNT(*) c FROM comments cm JOIN posts p ON p.id = cm.post_id WHERE p.user_id = ? AND cm.flagged = 0").get(user.id)
  ) as { c: number } | undefined;
  const totalComments = totalCommentsRow ? totalCommentsRow.c : 0;

  const posts7Row = (
    await db.prepare("SELECT COUNT(*) c FROM posts WHERE user_id = ? AND post_date >= ?").get(user.id, daysAgo(6))
  ) as { c: number } | undefined;
  const posts7 = posts7Row ? posts7Row.c : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-white">Analytics</h1>
        <p className="text-sm text-ink-400">Your consistency, quantified.</p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          [`🔥 ${streaks.current}`, "Current streak", "days and counting"],
          [`${posts7}/7`, "This week", "proofs posted"],
          [`${streaks.consistency30}%`, "30-day consistency", `${streaks.activeDays30} active days`],
          [`${totalLikes}`, "Likes earned", `+ ${totalComments} comments`],
        ].map(([v, l, sub]) => (
          <div key={l} className="card p-5">
            <p className="text-2xl font-bold text-white">{v}</p>
            <p className="mt-1 text-sm font-medium text-ink-200">{l}</p>
            <p className="text-xs text-ink-500">{sub}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <div className="card p-5">
          <h3 className="mb-4 font-display font-semibold text-white">Weekly activity</h3>
          <WeeklyBars data={weekly} />
        </div>
        <div className="card p-5">
          <h3 className="mb-4 font-display font-semibold text-white">Consistency trend (8 weeks)</h3>
          <TrendArea data={trend} />
        </div>
      </div>

      <div className="card p-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-display font-semibold text-white">Posting calendar</h3>
          <span className="chip">Longest streak: {streaks.longest} days · Total: {streaks.totalPosts} proofs</span>
        </div>
        <Heatmap days={heatmap} />
      </div>

      <div className="card flex items-center gap-4 p-5">
        <span className="text-2xl">📈</span>
        <div>
          <p className="font-semibold text-white">Platform is growing</p>
          <p className="text-sm text-ink-400">{communityGrowth} new community memberships in the last 30 days across GoalReal.</p>
        </div>
      </div>
    </div>
  );
}
