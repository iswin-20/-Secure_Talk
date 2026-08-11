"use client";

import { useState, useTransition } from "react";
import { claimParticipant, reclaimParticipant } from "../actions";
import type { Participant } from "@/lib/types";

interface RoleSelectorProps {
  chatId: string;
  participants: Participant[];
}

export default function RoleSelector({ chatId, participants }: RoleSelectorProps) {
  const [error, setError] = useState("");
  const [claimingId, setClaimingId] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const [showDialog, setShowDialog] = useState<{ id: string; isReclaim: boolean } | null>(null);
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");

  const handleClaimClick = (p: Participant) => {
    if (claimingId) return;
    setError("");
    // If claimed but has password, it's a reclaim scenario
    if (p.claimed && p.passwordHash) {
      setShowDialog({ id: p.id, isReclaim: true });
    } else if (!p.claimed) {
      // New claim — optionally set password
      setShowDialog({ id: p.id, isReclaim: false });
    }
  };

  const handleConfirm = () => {
    if (!showDialog) return;
    const { id, isReclaim } = showDialog;
    
    if (isReclaim && !password.trim()) {
      setError("请输入密码");
      return;
    }

    setClaimingId(id);
    setError("");

    startTransition(async () => {
      let result;
      if (isReclaim) {
        result = await reclaimParticipant(chatId, id, password);
      } else {
        result = await claimParticipant(chatId, id, password || undefined, name || undefined);
      }
      if (!result.success) {
        setError(result.error || "认领失败");
        setClaimingId(null);
        return;
      }
      const key = window.location.hash;
      window.location.href = `${window.location.pathname}?p=${id}${key}`;
    });
  };

  const claimedCount = participants.filter(p => p.claimed).length;

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

        {claimedCount === participants.length && !participants.some(p => p.claimed && p.passwordHash) && (
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
            const isReclaimable = isClaimed && !!p.passwordHash;
            const isClaiming = claimingId === p.id;
            const clickable = !isClaimed || isReclaimable;

            return (
              <button
                key={p.id}
                onClick={() => clickable && handleClaimClick(p)}
                disabled={!clickable || claimingId !== null}
                className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                  isClaimed && !isReclaimable
                    ? "border-gray-200 bg-gray-50 opacity-60 cursor-not-allowed"
                    : isClaiming
                    ? "border-[rgb(var(--accent))] bg-[rgb(var(--accent-light))] animate-pulse"
                    : isReclaimable
                    ? "border-amber-400 bg-amber-50 dark:bg-amber-900/10 hover:border-[rgb(var(--accent))] hover:bg-[rgb(var(--accent-light))] cursor-pointer"
                    : "border-[rgb(var(--border))] hover:border-[rgb(var(--accent))] hover:bg-[rgb(var(--accent-light))] hover:shadow-md cursor-pointer"
                }`}
              >
                <div className="relative">
                  <img
                    src={avatarUrl}
                    alt={`角色 ${p.id}`}
                    className={`w-14 h-14 rounded-full ${isClaimed && !isReclaimable ? "grayscale" : ""}`}
                  />
                  <div
                    className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full border-2 border-[rgb(var(--surface))]"
                    style={{ backgroundColor: isClaimed && !isReclaimable ? "#9ca3af" : p.color }}
                  />
                </div>
                <span
                  className={`text-xs font-semibold truncate w-full text-center ${
                    isClaimed && !isReclaimable
                      ? "text-gray-400 line-through"
                      : "text-[rgb(var(--text-primary))]"
                  }`}
                >
                  {isClaimed && !isReclaimable
                    ? p.claimedBy ? `${p.claimedBy.slice(0, 4)} · 已选` : "已被选择"
                    : isReclaimable
                    ? `🔒 ${p.claimedBy ? p.claimedBy.slice(0, 4) : p.id.slice(0, 4)}`
                    : isClaiming
                    ? "选择中..."
                    : p.id.slice(0, 4)}
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

        {/* Password Dialog */}
        {showDialog && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 animate-fade-in" onClick={() => { setShowDialog(null); setPassword(""); setName(""); setError(""); }}>
            <div className="bg-[rgb(var(--surface))] border border-[rgb(var(--border))] rounded-2xl p-6 shadow-2xl w-full max-w-sm mx-4 animate-scale-in" onClick={e => e.stopPropagation()}>
              <h2 className="text-lg font-bold text-[rgb(var(--text-primary))] mb-1">
                {showDialog.isReclaim ? "密码验证" : "设置角色"}
              </h2>
              <p className="text-sm text-[rgb(var(--text-secondary))] mb-4">
                {showDialog.isReclaim
                  ? "此角色已设置密码，输入密码即可重新进入"
                  : "可选：设置昵称和密码，退出后可凭密码重新进入"}
              </p>
              
              {!showDialog.isReclaim && (
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="昵称（可选）"
                  className="w-full px-3 py-2 text-sm border border-[rgb(var(--border))] rounded-xl mb-3 outline-none focus:border-[rgb(var(--accent))] focus:ring-2 focus:ring-[rgb(var(--accent))]/10"
                  autoFocus
                  onKeyDown={e => e.key === "Enter" && handleConfirm()}
                />
              )}
              
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder={showDialog.isReclaim ? "输入密码" : "设置密码（可选，不设则不可恢复）"}
                className="w-full px-3 py-2 text-sm border border-[rgb(var(--border))] rounded-xl outline-none focus:border-[rgb(var(--accent))] focus:ring-2 focus:ring-[rgb(var(--accent))]/10"
                autoFocus={showDialog.isReclaim}
                onKeyDown={e => e.key === "Enter" && handleConfirm()}
              />
              
              <div className="flex gap-2 mt-4">
                <button
                  onClick={() => { setShowDialog(null); setPassword(""); setName(""); setError(""); }}
                  className="flex-1 py-2 text-sm font-medium rounded-xl border border-[rgb(var(--border))] text-[rgb(var(--text-secondary))] hover:bg-[rgb(var(--surface-secondary))] transition-colors"
                >
                  取消
                </button>
                <button
                  onClick={handleConfirm}
                  disabled={claimingId !== null}
                  className="flex-1 py-2 text-sm font-medium rounded-xl bg-[rgb(var(--accent))] text-white hover:bg-[rgb(var(--accent-hover))] disabled:opacity-40 transition-colors"
                >
                  确认
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
