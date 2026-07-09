"use client";

import { useState, useTransition, useEffect } from "react";
import { joinCommunityAction, leaveCommunityAction } from "@/lib/actions";

export default function JoinButton({
  communityId,
  isMember,
  isPending,
  isPrivate,
}: {
  communityId: number;
  isMember: boolean;
  isPending: boolean;
  isPrivate: boolean;
}) {
  const [state, setState] = useState<"none" | "member" | "pending">(isMember ? "member" : isPending ? "pending" : "none");
  const [, startTransition] = useTransition();

  useEffect(() => {
    setState(isMember ? "member" : isPending ? "pending" : "none");
  }, [isMember, isPending]);

  if (state === "member") {
    return (
      <button
        onClick={() => {
          setState("none");
          startTransition(() => {
            leaveCommunityAction(communityId);
          });
        }}
        className="btn-ghost px-4 py-2 text-xs"
        title="Click to leave"
      >
        Joined ✓
      </button>
    );
  }
  if (state === "pending") {
    return <span className="btn-ghost pointer-events-none px-4 py-2 text-xs opacity-70">Requested ⏳</span>;
  }
  return (
    <button
      onClick={() => {
        setState(isPrivate ? "pending" : "member");
        startTransition(() => {
          joinCommunityAction(communityId);
        });
      }}
      className="btn-primary px-4 py-2 text-xs"
    >
      {isPrivate ? "Request to join" : "+ Join"}
    </button>
  );
}
