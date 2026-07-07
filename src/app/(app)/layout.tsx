import { redirect } from "next/navigation";
import AppNav from "@/components/AppNav";
import { getCurrentUser } from "@/lib/auth";
import { getUnreadCount } from "@/lib/queries";
import { computeStreaks } from "@/lib/stats";

export const dynamic = "force-dynamic";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const user = getCurrentUser();
  if (!user) redirect("/login");
  const unread = getUnreadCount(user.id);
  const streaks = computeStreaks(user.id);

  return (
    <div className="min-h-screen">
      <AppNav name={user.name} username={user.username} hue={user.avatar_hue} unread={unread} streak={streaks.current} />
      <main className="px-4 pb-24 pt-20 lg:ml-60 lg:pb-10 lg:pt-8">
        <div className="mx-auto max-w-5xl">{children}</div>
      </main>
    </div>
  );
}
