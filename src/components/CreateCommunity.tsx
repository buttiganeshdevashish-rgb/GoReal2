"use client";

import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { createCommunityAction } from "@/lib/actions";

const CATEGORIES = ["Fitness", "Reading", "Coding", "Meditation", "Learning", "Health", "Business", "Music", "Sports", "Custom"];

function Submit() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="btn-primary w-full">
      {pending ? "Creating…" : "Create community"}
    </button>
  );
}

export default function CreateCommunity() {
  const [open, setOpen] = useState(false);
  const [state, formAction] = useFormState(createCommunityAction, {});

  return (
    <>
      <button onClick={() => setOpen(true)} className="btn-primary">
        + Create community
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.95, y: 12 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 12 }}
              className="card w-full max-w-md p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mb-4 flex items-center justify-between">
                <h3 className="font-display text-lg font-bold text-white">New community</h3>
                <button onClick={() => setOpen(false)} className="text-ink-400 hover:text-white">✕</button>
              </div>
              <form action={formAction} className="space-y-4">
                <input name="name" required placeholder='Name — e.g. "Office Gym Squad"' className="input" />
                <textarea name="description" rows={3} placeholder="What is this community about?" className="input resize-none" />
                <select name="category" className="input">
                  {CATEGORIES.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
                <label className="flex items-center gap-2 text-sm text-ink-300">
                  <input type="checkbox" name="is_private" className="h-4 w-4 rounded accent-brand-500" />
                  Private — members must request to join
                </label>
                {state?.error && <p className="text-sm text-flame-400">{state.error}</p>}
                <Submit />
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
