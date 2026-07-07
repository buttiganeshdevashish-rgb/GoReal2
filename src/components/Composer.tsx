"use client";

import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { motion } from "framer-motion";
import { createPostAction } from "@/lib/actions";
import type { Community } from "@/lib/types";

function SubmitBtn() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="btn-primary w-full">
      {pending ? "Posting…" : "Post today's proof 🔥"}
    </button>
  );
}

export default function Composer({ communities, posted }: { communities: Community[]; posted: boolean }) {
  const [state, formAction] = useFormState(createPostAction, {});
  const [fileName, setFileName] = useState("");
  const [open, setOpen] = useState(false);

  if (posted) {
    return (
      <div className="card flex items-center gap-3 p-4">
        <span className="text-2xl">✅</span>
        <div>
          <p className="font-semibold text-white">Today's proof is in.</p>
          <p className="text-sm text-ink-400">Come back tomorrow — one real post a day.</p>
        </div>
      </div>
    );
  }

  if (!open) {
    return (
      <motion.button
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.99 }}
        onClick={() => setOpen(true)}
        className="card flex w-full items-center gap-3 p-4 text-left transition-colors hover:border-brand-500/40"
      >
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-500/15 text-xl">📸</span>
        <div>
          <p className="font-semibold text-white">Post today's proof</p>
          <p className="text-sm text-ink-400">You haven't posted yet today. Keep the streak alive.</p>
        </div>
        <span className="ml-auto rounded-full bg-brand-500 px-3 py-1 text-xs font-bold text-white">+ New</span>
      </motion.button>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="card space-y-3 p-4">
      <div className="flex items-center justify-between">
        <h3 className="font-display text-lg font-semibold text-white">Today's proof</h3>
        <button onClick={() => setOpen(false)} className="text-sm text-ink-400 hover:text-white">
          Cancel
        </button>
      </div>
      <form action={formAction} className="space-y-3">
        <textarea
          name="caption"
          rows={2}
          required
          placeholder='What did you do today? e.g. "Ran 5 km." or "Finished Chapter 8."'
          className="input resize-none"
        />
        <input name="progress" placeholder="Progress note (optional) — how did it feel?" className="input" />
        <div className="flex flex-col gap-3 sm:flex-row">
          <label className="btn-ghost flex-1 cursor-pointer overflow-hidden">
            <input
              type="file"
              name="image"
              accept="image/*"
              className="hidden"
              onChange={(e) => setFileName(e.target.files?.[0]?.name || "")}
            />
            {fileName ? `📎 ${fileName.slice(0, 24)}` : "📷 Add photo proof"}
          </label>
          <select name="community_id" className="input flex-1 sm:w-auto">
            <option value="">Share to: Everyone</option>
            {communities.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        {state?.error && <p className="text-sm text-flame-400">{state.error}</p>}
        <SubmitBtn />
      </form>
    </motion.div>
  );
}
