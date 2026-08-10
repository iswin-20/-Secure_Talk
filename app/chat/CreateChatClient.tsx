"use client";

import { useState, useTransition } from "react";
import { createChat, generateBurnLinkForChat } from "./actions";
import { generateKey } from "@/lib/chat-crypto";

interface ResultState {
  links: string[];
  burnLink?: string;
}

export default function CreateChatClient() {
  const [adminPassword, setAdminPassword] = useState("");
  const [accessPassword, setAccessPassword] = useState("");
  const [useAccessPassword, setUseAccessPassword] = useState(false);
  const [inactiveHours, setInactiveHours] = useState(72);
  const [participantCount, setParticipantCount] = useState(2);
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();
  const [useIpLocking, setUseIpLocking] = useState(false);
  const [result, setResult] = useState<ResultState | null>(null);
  const [copiedLink, setCopiedLink] = useState<string | null>(null);
  const [useBurnLinkToSend, setUseBurnLinkToSend] = useState(false);

  const handleCopyToClipboard = (text: string, linkType: string) => {
    navigator.clipboard.writeText(text);
    setCopiedLink(linkType);
    setTimeout(() => setCopiedLink(null), 2000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setResult(null);

    startTransition(async () => {
      const chatKey = await generateKey();
      const createResult = await createChat(
        adminPassword,
        useAccessPassword ? accessPassword : undefined,
        inactiveHours,
        useIpLocking,
        participantCount
      );

      if (!createResult.success || !createResult.links) {
        setError(createResult.error || "创建聊天失败");
        return;
      }

      const firstLink = createResult.links[0];
      const baseUrl = firstLink.split('?')[0];
      const finalLink = `${baseUrl}#${chatKey}`;

      if (useBurnLinkToSend) {
        const messageForBurnLink = useAccessPassword && accessPassword
          ? `聊天室密码：${accessPassword}，端到端加密链接如下。`
          : "端到端加密聊天链接，请妥善保存。";

        const burnLinkResult = await generateBurnLinkForChat(
          adminPassword,
          messageForBurnLink,
          finalLink
        );
        if (burnLinkResult.error || !burnLinkResult.url) {
          setError(`阅后即焚链接生成失败: ${burnLinkResult.error}`);
          setResult({ links: [finalLink] });
        } else {
          setResult({ links: [finalLink], burnLink: burnLinkResult.url });
        }
      } else {
        setResult({ links: [finalLink] });
      }
    });
  };

  if (result) {
    return (
      <div className="w-full max-w-lg animate-scale-in">
        <div className="bg-[rgb(var(--surface))] border border-[rgb(var(--border))] rounded-2xl p-8 space-y-6">
          <div>
            <h2 className="font-display text-xl font-bold text-[rgb(var(--text-primary))]">聊天已创建</h2>
            <p className="mt-1 text-sm text-red-500 font-medium">这是访问聊天室的唯一凭证，丢失后无法恢复。</p>
          </div>

          {/* Unified Link */}
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-[rgb(var(--text-muted))]">
              聊天链接（分享给所有人）
            </label>
            <p className="text-sm text-[rgb(var(--text-secondary))]">
              每个人打开后选择不同角色，先到先得。
            </p>
            <div className="flex gap-2">
              <input
                type="text"
                readOnly
                value={result.links[0]}
                className="flex-1 px-3 py-2.5 text-sm bg-[rgb(var(--surface-tertiary))] border border-[rgb(var(--border))] rounded-xl text-[rgb(var(--text-primary))]"
                onClick={(e) => (e.target as HTMLInputElement).select()}
              />
              <button
                onClick={() => handleCopyToClipboard(result.links[0], "main")}
                className="px-4 py-2.5 text-sm font-semibold text-white bg-[rgb(var(--accent))] hover:bg-[rgb(var(--accent-hover))] rounded-xl transition-colors shrink-0"
              >
                {copiedLink === "main" ? "已复制" : "复制"}
              </button>
            </div>
          </div>

          {/* Burn Link */}
          {result.burnLink && (
            <div className="space-y-2 p-4 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
              <label className="text-xs font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-300">一次性链接</label>
              <p className="text-sm text-amber-600 dark:text-amber-400">将下面链接发给对方，访问一次后即销毁。</p>
              <div className="flex gap-2">
                <input
                  type="text"
                  readOnly
                  value={result.burnLink}
                  className="flex-1 px-3 py-2.5 text-sm bg-white dark:bg-amber-900/40 border border-amber-200 dark:border-amber-700 rounded-xl"
                  onClick={(e) => (e.target as HTMLInputElement).select()}
                />
                <button
                  onClick={() => handleCopyToClipboard(result.burnLink!, "burn")}
                  className="px-4 py-2.5 text-sm font-semibold text-white bg-amber-500 hover:bg-amber-600 rounded-xl transition-colors shrink-0"
                >
                  {copiedLink === "burn" ? "已复制" : "复制"}
                </button>
              </div>
            </div>
          )}

          <button
            onClick={() => setResult(null)}
            className="w-full py-2.5 text-sm font-semibold text-[rgb(var(--accent))] hover:bg-[rgb(var(--accent-light))] rounded-xl transition-colors"
          >
            创建另一个聊天
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-lg animate-scale-in">
      <div className="bg-[rgb(var(--surface))] border border-[rgb(var(--border))] rounded-2xl p-8">
        <div className="mb-8">
          <h1 className="font-display text-2xl font-bold text-[rgb(var(--text-primary))]">创建安全聊天</h1>
          <p className="mt-1.5 text-sm text-[rgb(var(--text-secondary))]">端到端加密，阅后即焚</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Admin Password */}
          <div>
            <label className="block text-sm font-semibold text-[rgb(var(--text-primary))] mb-1.5">管理员密码</label>
            <input
              type="password"
              value={adminPassword}
              onChange={(e) => setAdminPassword(e.target.value)}
              className="w-full px-4 py-2.5 text-sm bg-[rgb(var(--surface-secondary))] border border-[rgb(var(--border))] rounded-xl text-[rgb(var(--text-primary))] placeholder:text-[rgb(var(--text-muted))] focus:border-[rgb(var(--accent))] focus:ring-2 focus:ring-[rgb(var(--accent))]/10 outline-none transition-all"
              placeholder="输入管理员密码"
              required
              autoFocus
            />
          </div>

          {/* Access Password Toggle */}
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={useAccessPassword}
              onChange={(e) => setUseAccessPassword(e.target.checked)}
              className="w-4 h-4 rounded border-[rgb(var(--border))] text-[rgb(var(--accent))] focus:ring-[rgb(var(--accent))]"
            />
            <span className="text-sm text-[rgb(var(--text-primary))]">需要聊天访问密码</span>
          </label>

          {useAccessPassword && (
            <div className="pl-7 animate-slide-up">
              <label className="block text-sm font-semibold text-[rgb(var(--text-primary))] mb-1.5">聊天访问密码</label>
              <input
                type="password"
                value={accessPassword}
                onChange={(e) => setAccessPassword(e.target.value)}
                className="w-full px-4 py-2.5 text-sm bg-[rgb(var(--surface-secondary))] border border-[rgb(var(--border))] rounded-xl text-[rgb(var(--text-primary))] placeholder:text-[rgb(var(--text-muted))] focus:border-[rgb(var(--accent))] outline-none transition-all"
                placeholder="设置访问密码"
                required={useAccessPassword}
              />
            </div>
          )}

          {/* Burn Link Toggle */}
          <div className="pt-2">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={useBurnLinkToSend}
                onChange={(e) => setUseBurnLinkToSend(e.target.checked)}
                className="w-4 h-4 rounded border-[rgb(var(--border))] text-[rgb(var(--accent))] focus:ring-[rgb(var(--accent))] mt-0.5"
              />
              <div>
                <span className="text-sm text-[rgb(var(--text-primary))]">阅后即焚链接发送</span>
                <p className="text-xs text-[rgb(var(--text-muted))] mt-0.5">生成一次性链接传递对方凭证，阅览后自动销毁。</p>
              </div>
            </label>
          </div>

          {/* IP Lock */}
          <div className="pt-2 border-t border-[rgb(var(--border))]">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={useIpLocking}
                onChange={(e) => setUseIpLocking(e.target.checked)}
                className="w-4 h-4 rounded border-[rgb(var(--border))] text-[rgb(var(--accent))] focus:ring-[rgb(var(--accent))] mt-0.5"
              />
              <div>
                <span className="text-sm font-semibold text-[rgb(var(--text-primary))]">IP 锁定</span>
                <p className="text-xs text-[rgb(var(--text-muted))] mt-0.5">每个链接只能从首次访问的 IP 打开。</p>
                {useIpLocking && (
                  <p className="text-xs text-red-500 font-medium mt-1 animate-fade-in">
                    动态 IP 或移动网络下慎用，IP 变化将永久失去访问权限。
                  </p>
                )}
              </div>
            </label>
          </div>

          {/* Participant Count */}
          <div>
            <label htmlFor="participantCount" className="block text-sm font-semibold text-[rgb(var(--text-primary))] mb-1.5">
              参与者人数
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                id="participantCount"
                value={participantCount}
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10) || 2;
                  setParticipantCount(Math.max(2, Math.min(val, 15)));
                }}
                className="w-24 px-4 py-2.5 text-sm bg-[rgb(var(--surface-secondary))] border border-[rgb(var(--border))] rounded-xl text-[rgb(var(--text-primary))] focus:border-[rgb(var(--accent))] outline-none transition-all"
                min={2}
                max={15}
                required
              />
              <span className="text-sm text-[rgb(var(--text-secondary))]">人（2-15人）</span>
            </div>
          </div>

          {/* Inactive Hours */}
          <div>
            <label htmlFor="inactiveHours" className="block text-sm font-semibold text-[rgb(var(--text-primary))] mb-1.5">
              失效时间
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                id="inactiveHours"
                value={inactiveHours}
                onChange={(e) => setInactiveHours(parseInt(e.target.value, 10) || 1)}
                className="w-24 px-4 py-2.5 text-sm bg-[rgb(var(--surface-secondary))] border border-[rgb(var(--border))] rounded-xl text-[rgb(var(--text-primary))] focus:border-[rgb(var(--accent))] outline-none transition-all"
                min={1}
                required
              />
              <span className="text-sm text-[rgb(var(--text-secondary))]">小时无消息后自动销毁</span>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="p-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={isPending}
            className="w-full py-3 text-sm font-semibold text-white bg-[rgb(var(--accent))] hover:bg-[rgb(var(--accent-hover))] rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-[rgb(var(--accent))]/20 hover:shadow-xl hover:shadow-[rgb(var(--accent))]/30"
          >
            {isPending ? "创建中..." : "创建聊天"}
          </button>
        </form>
      </div>
    </div>
  );
}
