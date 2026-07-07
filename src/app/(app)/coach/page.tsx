import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { getWeeklyCoach, getPartnerRecommendations } from "@/lib/ai";
import { isFollowing } from "@/lib/queries";
import Avatar from "@/components/Avatar";
import FollowButton from "@/components/FollowButton";

export const dynamic = "force-dynamic";

export default async function CoachPage() {
  const user = getCurrentUser()!;
  const { insight, source } = await getWeeklyCoach(user);
  const partners = getPartnerRecommendations(user);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-white">✨ AI Coach</h1>
        <p className="text-sm text-ink-400">
          Weekly insights generated from your actual posting patterns
          {source === "openai" ? " · powered by OpenAI" : " · insight engine"}
        </p>
      </div>

      {/* Weekly report */}
      <div className="card relative overflow-hidden p-6">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-brand-500/12 via-transparent to-transparent" />
        <div className="relative">
          <span className="chip border-brand-500/30 bg-brand-500/10 text-brand-300">This week's report</span>
          <h2 className="mt-3 font-display text-2xl font-bold text-white">{insight.headline}</h2>

          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {insight.stats.map((s) => (
              <div key={s.label} className="rounded-xl bg-white/[0.05] p-3 text-center">
                <p className="text-xl font-bold text-white">{s.value}</p>
                <p className="mt-0.5 text-[11px] text-ink-400">{s.label}</p>
              </div>
            ))}
          </div>

          <ul className="mt-5 space-y-2.5">
            {insight.observations.map((o, i) => (
              <li key={i} className="flex gap-2.5 text-[15px] leading-relaxed text-ink-100">
                <span className="text-brand-400">›</span> {o}
              </li>
            ))}
          </ul>

          <div className="mt-5 rounded-xl border border-mint-500/25 bg-mint-500/10 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-mint-400">💡 This week's action</p>
            <p className="mt-1.5 text-[15px] leading-relaxed text-ink-100">{insight.suggestion}</p>
          </div>
        </div>
      </div>

      {/* Accountability partners */}
      <div className="card p-6">
        <h2 className="font-display text-lg font-bold text-white">🤝 Recommended accountability partners</h2>
        <p className="mt-1 text-sm text-ink-400">Matched by goal, schedule, and consistency — people who'll keep you honest.</p>
        <div className="mt-5 space-y-4">
          {partners.map(({ user: p, reason, match }) => (
            <div key={p.id} className="flex items-center gap-4 rounded-xl bg-white/[0.03] p-3.5">
              <Link href={`/profile/${p.username}`}>
                <Avatar name={p.name} hue={p.avatar_hue} size={46} />
              </Link>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <Link href={`/profile/${p.username}`} className="truncate font-semibold text-white hover:underline">{p.name}</Link>
                  <span className="chip border-brand-500/30 bg-brand-500/10 text-brand-300">{match}% match</span>
                </div>
                <p className="mt-0.5 truncate text-sm text-ink-400">🎯 {p.goal}</p>
                <p className="truncate text-xs text-ink-500">{reason}</p>
              </div>
              <FollowButton targetId={p.id} initialFollowing={isFollowing(user.id, p.id)} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
