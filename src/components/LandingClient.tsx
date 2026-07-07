"use client";

import Link from "next/link";
import { motion } from "framer-motion";

const fade = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-60px" },
  transition: { duration: 0.55, ease: "easeOut" as const },
};

const FEATURES = [
  ["📸", "One proof a day", "No endless scrolling, no influencers. Upload one photo proving you worked on your goal. That's the whole feed."],
  ["🔥", "Streaks that matter", "Current streak, longest streak, and a GitHub-style consistency calendar. Your discipline, visualized."],
  ["👥", "Small communities", "Join your gym buddies, study group, or running club. Accountability works best with people who know you."],
  ["✨", "AI weekly coach", "Every week, AI analyzes your patterns — your weakest day, your best hours — and gives one actionable fix."],
  ["🏆", "Leaderboards", "Friendly competition on streaks and consistency. Nobody wants to be the one who broke the chain."],
  ["🛡️", "AI moderation", "Spam, toxicity, and promo junk get filtered automatically. Only encouragement gets through."],
];

const TESTIMONIALS = [
  ["Sneha R.", "Half-marathon trainee", "My running club moved here from a group chat. I haven't missed a run in 34 days — because they'd all see it."],
  ["Aarav M.", "Software engineer", "BeReal made me post selfies. GoalReal made me finish 90 days of LeetCode. Not the same app category, honestly."],
  ["Vikram N.", "UPSC aspirant", "The AI coach spotted that I always skip Fridays. One schedule change and my consistency jumped 14%."],
];

const FAQS = [
  ["Is GoalReal free?", "Yes — free for individuals and communities up to 50 members during beta."],
  ["What stops people from faking proofs?", "Communities are small and personal — your gym buddies know if you actually showed up. Social trust beats algorithmic verification."],
  ["Can I track multiple goals?", "We deliberately support ONE primary goal. Focus is the feature. You can change your goal anytime."],
  ["What happens if I miss a day?", "Your streak resets, and your community sees the gap on your calendar. That tiny bit of friendly pressure is the whole point."],
];

export default function LandingClient() {
  return (
    <div className="relative overflow-hidden">
      <div className="hero-grid pointer-events-none absolute inset-0" />

      {/* Nav */}
      <nav className="relative z-10 mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <div className="flex items-center gap-2.5">
          <img src="/favicon.svg" alt="" className="h-8 w-8" />
          <span className="font-display text-xl font-bold text-white">GoalReal</span>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/login" className="btn-ghost">Sign in</Link>
          <Link href="/login?mode=signup" className="btn-primary">Get started</Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative z-10 mx-auto max-w-6xl px-6 pb-24 pt-16 text-center sm:pt-24">
        <motion.div {...fade}>
          <span className="chip mb-6 border-brand-500/30 bg-brand-500/10 text-brand-300">🔥 BeReal for Goals</span>
        </motion.div>
        <motion.h1 {...fade} transition={{ ...fade.transition, delay: 0.08 }} className="font-display mx-auto max-w-3xl text-5xl font-bold leading-[1.05] tracking-tight sm:text-7xl">
          <span className="text-gradient">Prove it.</span>
          <br />
          Every single day.
        </motion.h1>
        <motion.p {...fade} transition={{ ...fade.transition, delay: 0.16 }} className="mx-auto mt-6 max-w-xl text-lg text-ink-300">
          GoalReal is where small communities keep each other consistent. One goal. One daily proof photo. Real streaks, real friends, real accountability.
        </motion.p>
        <motion.div {...fade} transition={{ ...fade.transition, delay: 0.24 }} className="mt-9 flex flex-wrap items-center justify-center gap-3">
          <Link href="/login?mode=signup" className="btn-primary px-6 py-3 text-base">Start your streak — free</Link>
          <Link href="/login?demo=1" className="btn-ghost px-6 py-3 text-base">▶ Try the live demo</Link>
        </motion.div>

        {/* App preview */}
        <motion.div {...fade} transition={{ ...fade.transition, delay: 0.3 }} className="relative mx-auto mt-16 max-w-3xl">
          <div className="absolute -inset-8 rounded-[2rem] bg-brand-500/20 blur-3xl" />
          <div className="card relative space-y-3 p-5 text-left">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-orange-400 to-rose-500 font-bold text-white">SR</div>
              <div>
                <p className="font-semibold text-white">Sneha Reddy <span className="ml-1 text-xs font-normal text-ink-400">· 2h · in Morning Movers</span></p>
                <p className="text-xs text-ink-400">🏃 Run 5km daily</p>
              </div>
              <span className="chip ml-auto border-mint-500/30 bg-mint-500/10 text-mint-400">✓ Daily proof</span>
            </div>
            <img src="/seed/fitness-2.svg" alt="" className="h-56 w-full rounded-xl object-cover" />
            <p className="text-[15px]">Ran 5 km in 28:40. Shaved 30 seconds off my pace! 🏃‍♀️</p>
            <div className="flex items-center gap-4 border-t border-white/[0.06] pt-3 text-sm text-ink-300">
              <span>❤️ 12</span><span>💬 4</span>
              <span className="ml-auto flex items-center gap-1 text-flame-400">🔥 34-day streak</span>
            </div>
          </div>
        </motion.div>
      </section>

      {/* Features */}
      <section className="relative z-10 mx-auto max-w-6xl px-6 py-20">
        <motion.h2 {...fade} className="font-display text-center text-3xl font-bold text-white sm:text-4xl">
          Everything you need to <span className="text-gradient">never skip twice</span>
        </motion.h2>
        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map(([icon, title, desc], i) => (
            <motion.div key={title} {...fade} transition={{ ...fade.transition, delay: i * 0.06 }} className="card p-6 transition-colors hover:border-brand-500/30">
              <span className="text-3xl">{icon}</span>
              <h3 className="mt-4 font-display text-lg font-semibold text-white">{title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-300">{desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="relative z-10 mx-auto max-w-4xl px-6 py-20">
        <motion.h2 {...fade} className="font-display text-center text-3xl font-bold text-white sm:text-4xl">Three steps to consistency</motion.h2>
        <div className="mt-12 space-y-6">
          {[
            ["1", "Pick ONE goal", "Gym, reading, coding, UPSC prep, meditation — whatever matters most right now."],
            ["2", "Join your people", "Create a private circle with friends, or join a public community grinding on the same thing."],
            ["3", "Post daily proof", "One photo a day. Your streak grows, your community cheers, AI coaches you weekly."],
          ].map(([n, title, desc], i) => (
            <motion.div key={n} {...fade} transition={{ ...fade.transition, delay: i * 0.08 }} className="card flex items-start gap-5 p-6">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-500/15 font-display text-lg font-bold text-brand-300">{n}</span>
              <div>
                <h3 className="font-display text-lg font-semibold text-white">{title}</h3>
                <p className="mt-1 text-ink-300">{desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Testimonials */}
      <section className="relative z-10 mx-auto max-w-6xl px-6 py-20">
        <motion.h2 {...fade} className="font-display text-center text-3xl font-bold text-white sm:text-4xl">Streaks people brag about</motion.h2>
        <div className="mt-12 grid gap-5 md:grid-cols-3">
          {TESTIMONIALS.map(([name, role, quote], i) => (
            <motion.figure key={name} {...fade} transition={{ ...fade.transition, delay: i * 0.08 }} className="card p-6">
              <p className="text-[15px] leading-relaxed text-ink-100">"{quote}"</p>
              <figcaption className="mt-4 text-sm">
                <span className="font-semibold text-white">{name}</span>
                <span className="text-ink-400"> — {role}</span>
              </figcaption>
            </motion.figure>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section className="relative z-10 mx-auto max-w-3xl px-6 py-20">
        <motion.h2 {...fade} className="font-display text-center text-3xl font-bold text-white sm:text-4xl">Questions, answered</motion.h2>
        <div className="mt-10 space-y-3">
          {FAQS.map(([q, a], i) => (
            <motion.details key={q} {...fade} transition={{ ...fade.transition, delay: i * 0.05 }} className="card group p-5">
              <summary className="cursor-pointer list-none font-semibold text-white">
                <span className="mr-2 inline-block text-brand-400 transition-transform group-open:rotate-90">›</span>{q}
              </summary>
              <p className="mt-3 pl-5 text-sm leading-relaxed text-ink-300">{a}</p>
            </motion.details>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="relative z-10 mx-auto max-w-4xl px-6 py-24 text-center">
        <motion.div {...fade} className="card relative overflow-hidden p-12">
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-brand-500/20 via-transparent to-mint-500/10" />
          <h2 className="font-display relative text-3xl font-bold text-white sm:text-5xl">Day one starts today.</h2>
          <p className="relative mx-auto mt-4 max-w-md text-ink-300">Your future self is watching. Post your first proof in the next 5 minutes.</p>
          <div className="relative mt-8 flex flex-wrap justify-center gap-3">
            <Link href="/login?mode=signup" className="btn-primary px-6 py-3 text-base">Create free account</Link>
            <Link href="/login?demo=1" className="btn-ghost px-6 py-3 text-base">Explore demo</Link>
          </div>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/[0.06] py-10 text-center text-sm text-ink-400">
        <div className="flex items-center justify-center gap-2">
          <img src="/favicon.svg" alt="" className="h-5 w-5" />
          <span className="font-display font-semibold text-ink-200">GoalReal</span>
        </div>
        <p className="mt-2">BeReal for Goals · Built for the buildathon · © 2026</p>
      </footer>
    </div>
  );
}
