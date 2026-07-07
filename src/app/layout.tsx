import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "GoalReal — BeReal for Goals",
  description:
    "Stay consistent with your goals through small, supportive communities. One proof a day. Real streaks. Real accountability.",
  icons: { icon: "/favicon.svg" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="font-sans min-h-screen">{children}</body>
    </html>
  );
}
