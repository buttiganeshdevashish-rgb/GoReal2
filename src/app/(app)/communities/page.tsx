import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { getCommunities } from "@/lib/queries";
import JoinButton from "@/components/JoinButton";
import CreateCommunity from "@/components/CreateCommunity";

export const dynamic = "force-dynamic";

export default async function CommunitiesPage() {
  const user = await getCurrentUser();
  if (!user) return null;
  const communities = await getCommunities(user.id);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-white">Communities</h1>
          <p className="text-sm text-ink-400">Small circles, big accountability.</p>
        </div>
        <CreateCommunity />
      </div>

      {communities.length === 0 ? (
        <div className="card flex flex-col items-center justify-center p-12 text-center border-dashed border-white/[0.08]">
          <span className="text-4xl">👥</span>
          <h2 className="mt-4 font-display text-lg font-semibold text-white">No communities yet</h2>
          <p className="mt-1.5 max-w-sm text-sm text-ink-400">
            Be the first to build a circle for your favorite hobby or goal. Invite others to grow together!
          </p>
          <div className="mt-5">
            <CreateCommunity />
          </div>
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2">
          {communities.map((c) => (
            <div key={c.id} className="card overflow-hidden">
              <Link href={`/communities/${c.slug}`}>
                <div
                  className="flex h-24 items-end p-4"
                  style={{
                    background: `linear-gradient(120deg, hsl(${c.banner_hue},60%,30%), hsl(${(c.banner_hue + 60) % 360},55%,18%))`,
                  }}
                >
                  <span className="chip bg-black/30 text-white backdrop-blur">{c.category}</span>
                  {c.is_private ? <span className="chip ml-2 bg-black/30 text-white backdrop-blur">🔒 Private</span> : null}
                </div>
              </Link>
              <div className="space-y-3 p-5">
                <div className="flex items-start justify-between gap-2">
                  <Link href={`/communities/${c.slug}`} className="font-display text-lg font-semibold text-white hover:text-brand-300">
                    {c.name}
                  </Link>
                  <span className="chip shrink-0">{c.member_count} members</span>
                </div>
                <p className="line-clamp-2 text-sm leading-relaxed text-ink-300">{c.description}</p>
                <div className="flex items-center gap-2">
                  <JoinButton communityId={c.id} isMember={!!c.is_member} isPending={!!c.is_pending} isPrivate={!!c.is_private} />
                  <Link href={`/communities/${c.slug}`} className="btn-ghost px-4 py-2 text-xs">
                    View →
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
