"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import Avatar from "./Avatar";
import { toggleLikeAction, addCommentAction } from "@/lib/actions";
import type { Post, CommentRow } from "@/lib/types";

function timeAgo(iso: string): string {
  const then = new Date(iso.includes("T") ? iso : iso.replace(" ", "T"));
  const s = Math.max(1, Math.floor((Date.now() - then.getTime()) / 1000));
  if (s < 60) return `${s}s`;
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  return `${Math.floor(s / 86400)}d`;
}

export default function PostCard({
  post,
  comments,
  viewerName,
  viewerHue,
}: {
  post: Post;
  comments: CommentRow[];
  viewerName: string;
  viewerHue: number;
}) {
  const [liked, setLiked] = useState(!!post.liked_by_me);
  const [likeCount, setLikeCount] = useState(post.like_count || 0);
  const [showComments, setShowComments] = useState(false);
  const [localComments, setLocalComments] = useState<CommentRow[]>(comments);
  const [draft, setDraft] = useState("");
  const [notice, setNotice] = useState("");
  const [, startTransition] = useTransition();

  const like = () => {
    setLiked(!liked);
    setLikeCount((c) => c + (liked ? -1 : 1));
    startTransition(() => {
      toggleLikeAction(post.id);
    });
  };

  const submitComment = () => {
    const text = draft.trim();
    if (!text) return;
    setDraft("");
    startTransition(async () => {
      const res = await addCommentAction(post.id, text);
      if (res?.hidden) {
        setNotice("Your comment was hidden by AI moderation.");
        setTimeout(() => setNotice(""), 4000);
      } else if (!res?.error) {
        setLocalComments((c) => [
          ...c,
          {
            id: Math.random(),
            post_id: post.id,
            user_id: 0,
            body: text,
            flagged: 0,
            created_at: new Date().toISOString(),
            name: viewerName,
            avatar_hue: viewerHue,
          } as CommentRow,
        ]);
      }
    });
  };

  return (
    <motion.article
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="card overflow-hidden"
    >
      <div className="flex items-center gap-3 p-4">
        <Link href={`/profile/${post.username}`}>
          <Avatar name={post.name || ""} hue={post.avatar_hue || 260} size={42} />
        </Link>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <Link href={`/profile/${post.username}`} className="truncate font-semibold text-white hover:underline">
              {post.name}
            </Link>
            <span className="text-xs text-ink-400" suppressHydrationWarning>· {timeAgo(post.created_at)}</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-ink-400">
            <span className="chip">{post.goal_category}</span>
            {post.community_name && (
              <Link href={`/communities/${post.community_slug}`} className="truncate hover:text-brand-300">
                in {post.community_name}
              </Link>
            )}
          </div>
        </div>
        <span className="chip border-mint-500/30 bg-mint-500/10 text-mint-400">✓ Daily proof</span>
      </div>

      {post.image_url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={post.image_url} alt="Daily proof" className="max-h-[440px] w-full object-cover" loading="lazy" />
      )}

      <div className="space-y-3 p-4">
        <p className="text-[15px] leading-relaxed text-ink-100">{post.caption}</p>
        {post.progress_note && <p className="text-sm text-ink-400">Progress note: {post.progress_note}</p>}

        <div className="flex items-center gap-1 border-t border-white/[0.06] pt-3">
          <motion.button
            whileTap={{ scale: 1.25 }}
            onClick={like}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${liked ? "text-rose-400" : "text-ink-300 hover:text-white"}`}
          >
            <span className="text-base">{liked ? "❤️" : "🤍"}</span> {likeCount}
          </motion.button>
          <button
            onClick={() => setShowComments((s) => !s)}
            className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-ink-300 transition-colors hover:text-white"
          >
            <span className="text-base">💬</span> {localComments.length}
          </button>
          <span className="ml-auto text-xs text-ink-500">{post.post_date}</span>
        </div>

        <AnimatePresence>
          {showComments && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="space-y-3 overflow-hidden"
            >
              {localComments.map((c) => (
                <div key={c.id} className="flex gap-2.5">
                  <Avatar name={c.name || "?"} hue={c.avatar_hue || 260} size={28} />
                  <div className="rounded-xl bg-white/[0.04] px-3 py-2 text-sm">
                    <span className="mr-2 font-semibold text-white">{c.name}</span>
                    <span className="text-ink-200">{c.body}</span>
                  </div>
                </div>
              ))}
              <div className="flex gap-2">
                <input
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && submitComment()}
                  placeholder="Add encouragement…"
                  className="input py-2"
                />
                <button onClick={submitComment} className="btn-primary px-3 py-2">
                  Send
                </button>
              </div>
              {notice && <p className="text-xs text-flame-400">{notice}</p>}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.article>
  );
}
