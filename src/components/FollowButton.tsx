"use client";

import { useState, useTransition } from "react";
import { toggleFollowAction } from "@/lib/actions";

export default function FollowButton({ targetId, initialFollowing }: { targetId: number; initialFollowing: boolean }) {
  const [following, setFollowing] = useState(initialFollowing);
  const [, startTransition] = useTransition();

  return (
    <button
      onClick={() => {
        setFollowing(!following);
        startTransition(() => {
          toggleFollowAction(targetId);
        });
      }}
      className={following ? "btn-ghost px-3 py-1.5 text-xs" : "btn-primary px-3 py-1.5 text-xs"}
    >
      {following ? "Following ✓" : "+ Follow"}
    </button>
  );
}
