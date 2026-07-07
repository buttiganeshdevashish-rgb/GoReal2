"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useFormState, useFormStatus } from "react-dom";
import { motion } from "framer-motion";
import { loginAction, signupAction, demoLoginAction } from "@/lib/actions";

const CATEGORIES = ["Fitness", "Reading", "Coding", "Meditation", "Learning", "Health", "Business", "Music", "Sports", "Custom"];

function Submit({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="btn-primary w-full py-3">
      {pending ? "One sec…" : label}
    </button>
  );
}

export default function AuthClient() {
  const params = useSearchParams();
  const [mode, setMode] = useState<"login" | "signup">(params.get("mode") === "signup" ? "signup" : "login");
  const [loginState, loginFormAction] = useFormState(loginAction, {});
  const [signupState, signupFormAction] = useFormState(signupAction, {});
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  useEffect(() => {
    // Automatically trigger the demo login if the user is in login mode,
    // has no existing session, and did not explicitly pass a logout parameter.
    const isLogout = params.get("logout") === "true";
    const hasSession = typeof document !== "undefined" && document.cookie.includes("goalreal_session");
    
    if (mode === "login" && !isLogout && !hasSession) {
      setIsLoggingIn(true);
      const timer = setTimeout(() => {
        demoLoginAction()
          .then(() => {
            window.location.href = "/home";
          })
          .catch(() => setIsLoggingIn(false));
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [mode, params]);

  if (isLoggingIn) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center px-4 py-10">
        <div className="hero-grid pointer-events-none fixed inset-0" />
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }} 
          animate={{ opacity: 1, scale: 1 }} 
          className="text-center space-y-4 relative z-10"
        >
          <img src="/favicon.svg" alt="" className="mx-auto h-16 w-16 animate-pulse" />
          <h2 className="font-display text-2xl font-bold text-white">GoalReal</h2>
          <p className="text-ink-400 text-sm">Entering guest session, please wait...</p>
          <div className="h-1.5 w-32 bg-white/10 rounded-full mx-auto overflow-hidden">
            <motion.div
              className="h-full bg-brand-500 rounded-full"
              animate={{ x: [-50, 100] }}
              transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
              style={{ width: "40%" }}
            />
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="hero-grid pointer-events-none fixed inset-0" />
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="relative w-full max-w-md">
        <Link href="/" className="mb-8 flex items-center justify-center gap-2.5">
          <img src="/favicon.svg" alt="" className="h-9 w-9" />
          <span className="font-display text-2xl font-bold text-white">GoalReal</span>
        </Link>

        <div className="card p-7">
          <div className="mb-6 grid grid-cols-2 rounded-xl bg-ink-800 p-1">
            {(["login", "signup"] as const).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`rounded-lg py-2 text-sm font-semibold transition-colors ${mode === m ? "bg-brand-500 text-white" : "text-ink-300 hover:text-white"}`}
              >
                {m === "login" ? "Sign in" : "Create account"}
              </button>
            ))}
          </div>

          {mode === "login" ? (
            <form action={loginFormAction} className="space-y-4">
              <input name="email" type="email" required placeholder="Email" className="input" />
              <input name="password" type="password" required placeholder="Password" className="input" />
              {loginState?.error && <p className="text-sm text-flame-400">{loginState.error}</p>}
              <Submit label="Sign in" />
            </form>
          ) : (
            <form action={signupFormAction} className="space-y-4">
              <input name="name" required placeholder="Full name" className="input" />
              <input name="email" type="email" required placeholder="Email" className="input" />
              <input name="password" type="password" required minLength={8} placeholder="Password (8+ characters)" className="input" />
              <input name="goal" placeholder='Your ONE goal — e.g. "Run 5km daily"' className="input" />
              <select name="category" className="input">
                {CATEGORIES.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
              {signupState?.error && <p className="text-sm text-flame-400">{signupState.error}</p>}
              <Submit label="Start my streak" />
            </form>
          )}

          <div className="my-5 flex items-center gap-3 text-xs text-ink-500">
            <span className="h-px flex-1 bg-white/10" /> or <span className="h-px flex-1 bg-white/10" />
          </div>

          <button
            onClick={async () => {
              setIsLoggingIn(true);
              try {
                await demoLoginAction();
                window.location.href = "/home";
              } catch (e) {
                setIsLoggingIn(false);
              }
            }}
            className="btn-ghost w-full py-3"
          >
            ✨ Instant demo login (judge mode)
          </button>
          <p className="mt-3 text-center text-xs text-ink-500">
            Demo account: demo@goalreal.app · demo1234
          </p>
        </div>
      </motion.div>
    </div>
  );
}
