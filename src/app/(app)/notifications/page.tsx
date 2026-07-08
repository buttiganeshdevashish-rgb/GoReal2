import { getCurrentUser } from "@/lib/auth";
import { getNotifications } from "@/lib/queries";
import { markAllReadAction } from "@/lib/actions";
import Avatar from "@/components/Avatar";

export const dynamic = "force-dynamic";

const ICONS: Record<string, string> = {
  like: "❤️",
  comment: "💬",
  milestone: "🏆",
  reminder: "⏰",
  join: "👥",
};

function timeAgo(iso: string): string {
  const then = new Date(iso.includes("T") ? iso : iso.replace(" ", "T") + "Z");
  const s = Math.max(1, Math.floor((Date.now() - then.getTime()) / 1000));
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

export default async function NotificationsPage() {
  const user = await getCurrentUser();
  if (!user) return null;
  const notifications = await getNotifications(user.id);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-white">Notifications</h1>
          <p className="text-sm text-ink-400">Encouragement, milestones & nudges</p>
        </div>
        <form action={markAllReadAction}>
          <button className="btn-ghost text-xs">Mark all read</button>
        </form>
      </div>

      <div className="space-y-2">
        {notifications.length === 0 ? (
          <div className="card p-10 text-center text-ink-400">All quiet. Go post your proof! 📸</div>
        ) : (
          notifications.map((n) => (
            <div
              key={n.id}
              className={`card flex items-center gap-3.5 p-4 ${n.read ? "opacity-60" : "border-brand-500/25"}`}
            >
              {n.actor_name ? (
                <Avatar name={n.actor_name} hue={n.actor_hue || 260} size={40} />
              ) : (
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-flame-500/15 text-lg">⏰</span>
              )}
              <div className="min-w-0 flex-1">
                <p className="text-sm text-ink-100">{n.body}</p>
                <p className="mt-0.5 text-xs text-ink-500" suppressHydrationWarning>
                  {ICONS[n.type] || "🔔"} {timeAgo(n.created_at)}
                </p>
              </div>
              {!n.read && <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-brand-500" />}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
