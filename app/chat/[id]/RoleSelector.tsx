"use client";

import { useState, useTransition } from "react";
import { claimParticipant } from "../actions";
import type { Participant } from "@/lib/types";

interface RoleSelectorProps {
  chatId: string;
  participants: Participant[];
}

export default function RoleSelector({ chatId, participants }: RoleSelectorProps) {
  const [error, setError] = useState("");
  const [claimingId, setClaimingId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const handleClaim = (participantId: string) => {
    if (claimingId) return;
    setError("");
    setClaimingId(participantId);

    startTransition(async () => {
      const result = await claimParticipant(chatId, participantId);
      if (!result.success) {
        setError(result.error || "认领失败");
        setClaimingId(null);
        return;
      }

      // Preserve encryption key from URL hash
      const key = window.location.hash;
      window.location.href = `${window.location.pathname}?p=${participantId}${key}`;
    });
  };

  const claimedCount = participants.filter(p => p.claimed).length;
  const allClaimed = claimedCount === participants.length;

  return (
    <div className="w-full max-w-xl animate-scale-in">
      <div className="bg-[rgb(var(--surface))] border border-[rgb(var(--border))] rounded-2xl p-8 space-y-6">
        <div className="text-center">
          <h1 className="font-display text-2xl font-bold text-[rgb(var(--text-primary))]">
            选择你的角色
          </h1>
          <p className="mt-2 text-sm text-[rgb(var(--text-secondary))]">
            选择一个身份进入聊天 · 已选 {claimedCount}/{participants.length}
          </p>
        </div>

        {allClaimed && (
          <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-center">
            <p className="text-sm text-amber-700 dark:text-amber-300 font-medium">
              所有角色已被选择，聊天室已满。
            </p>
          </div>
        )}

        {/* Participant Grid */}
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
          {participants.map((p) => {
            const avatarUrl = `https://api.dicebear.com/9.x/notionists/svg?seed=${encodeURIComponent(p.id)}`;
            const isClaimed = p.claimed;
            const isClaiming = claimingId === p.id;

            return (
              <button
                key={p.id}
                onClick={() => !isClaimed && handleClaim(p.id)}
                disabled={isClaimed || claimingId !== null}
                className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                  isClaimed
                    ? "border-[rgb(var(--border))] opacity-40 cursor-not-allowed"
                    : isClaiming
                    ? "border-[rgb(var(--accent))] bg-[rgb(var(--accent-light))] animate-pulse"
                    : "border-[rgb(var(--border))] hover:border-[rgb(var(--accent))] hover:bg-[rgb(var(--accent-light))] hover:shadow-md cursor-pointer"
                }`}
              >
                <div className="relative">
                  <img
                    src={avatarUrl}
                    alt={`角色 ${p.id}`}
                    className="w-14 h-14 rounded-full"
                  />
                  <div
                    className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full border-2 border-[rgb(var(--surface))]"
                    style={{ backgroundColor: p.color }}
                  />
                </div>
                <span
                  className={`text-xs font-semibold truncate w-full text-center ${
                    isClaimed
                      ? "text-[rgb(var(--text-muted))]"
                      : "text-[rgb(var(--text-primary))]"
                  }`}
                >
                  {isClaimed ? "已选择" : isClaiming ? "选择中..." : p.id.slice(0, 4)}
                </span>
              </button>
            );
          })}
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
            <p className="text-sm text-red-600 dark:text-red-400 text-center">{error}</p>
          </div>
        )}
      </div>
    </div>
  );
}
