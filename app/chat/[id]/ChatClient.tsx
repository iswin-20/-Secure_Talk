"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { getChatHistory, postMessage, toggleReaction, deleteMyMessages, deleteSingleMessage, voteDestroyChat, leaveChat } from "../actions";
import { translateText } from "../translate-action";
import { encryptMessage, decryptMessage } from "@/lib/chat-crypto";
import type { EncryptedMessage, Participant } from "@/lib/types";
import FileMessage from "./FileMessage";
import DarkModeToggle from "@/app/DarkModeToggle";
import { searchGifs } from "../gif-action";
import { WechatEmojiRenderer, EmojiPicker } from "wechat-emoji-renderer/react";

const maxUploadSizeMB = 25;
const maxUploadSizeBytes = maxUploadSizeMB * 1024 * 1024;

const REACTION_EMOJIS = ["👍", "❤️", "😂", "😮", "😢", "😡", "👎", "💩"];

interface ChatClientProps {
  chatId: string;
  myIdentity: string;
  myColor: string;
  participants: Participant[];
  requiredAccessPassword?: string;
  isRoomCreator?: boolean;
}

export default function ChatClient({ chatId, myIdentity, myColor, participants, requiredAccessPassword, isRoomCreator = false }: ChatClientProps) {
  const [accessKey, setAccessKey] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(!requiredAccessPassword);
  const [passwordInput, setPasswordInput] = useState("");
  const [authError, setAuthError] = useState("");
  const [messages, setMessages] = useState<EncryptedMessage[]>([]);
  const [decryptedContent, setDecryptedContent] = useState<Record<string, string>>({});
  const [decryptedImages, setDecryptedImages] = useState<Record<string, string>>({});
  const [newMessage, setNewMessage] = useState("");
  const [error, setError] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isDestroyed, setIsDestroyed] = useState(false);
  const [hasLeft, setHasLeft] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const messageInputRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [replyTo, setReplyTo] = useState<EncryptedMessage | null>(null);
  const [showReactionPicker, setShowReactionPicker] = useState<number | null>(null);
  const [destroyVotes, setDestroyVotes] = useState<string[]>([]);
  const [showDestroyMenu, setShowDestroyMenu] = useState(false);
  const [activeTab, setActiveTab] = useState<'chat' | 'video' | 'music'>('chat');
  const [dndEnabled, setDndEnabled] = useState(() => {
    if (typeof window !== "undefined") return localStorage.getItem("chat-dnd") === "true";
    return false;
  });
  const isTabFocused = useRef(true);
  const prevMsgCount = useRef(0);
  const [translations, setTranslations] = useState<Record<number, string>>({});
  const [translatingMsg, setTranslatingMsg] = useState<number | null>(null);
  const [targetLang, setTargetLang] = useState(() => {
    if (typeof window !== "undefined") return localStorage.getItem("chat-translate-lang") || "zh-CN";
    return "zh-CN";
  });
  const [showGifPicker, setShowGifPicker] = useState(false);
  const [gifSearch, setGifSearch] = useState("");
  const [gifResults, setGifResults] = useState<{ id: string; url: string; preview: string; description: string }[]>([]);
  const [stolenStickers, setStolenStickers] = useState<{ id: string; url: string; preview: string; description: string }[]>(() => {
    if (typeof window !== "undefined") try { return JSON.parse(localStorage.getItem("stolen-stickers") || "[]"); } catch { return []; }
    return [];
  });
  const dragCounterRef = useRef(0);

  // Format timestamp to Beijing time
  const formatBeijingTime = (ts: number) => {
    return new Date(ts).toLocaleTimeString("zh-CN", { timeZone: "Asia/Shanghai", hour: "2-digit", minute: "2-digit" });
  };

  // 1. Get encryption key
  useEffect(() => {
    const key = window.location.hash.substring(1);
    if (key) {
      setAccessKey(key);
    } else if (!requiredAccessPassword) {
      // Public room — derive key from roomId so all members share the same key
      crypto.subtle.digest('SHA-256', new TextEncoder().encode('vt_room_' + chatId))
        .then(hash => setAccessKey(btoa(String.fromCharCode(...new Uint8Array(hash)))));
    }
    // Private room — key comes from password (handleAuth) or hash, no error here
  }, []);

  // 2. Decrypt messages
  useEffect(() => {
    if (!accessKey || messages.length === 0) return;
    const decryptAll = async () => {
      const newDecryptedContent: Record<string, string> = {};
      const newDecryptedImages: Record<string, string> = {};
      for (const msg of messages) {
        // Skip GIF messages — their content is a preview URL, not encrypted text
        if (msg.gifUrl) continue;
        if (msg.content && !decryptedContent[msg.timestamp]) {
          try {
            const plainText = await decryptMessage(accessKey, msg.content);
            newDecryptedContent[msg.timestamp] = plainText;
          } catch {
            newDecryptedContent[msg.timestamp] = "无法解密。";
          }
        }
        if (msg.imageData && !decryptedImages[msg.timestamp]) {
          try {
            const decrypted = await decryptMessage(accessKey, msg.imageData);
            newDecryptedImages[msg.timestamp] = decrypted;
          } catch { /* skip */ }
        }
      }
      if (Object.keys(newDecryptedContent).length > 0) {
        setDecryptedContent(prev => ({ ...prev, ...newDecryptedContent }));
      }
      if (Object.keys(newDecryptedImages).length > 0) {
        setDecryptedImages(prev => ({ ...prev, ...newDecryptedImages }));
      }
    };
    decryptAll();
  }, [messages, accessKey, decryptedContent, decryptedImages]);

  // 3. Poll for new messages
  const fetchHistory = useCallback(async () => {
    if (!isAuthenticated || !accessKey) return;
    try {
      const result = await getChatHistory(chatId);
      if (result.messages) {
        const newMessages = result.messages;
        setMessages(prev => {
          if (prev.length !== newMessages.length) {
            // New messages arrived
            if (!isTabFocused.current && !dndEnabled && prev.length > 0 && newMessages.length > prev.length) {
              const latestMsg = newMessages[newMessages.length - 1];
              const senderName = latestMsg.sender.substring(0, 4);
              if (Notification.permission === "granted") {
                new Notification(`安全聊天 · ${senderName}`, {
                  body: latestMsg.content ? "新消息" : "📷 图片",
                  icon: "/favicon.ico",
                  tag: chatId,
                });
              }
            }
            return newMessages;
          }
          if (prev.length === 0) return prev;
          if (JSON.stringify(prev) !== JSON.stringify(newMessages)) return newMessages;
          return prev;
        });
        if (result.destroyVotes !== undefined) {
          setDestroyVotes(result.destroyVotes);
        }
        prevMsgCount.current = newMessages.length;
      } else if (result.error) setError(result.error);
    } catch (e) {
      console.error("Fetch history error:", e);
    }
  }, [isAuthenticated, accessKey, chatId, dndEnabled]);

  useEffect(() => {
    fetchHistory();
    const intervalId = setInterval(fetchHistory, 1000);
    return () => clearInterval(intervalId);
  }, [fetchHistory]);

  // 4. Tab focus tracking + notification permission
  useEffect(() => {
    const handleVisibility = () => { isTabFocused.current = !document.hidden; };
    document.addEventListener("visibilitychange", handleVisibility);
    if (Notification.permission === "default") {
      Notification.requestPermission();
    }
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, []);

  // Shift key to focus input
  useEffect(() => {
    let shiftAlone = false;
    const handleKeyDown = (e: KeyboardEvent) => { if (e.key === "Shift") shiftAlone = true; else shiftAlone = false; };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === "Shift" && shiftAlone) {
        if (document.activeElement?.tagName !== "INPUT" && document.activeElement?.tagName !== "TEXTAREA") {
          messageInputRef.current?.focus();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => { window.removeEventListener("keydown", handleKeyDown); window.removeEventListener("keyup", handleKeyUp); };
  }, []);

  // Delete key to vote destroy chat
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Delete" && document.activeElement?.tagName !== "INPUT" && document.activeElement?.tagName !== "TEXTAREA") {
        handleVoteDestroyChat();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [destroyVotes]);

  // Scroll to bottom
  const initialLoadDone = useRef(false);
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;
    const atBottom = container.scrollHeight - container.clientHeight <= container.scrollTop + 100;
    // Always scroll on initial load, then only when user is at bottom
    if (!initialLoadDone.current || atBottom) {
      messagesEndRef.current?.scrollIntoView({ behavior: "auto" });
    }
    initialLoadDone.current = true;
    if (messages.length === 0) initialLoadDone.current = false;
  }, [messages, decryptedContent, decryptedImages]);

  const processImage = async (file: File) => {
    if (!accessKey) return;
    if (!file.type.startsWith("image/")) { setError("仅支持图片文件"); return; }
    if (file.size > maxUploadSizeBytes) { setError(`图片过大 (最大 ${maxUploadSizeMB}MB)`); return; }

    setIsSending(true);
    try {
      const compressedDataUrl = await new Promise<string>((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
          const maxDim = 800;
          let { width, height } = img;
          if (width > maxDim || height > maxDim) {
            const ratio = Math.min(maxDim / width, maxDim / height);
            width = Math.round(width * ratio);
            height = Math.round(height * ratio);
          }
          const canvas = document.createElement("canvas");
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          if (!ctx) { reject(new Error("no context")); return; }
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL("image/jpeg", 0.5));
        };
        img.onerror = () => reject(new Error("load failed"));
        img.src = URL.createObjectURL(file);
      });

      const encryptedImage = await encryptMessage(accessKey, compressedDataUrl);
      const message: EncryptedMessage = {
        sender: myIdentity,
        timestamp: Date.now(),
        imageData: encryptedImage,
        replyTo: replyTo?.timestamp,
      };
      const result = await postMessage(chatId, message);
      if (result.success) {
        setMessages(prev => [...prev, message]);
        setReplyTo(null);
      } else setError(result.error || "图片发送失败");
    } catch (e) { setError("图片上传出错: " + (e instanceof Error ? e.message : "")); }
    finally { setIsSending(false); }
  };

  // Drag-and-drop handlers
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    dragCounterRef.current++;
    setIsDragging(true);
  };
  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    dragCounterRef.current--;
    if (dragCounterRef.current === 0) setIsDragging(false);
  };
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };
  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    dragCounterRef.current = 0;
    const file = e.dataTransfer.files?.[0];
    if (file) processImage(file);
  };

  // Ctrl+V paste support
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const item of items) {
        if (item.type.startsWith("image/")) {
          e.preventDefault();
          const file = item.getAsFile();
          if (file) processImage(file);
          break;
        }
      }
    };
    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessKey]);

  const handleAuth = async () => {
    if (passwordInput === requiredAccessPassword) {
      setIsAuthenticated(true);
      setAuthError("");
      // Derive encryption key from password using SHA-256
      const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(passwordInput));
      const key = btoa(String.fromCharCode(...new Uint8Array(hash)));
      setAccessKey(key);
    }
    else setAuthError("密码错误");
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !accessKey || isSending) return;
    setIsSending(true);
    setError("");
    try {
      const encryptedContent = await encryptMessage(accessKey, newMessage);
      const message: EncryptedMessage = {
        sender: myIdentity,
        timestamp: Date.now(),
        content: encryptedContent,
        replyTo: replyTo?.timestamp,
      };
      const result = await postMessage(chatId, message);
      if (result.success) {
        setNewMessage("");
        setReplyTo(null);
        setShowEmojiPicker(false);
        setMessages(prev => [...prev, message]);
      } else setError(result.error || "消息发送失败");
    } catch { setError("加密失败"); }
    finally { setIsSending(false); messageInputRef.current?.focus(); }
  };

  const handleSendGif = async (gifUrl: string, previewUrl: string) => {
    if (!accessKey || isSending) return;
    setIsSending(true);
    try {
      const message: EncryptedMessage = {
        sender: myIdentity,
        timestamp: Date.now(),
        gifUrl,
        content: previewUrl, // store preview URL as content for thumbnail
      };
      const result = await postMessage(chatId, message);
      if (result.success) {
        setMessages(prev => [...prev, message]);
        setShowGifPicker(false);
      }
    } catch {}
    finally { setIsSending(false); }
  };

  const handleGifSearch = async (q: string) => {
    const results = await searchGifs(q);
    setGifResults(results);
  };

  const stealSticker = (gifResult: { id: string, url: string, preview: string, description: string }) => {
    const sticker = { id: gifResult.id, url: gifResult.url, preview: gifResult.preview, description: gifResult.description };
    setStolenStickers(prev => {
      if (prev.find(s => s.id === sticker.id)) return prev; // already stolen
      const next = [sticker, ...prev].slice(0, 100); // max 100
      localStorage.setItem("stolen-stickers", JSON.stringify(next));
      return next;
    });
  };
  const [stolenMsgId, setStolenMsgId] = useState<number | null>(null);

  const handleTranslate = async (msgTimestamp: number) => {
    // Toggle: if already translated, remove it
    if (translations[msgTimestamp]) {
      setTranslations(prev => { const next = { ...prev }; delete next[msgTimestamp]; return next; });
      return;
    }
    const text = decryptedContent[msgTimestamp];
    if (!text || translatingMsg) return;
    setTranslatingMsg(msgTimestamp);
    try {
      const result = await translateText(text, targetLang);
      if (result.translation) {
        setTranslations(prev => ({ ...prev, [msgTimestamp]: result.translation! }));
      }
    } catch { /* ignore */ }
    finally { setTranslatingMsg(null); }
  };

  const handleReaction = async (msgTimestamp: number, emoji: string) => {
    // Optimistic update
    setMessages(prev => prev.map(m => {
      if (m.timestamp !== msgTimestamp) return m;
      const reactions = { ...(m.reactions || {}) };
      if (!reactions[emoji]) reactions[emoji] = [];
      const idx = reactions[emoji].indexOf(myIdentity);
      if (idx >= 0) {
        reactions[emoji] = reactions[emoji].filter(id => id !== myIdentity);
        if (reactions[emoji].length === 0) delete reactions[emoji];
      } else {
        reactions[emoji] = [...reactions[emoji], myIdentity];
      }
      return { ...m, reactions: Object.keys(reactions).length > 0 ? reactions : undefined };
    }));

    try {
      const result = await toggleReaction(chatId, msgTimestamp, emoji, myIdentity);
      if (!result.success) {
        // Revert on failure
        fetchHistory();
        setError(result.error || "表态失败");
      }
    } catch (e) {
      fetchHistory();
      console.error("Reaction error:", e);
    }
  };

  const handleDeleteSingleMessage = async (msgTimestamp: number) => {
    if (!confirm("确定要删除这条消息吗？")) return;
    try {
      const result = await deleteSingleMessage(chatId, msgTimestamp, myIdentity);
      if (result.success) {
        // Optimistic: remove from local state immediately
        setMessages(prev => prev.filter(m => m.timestamp !== msgTimestamp));
      } else {
        setError(result.error || "删除失败");
      }
    } catch (e) {
      console.error("Delete single message error:", e);
    }
  };

  const handleDeleteMyMessages = async () => {
    if (!confirm("确定要删除你发送的所有消息吗？此操作不可撤销。")) return;
    setShowDestroyMenu(false);
    try {
      const result = await deleteMyMessages(chatId, myIdentity);
      if (result.success) {
        setMessages(prev => prev.filter(m => m.sender !== myIdentity));
      } else {
        setError(result.error || "删除失败");
      }
    } catch (e) {
      console.error("Delete my messages error:", e);
    }
  };

  const handleDeleteMyMessagesAndLeave = async () => {
    if (!confirm("确定要删除你的所有消息并退出聊天吗？")) return;
    setShowDestroyMenu(false);
    try {
      const result = await leaveChat(chatId, myIdentity);
      if (result.success) {
        setMessages(prev => prev.filter(m => m.sender !== myIdentity));
        setHasLeft(true);
      } else {
        setError(result.error || "退出失败");
      }
    } catch (e) {
      console.error("Delete and leave error:", e);
    }
  };

  const handleVoteDestroyChat = async () => {
    const hasVoted = destroyVotes.includes(myIdentity);
    if (!hasVoted && !confirm("确定要投票销毁此聊天吗？达到半数以上投票将立即销毁，此操作不可撤销。")) return;
    setShowDestroyMenu(false);
    try {
      // Optimistic update
      const newVotes = hasVoted
        ? destroyVotes.filter(id => id !== myIdentity)
        : [...destroyVotes, myIdentity];
      setDestroyVotes(newVotes);

      const result = await voteDestroyChat(chatId, myIdentity);
      if (result.destroyed) {
        setIsDestroyed(true);
      } else if (!result.success) {
        setError(result.error || "投票失败");
        // Revert optimistic
        setDestroyVotes(destroyVotes);
      }
    } catch (e) {
      console.error("Vote destroy chat error:", e);
      setDestroyVotes(destroyVotes); // revert
    }
  };

  const handleCreatorDissolve = async () => {
    if (!confirm("确定要解散此房间吗？所有聊天记录将被永久删除，此操作不可撤销。")) return;
    setShowDestroyMenu(false);
    try {
      const res = await fetch("/api/rooms/dissolve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomId: chatId }),
      });
      const data = await res.json();
      if (data.success) {
        setIsDestroyed(true);
      } else {
        setError(data.error || "解散失败");
      }
    } catch {
      setError("解散失败");
    }
  };

  const findReplyMsg = (ts?: number) => ts ? messages.find(m => m.timestamp === ts) : null;

  if (!accessKey && isAuthenticated) {
    return (
      <div className="w-full max-w-lg">
        <div className="bg-[rgb(var(--surface))] border border-[rgb(var(--border))] rounded-2xl p-8 text-center">
          <p className="text-red-500 font-medium">{error}</p>
        </div>
      </div>
    );
  }

  if (isDestroyed) {
    return (
      <div className="w-full max-w-lg animate-scale-in">
        <div className="bg-[rgb(var(--surface))] border border-[rgb(var(--border))] rounded-2xl p-12 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
            <svg className="w-8 h-8 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="font-display text-xl font-bold text-[rgb(var(--text-primary))]">聊天已销毁</h1>
          <p className="mt-2 text-sm text-[rgb(var(--text-secondary))]">此会话已被永久删除。</p>
        </div>
      </div>
    );
  }

  if (hasLeft) {
    return (
      <div className="w-full max-w-lg animate-scale-in">
        <div className="bg-[rgb(var(--surface))] border border-[rgb(var(--border))] rounded-2xl p-12 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
            <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
            </svg>
          </div>
          <h1 className="font-display text-xl font-bold text-[rgb(var(--text-primary))]">已退出聊天</h1>
          <p className="mt-2 text-sm text-[rgb(var(--text-secondary))]">你的消息已清空，对话已结束。</p>
        </div>
      </div>
    );
  }

  if (error.includes("not found")) {
    return (
      <div className="w-full max-w-lg">
        <div className="bg-[rgb(var(--surface))] border border-[rgb(var(--border))] rounded-2xl p-8 text-center">
          <p className="font-semibold text-red-500">此聊天已过期或已被销毁。</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="w-full max-w-sm animate-scale-in">
        <div className="bg-[rgb(var(--surface))] border border-[rgb(var(--border))] rounded-2xl p-8 space-y-4">
          <h2 className="font-display text-xl font-bold text-[rgb(var(--text-primary))] text-center">需要密码</h2>
          <p className="text-sm text-[rgb(var(--text-secondary))] text-center">此聊天受访问密码保护。</p>
          <input type="password" value={passwordInput} onChange={e => setPasswordInput(e.target.value)} onKeyDown={e => e.key === "Enter" && handleAuth()} placeholder="输入访问密码" className="w-full px-4 py-2.5 text-sm bg-[rgb(var(--surface-secondary))] border border-[rgb(var(--border))] rounded-xl text-[rgb(var(--text-primary))] placeholder:text-[rgb(var(--text-muted))] focus:border-[rgb(var(--accent))] focus:ring-2 focus:ring-[rgb(var(--accent))]/10 outline-none transition-all" autoFocus />
          <button onClick={handleAuth} className="w-full py-2.5 text-sm font-semibold text-white bg-[rgb(var(--accent))] hover:bg-[rgb(var(--accent-hover))] rounded-xl transition-colors">解锁</button>
          {authError && <p className="text-sm text-red-500 text-center">{authError}</p>}
        </div>
      </div>
    );
  }

  return (
    <div
      className={`flex flex-col bg-[rgb(var(--surface))] border rounded-2xl shadow-xl shadow-black/5 overflow-hidden relative ${isDragging ? "border-[rgb(var(--accent))] ring-2 ring-[rgb(var(--accent))]/20" : "border-[rgb(var(--border))]"}`}
      style={{ resize: "both", minHeight: "400px", minWidth: "400px", height: "80vh", maxWidth: "95vw", width: "100%" }}
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {isDragging && (
        <div className="absolute inset-0 z-50 bg-[rgb(var(--accent))]/10 flex items-center justify-center pointer-events-none">
          <div className="bg-[rgb(var(--surface))] border-2 border-dashed border-[rgb(var(--accent))] rounded-2xl px-8 py-6 text-center">
            <p className="text-[rgb(var(--accent))] font-display font-bold text-lg">释放以上传图片</p>
            <p className="text-sm text-[rgb(var(--text-muted))] mt-1">最大 {maxUploadSizeMB}MB</p>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-[rgb(var(--border))] bg-[rgb(var(--surface-secondary))]">
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              const key = window.location.hash.substring(1);
              const link = key ? 'https://talk.vidaxl.space/chat/' + chatId + '#' + key : 'https://talk.vidaxl.space/chat/' + chatId;
              navigator.clipboard.writeText(link);
              const btn = document.activeElement;
              if (btn) { btn.textContent = '✓ 已复制'; setTimeout(() => { btn.textContent = '🔗 分享'; }, 2000); }
            }}
            className="px-3 py-1.5 text-xs font-medium rounded-lg border border-[rgb(var(--border))] text-[rgb(var(--text-secondary))] hover:text-[rgb(var(--text-primary))] hover:bg-[rgb(var(--surface-tertiary))]"
          >🔗 分享</button>
          <div className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: myColor }} />
          <h1 className="font-display text-base font-bold text-[rgb(var(--text-primary))]">安全聊天 · {participants.filter(p => p.claimed).length}/{participants.length}人</h1>
        </div>
        <div className="flex items-center gap-2">
          {/* Vote progress */}
          {destroyVotes.length > 0 && (
            <span className="text-xs text-[rgb(var(--text-muted))] bg-[rgb(var(--surface))] border border-[rgb(var(--border))] rounded-full px-2.5 py-0.5">
              销毁 {destroyVotes.length}/{Math.max(1, Math.ceil(participants.filter(p => p.claimed).length / 2))}
            </span>
          )}
          <button onClick={() => { const v = !dndEnabled; setDndEnabled(v); localStorage.setItem("chat-dnd", String(v)); }} className={`px-2 py-1.5 text-xs font-medium rounded-lg transition-colors ${dndEnabled ? "text-red-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20" : "text-[rgb(var(--text-secondary))] hover:text-[rgb(var(--text-primary))] hover:bg-[rgb(var(--surface-tertiary))]"}`} title={dndEnabled ? "免打扰中" : "开启免打扰"}>
            {dndEnabled ? (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9.143 17.082a24.248 24.248 0 003.844.148m-3.844-.148a23.856 23.856 0 01-5.455-1.31 8.964 8.964 0 002.3-5.542m10.155 6.852a23.856 23.856 0 005.456-1.31 8.964 8.964 0 01-2.3-5.542m0 0V9.75a5.25 5.25 0 00-10.5 0v2.076m10.5 0a3 3 0 01-1.818 2.76M3.75 3.75l16.5 16.5" /></svg>
            ) : (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" /></svg>
            )}
          </button>
          <DarkModeToggle />
          {/* Language selector */}
          <select
            value={targetLang}
            onChange={e => { setTargetLang(e.target.value); localStorage.setItem("chat-translate-lang", e.target.value); }}
            className="text-[11px] bg-transparent border border-[rgb(var(--border))] rounded-lg px-1.5 py-1 text-[rgb(var(--text-secondary))] cursor-pointer outline-none"
          >
            <option value="zh-CN">中</option>
            <option value="en">EN</option>
            <option value="ja">日</option>
            <option value="ko">韩</option>
            <option value="fr">法</option>
            <option value="de">德</option>
            <option value="es">西</option>
          </select>
          {/* Dropdown menu */}
          <div className="relative">
            <button onClick={() => setShowDestroyMenu(!showDestroyMenu)} className="px-2 py-1.5 text-xs font-medium text-[rgb(var(--text-secondary))] hover:text-[rgb(var(--text-primary))] hover:bg-[rgb(var(--surface-tertiary))] rounded-lg transition-colors" title="更多操作">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="5" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="12" cy="19" r="1.5"/></svg>
            </button>
            {showDestroyMenu && (
              <div className="absolute right-0 top-full mt-1 bg-[rgb(var(--surface))] border border-[rgb(var(--border))] rounded-xl shadow-xl z-50 py-1 min-w-[180px] animate-scale-in">
                {isRoomCreator ? (
                  <button onClick={handleCreatorDissolve} className="w-full text-left px-4 py-2 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                    解散房间
                  </button>
                ) : (
                  <>
                    <button onClick={handleDeleteMyMessages} className="w-full text-left px-4 py-2 text-sm text-[rgb(var(--text-primary))] hover:bg-[rgb(var(--surface-secondary))] transition-colors flex items-center gap-2">
                      <svg className="w-4 h-4 text-[rgb(var(--text-muted))]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" /></svg>
                      删除我的消息
                    </button>
                    <button onClick={handleDeleteMyMessagesAndLeave} className="w-full text-left px-4 py-2 text-sm text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors flex items-center gap-2">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
                      </svg>
                      删除并退出
                    </button>
                    <div className="border-t border-[rgb(var(--border))] my-1" />
                    <button onClick={handleVoteDestroyChat} className={`w-full text-left px-4 py-2 text-sm transition-colors flex items-center gap-2 ${destroyVotes.includes(myIdentity) ? "text-orange-500 hover:bg-orange-50 dark:hover:bg-orange-900/20" : "text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"}`}>
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" /></svg>
                      {destroyVotes.includes(myIdentity) ? "取消投票销毁" : "投票销毁聊天"}
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tab Bar */}
      <div className="flex border-b border-[rgb(var(--border))] bg-[rgb(var(--surface-secondary))]">
        {(['chat', 'video', 'music'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-2.5 text-sm font-medium transition-colors ${
              activeTab === tab
                ? 'text-[rgb(var(--accent))] border-b-2 border-[rgb(var(--accent))]'
                : 'text-[rgb(var(--text-muted))] hover:text-[rgb(var(--text-primary))]'
            }`}
          >
            {tab === 'chat' ? '💬 聊天' : tab === 'video' ? '🎬 视频' : '🎵 音乐'}
          </button>
        ))}
      </div>

      {/* Video Tab */}
      {activeTab === 'video' && (
        <iframe
          src={`/video-sync.html?room=${encodeURIComponent(chatId)}`}
          className="flex-1 w-full border-0"
          style={{ minHeight: 0 }}
        />
      )}

      {/* Music Tab */}
      {activeTab === 'music' && (
        <iframe
          src={`/music-sync.html?room=${encodeURIComponent(chatId)}`}
          className="flex-1 w-full border-0"
          style={{ minHeight: 0 }}
        />
      )}

      {/* Chat Tab */}
      {activeTab === 'chat' && (
      <div className="flex-1 flex flex-col" style={{minHeight:0}}>
      {/* Vote banner — always visible above messages */}
      {destroyVotes.length > 0 && (() => {
        const votesNeeded = Math.max(1, Math.ceil(participants.filter(p => p.claimed).length / 2));
        const votedParticipants = destroyVotes.map(vid => participants.find(p => p.id === vid)).filter(Boolean);
        const hasVoted = destroyVotes.includes(myIdentity);
        return (
          <div className="px-4 pt-3 pb-1 animate-slide-up">
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-2xl px-5 py-3 shadow-lg">
              <div className="flex items-center gap-2 mb-2">
                <svg className="w-5 h-5 text-amber-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                </svg>
                <span className="text-sm font-bold text-amber-700 dark:text-amber-400">投票销毁聊天</span>
                <span className="ml-auto text-xs font-bold text-amber-600 dark:text-amber-300">{destroyVotes.length}/{votesNeeded} 票</span>
              </div>
              <div className="w-full h-2 bg-amber-200 dark:bg-amber-800 rounded-full mb-2 overflow-hidden">
                <div className="h-full bg-amber-500 rounded-full transition-all duration-500" style={{ width: `${Math.min(100, (destroyVotes.length / votesNeeded) * 100)}%` }} />
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5 flex-1 flex-wrap">
                  {votedParticipants.map((p, i) => (
                    <div key={i} className="flex items-center gap-1 text-xs" title={p!.id}>
                      <img src={`https://api.dicebear.com/9.x/notionists/svg?seed=${encodeURIComponent(p!.id)}`} className="w-5 h-5 rounded-full ring-2 ring-amber-300 dark:ring-amber-600" alt="" />
                      <span className="text-[11px] font-medium text-amber-700 dark:text-amber-400">{p!.id.substring(0, 3)}</span>
                    </div>
                  ))}
                </div>
                <button
                  onClick={handleVoteDestroyChat}
                  className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    hasVoted
                      ? "bg-amber-100 dark:bg-amber-800 text-amber-700 dark:text-amber-300 hover:bg-amber-200 dark:hover:bg-amber-700"
                      : "bg-amber-500 text-white hover:bg-amber-600"
                  }`}
                >
                  {hasVoted ? "↩ 撤回" : "✅ 投票"}
                </button>
              </div>
            </div>
          </div>
        );
      })()}
      {destroyVotes.length === 0 && !isRoomCreator && (
        <div className="flex justify-center pt-3 pb-1">
          <button
            onClick={handleVoteDestroyChat}
            className="px-4 py-1.5 text-xs font-medium text-amber-500 hover:text-white hover:bg-amber-500 border border-amber-300 dark:border-amber-700 rounded-full transition-all"
          >
            ⚡ 发起销毁投票
          </button>
        </div>
      )}

      {/* Messages */}
      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {messages.length === 0 && destroyVotes.length === 0 && (
          <div className="flex items-center justify-center h-full">
            <p className="text-sm text-[rgb(var(--text-muted))]">发送第一条消息开始对话 · 可拖拽图片到此处上传</p>
          </div>
        )}
        {messages.map(msg => {
          const isSelf = msg.sender === myIdentity;
          const senderParticipant = participants.find(p => p.id === msg.sender);
          const senderColor = senderParticipant?.color || "rgb(var(--text-muted))";
          const avatarUrl = `https://api.dicebear.com/9.x/notionists/svg?seed=${encodeURIComponent(msg.sender)}`;
          const selfAvatarUrl = `https://api.dicebear.com/9.x/notionists/svg?seed=${encodeURIComponent(myIdentity)}`;
          const replyMsg = findReplyMsg(msg.replyTo);
          const hasReactions = msg.reactions && Object.keys(msg.reactions).length > 0;

          return (
            <div key={msg.timestamp} className="space-y-1">
              <div className={`group flex items-end gap-2 ${isSelf ? "justify-end" : "justify-start"} animate-fade-in`}>
                {!isSelf && <img src={avatarUrl} className="w-7 h-7 rounded-full shrink-0" alt="" />}
                <div className={`flex items-end gap-1 ${isSelf ? "flex-row-reverse" : "flex-row"}`}>
                  <div className="flex flex-col">
                    {!isSelf && <span className="text-[10px] font-medium mb-0.5 ml-1" style={{ color: senderColor }}>{msg.sender.substring(0, 3)}</span>}
                    <div className={`max-w-[500px] px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${isSelf ? "bg-[rgb(var(--chat-self))] text-white rounded-br-md" : "bg-[rgb(var(--chat-other))] text-[rgb(var(--text-primary))] rounded-bl-md"}`}>
                      {/* Reply context */}
                      {replyMsg && (
                        <div className={`text-xs mb-1.5 px-2 py-1 rounded-lg ${isSelf ? "bg-white/20" : "bg-[rgb(var(--surface-tertiary))]"}`}>
                          <span className="opacity-60">回复 {replyMsg.sender.substring(0, 3)}: </span>
                          <span className="opacity-80 truncate max-w-[200px] inline-block align-bottom">
                            {replyMsg.content && decryptedContent[replyMsg.timestamp] ? decryptedContent[replyMsg.timestamp].slice(0, 50) : "..."}
                          </span>
                        </div>
                      )}
                      {msg.content && !msg.gifUrl && decryptedContent[msg.timestamp] && (
                        <WechatEmojiRenderer text={decryptedContent[msg.timestamp]} emojiSize={22} spriteUrl="/sprite.png" />
                      )}
                      {msg.content && !msg.gifUrl && !decryptedContent[msg.timestamp] && <span className="text-[rgb(var(--text-muted))]">解密中...</span>}
                      {msg.imageData && decryptedImages[msg.timestamp] && (
                        <img src={decryptedImages[msg.timestamp]} alt="图片" className="max-w-[300px] rounded-lg" />
                      )}
                      {msg.imageData && !decryptedImages[msg.timestamp] && <span className="text-[rgb(var(--text-muted))]">解密图片中...</span>}
                      {msg.gifUrl && (
                        <img src={msg.gifUrl} alt="GIF" className="max-w-[300px] rounded-lg" loading="lazy" />
                      )}
                      {msg.file && accessKey && <FileMessage fileMeta={msg.file} accessKey={accessKey} />}
                    </div>
                  </div>
                  {/* Emoji reaction button — beside bubble, visible on hover */}
                  <button
                    onClick={() => setShowReactionPicker(showReactionPicker === msg.timestamp ? null : msg.timestamp)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-full hover:bg-[rgb(var(--surface-secondary))] shrink-0 mb-1"
                    title="表态"
                  >
                    <svg className="w-4 h-4 text-[rgb(var(--text-muted))]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.182 15.182a4.5 4.5 0 01-6.364 0M21 12a9 9 0 11-18 0 9 9 0 0118 0zM9.75 9.75c0 .414-.168.75-.375.75S9 10.164 9 9.75 9.168 9 9.375 9s.375.336.375.75zm-.375 0h.008v.015h-.008V9.75zm5.625 0c0 .414-.168.75-.375.75s-.375-.336-.375-.75.168-.75.375-.75.375.336.375.75zm-.375 0h.008v.015h-.008V9.75z" />
                    </svg>
                  </button>
                  {/* Steal sticker button — only for GIF messages */}
                  {msg.gifUrl && (
                    <button
                      onClick={() => {
                        stealSticker({ id: String(msg.timestamp), url: msg.gifUrl!, preview: msg.content || msg.gifUrl!, description: "GIF" });
                        setStolenMsgId(msg.timestamp);
                        setTimeout(() => setStolenMsgId(null), 1500);
                      }}
                      className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-full hover:bg-[rgb(var(--accent))]/10 shrink-0 mb-1 relative"
                      title="偷表情"
                    >
                      <svg className="w-4 h-4 text-[rgb(var(--text-muted))] hover:text-[rgb(var(--accent))]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                      </svg>
                      {stolenMsgId === msg.timestamp && (
                        <span className="absolute -top-6 left-1/2 -translate-x-1/2 text-[10px] font-medium text-[rgb(var(--accent))] whitespace-nowrap animate-fade-in">已偷!</span>
                      )}
                    </button>
                  )}
                  {/* Translate button — beside bubble, visible on hover */}
                  {msg.content && decryptedContent[msg.timestamp] && (
                    <button
                      onClick={() => handleTranslate(msg.timestamp)}
                      disabled={translatingMsg === msg.timestamp}
                      className={`opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-full shrink-0 mb-1 ${
                        translations[msg.timestamp]
                          ? "bg-[rgb(var(--accent))]/10 text-[rgb(var(--accent))]"
                          : "text-[rgb(var(--text-muted))] hover:bg-[rgb(var(--accent))]/10 hover:text-[rgb(var(--accent))]"
                      }`}
                      title={`翻译为${targetLang === 'zh-CN' ? '中文' : targetLang}`}
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 21l5.25-11.25L21 21m-9-3h7.5M3 5.621a48.474 48.474 0 016-.371m0 0c1.12 0 2.233.038 3.334.114M9 5.25V3m3.334 2.364C11.176 10.658 7.69 15.08 3 17.502m9.334-12.138c.896.061 1.82.143 2.768.248m-2.768-.248A48.474 48.474 0 0015 5.621" />
                      </svg>
                    </button>
                  )}
                  {/* Reply button — beside bubble, visible on hover */}
                  <button
                    onClick={() => setReplyTo(msg)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-full hover:bg-[rgb(var(--surface-secondary))] shrink-0 mb-1"
                    title="回复"
                  >
                    <svg className="w-4 h-4 text-[rgb(var(--text-muted))]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                    </svg>
                  </button>
                  {/* Delete button — only for own messages, visible on hover */}
                  {isSelf && (
                    <button
                      onClick={() => handleDeleteSingleMessage(msg.timestamp)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-full hover:bg-red-50 dark:hover:bg-red-900/20 shrink-0 mb-1"
                      title="删除"
                    >
                      <svg className="w-4 h-4 text-red-400 hover:text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                      </svg>
                    </button>
                  )}
                </div>
                {isSelf && <img src={selfAvatarUrl} className="w-7 h-7 rounded-full shrink-0" alt="" />}
              </div>

              {/* Timestamp — Beijing time */}
              <div className={`${isSelf ? "text-right mr-9" : "ml-9"}`}>
                <span className="text-[10px] text-[rgb(var(--text-muted))]">{formatBeijingTime(msg.timestamp)}</span>
              </div>

              {/* Translation display */}
              {translations[msg.timestamp] && (
                <div className={`${isSelf ? "text-right mr-9" : "ml-9"}`}>
                  <div className="inline-block mt-1 px-3 py-1.5 rounded-xl bg-[rgb(var(--accent))]/5 dark:bg-[rgb(var(--accent))]/10 text-[11px] leading-relaxed text-[rgb(var(--text-secondary))] italic">
                    {translations[msg.timestamp]}
                  </div>
                </div>
              )}

              {/* Reactions — always visible */}
              <div className={`flex items-center gap-1 flex-wrap ${isSelf ? "justify-end mr-9" : "justify-start ml-9"}`}>
                {hasReactions && msg.reactions && Object.entries(msg.reactions).map(([emoji, ids]) => (
                  <button key={emoji} onClick={() => handleReaction(msg.timestamp, emoji)} className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-lg text-xs transition-colors ${ids.includes(myIdentity) ? "bg-[rgb(var(--accent-light))] text-[rgb(var(--accent))]" : "bg-[rgb(var(--surface-secondary))] text-[rgb(var(--text-muted))] hover:bg-[rgb(var(--surface-tertiary))]"}`}>
                    <span>{emoji}</span>
                    <span className="font-medium">{ids.length}</span>
                  </button>
                ))}
              </div>

              {/* Reaction picker popup */}
              {showReactionPicker === msg.timestamp && (
                <div className={`flex items-center gap-1 ${isSelf ? "justify-end mr-9" : "justify-start ml-9"}`}>
                  <div className="flex gap-0.5 bg-[rgb(var(--surface))] border border-[rgb(var(--border))] rounded-xl px-1 py-0.5 shadow-lg animate-fade-in">
                    {REACTION_EMOJIS.map(emoji => {
                      const active = msg.reactions?.[emoji]?.includes(myIdentity);
                      return (
                        <button key={emoji} onClick={() => { handleReaction(msg.timestamp, emoji); setShowReactionPicker(null); }} className={`text-sm px-1.5 py-0.5 rounded-lg transition-colors ${active ? "bg-[rgb(var(--accent-light))]" : "hover:bg-[rgb(var(--surface-secondary))]"}`}>{emoji}</button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 border-t border-[rgb(var(--border))] bg-[rgb(var(--surface-secondary))] relative">
        {error && <div className="mb-3 px-3 py-2 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800"><p className="text-xs text-red-600 dark:text-red-400">{error}</p></div>}
        
        {/* Reply preview */}
        {replyTo && (
          <div className="mb-2 flex items-center gap-2 px-3 py-2 rounded-lg bg-[rgb(var(--surface))] border border-[rgb(var(--border))]">
            <svg className="w-4 h-4 text-[rgb(var(--text-muted))] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
            </svg>
            <div className="flex-1 min-w-0">
              <span className="text-xs font-medium" style={{ color: participants.find(p => p.id === replyTo.sender)?.color }}>{replyTo.sender.substring(0, 3)}</span>
              <span className="text-xs text-[rgb(var(--text-muted))] ml-1 truncate">
                {replyTo.content && decryptedContent[replyTo.timestamp] ? decryptedContent[replyTo.timestamp].slice(0, 60) : "图片"}
              </span>
            </div>
            <button onClick={() => setReplyTo(null)} className="p-1 rounded-lg hover:bg-[rgb(var(--surface-tertiary))] transition-colors">
              <svg className="w-4 h-4 text-[rgb(var(--text-muted))]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
        )}

        {showEmojiPicker && (
          <div className="absolute bottom-full left-4 right-4 mb-3 z-50 animate-slide-up">
            <EmojiPicker spriteUrl="/sprite.png" onSelectEmoji={(emoji) => { setNewMessage(prev => prev + emoji.code); }} />
          </div>
        )}

        {showGifPicker && (
          <div className="absolute bottom-full left-4 right-4 mb-3 z-50 animate-slide-up">
            <div className="bg-[rgb(var(--surface))] border border-[rgb(var(--border))] rounded-2xl shadow-xl overflow-hidden" style={{ maxHeight: "300px" }}>
              {/* Search bar */}
              <div className="p-2 border-b border-[rgb(var(--border))]">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={gifSearch}
                    onChange={e => setGifSearch(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter") handleGifSearch(gifSearch); }}
                    placeholder="搜索 GIF..."
                    className="flex-1 px-3 py-1.5 text-sm bg-[rgb(var(--surface-secondary))] rounded-lg outline-none focus:ring-2 focus:ring-[rgb(var(--accent))]"
                    autoFocus
                  />
                  <button onClick={() => handleGifSearch(gifSearch)} className="px-3 py-1.5 text-xs font-medium rounded-lg bg-[rgb(var(--accent))] text-white hover:bg-[rgb(var(--accent-hover))] transition-colors">搜索</button>
                </div>
                {/* Tabs: search results / my stickers */}
                {stolenStickers.length > 0 && (
                  <div className="flex gap-2 mt-2">
                    <button onClick={() => { setGifResults([]); handleGifSearch("trending"); }} className="text-xs px-2 py-0.5 rounded-lg bg-[rgb(var(--surface-secondary))] text-[rgb(var(--text-secondary))] hover:text-[rgb(var(--text-primary))]">🔥 热门</button>
                    <span className="text-xs px-2 py-0.5 rounded-lg bg-[rgb(var(--accent-light))] text-[rgb(var(--accent))] font-medium cursor-pointer" onClick={() => setGifResults(stolenStickers)}>我的 ({stolenStickers.length})</span>
                  </div>
                )}
              </div>
              {/* Results grid */}
              <div className="overflow-y-auto p-2" style={{ maxHeight: "200px" }}>
                <div className="grid grid-cols-4 gap-1">
                  {gifResults.map((gif, i) => (
                    <button
                      key={gif.id || i}
                      onClick={() => handleSendGif(gif.url, gif.preview || gif.url)}
                      className="relative w-full aspect-square rounded-lg overflow-hidden bg-[rgb(var(--surface-secondary))] hover:ring-2 hover:ring-[rgb(var(--accent))] transition-all"
                    >
                      <img src={gif.preview || gif.url} alt={gif.description || "GIF"} className="w-full h-full object-cover" loading="lazy" />
                    </button>
                  ))}
                  {gifResults.length === 0 && (
                    <div className="col-span-3 py-8 text-center text-sm text-[rgb(var(--text-muted))]">
                      {stolenStickers.length > 0 ? "点击「热门」加载 GIF，或查看「我的」表情包" : "输入关键词搜索 GIF"}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
        <div className="flex items-center gap-2">
          <div className="flex-1 rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--surface))] focus-within:border-[rgb(var(--accent))] focus-within:ring-2 focus-within:ring-[rgb(var(--accent))]/10 transition-all">
            <textarea ref={messageInputRef} value={newMessage} onChange={e => setNewMessage(e.target.value)} onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey && !isSending) { e.preventDefault(); handleSendMessage(); } }} placeholder={replyTo ? "输入回复..." : "输入消息... 或拖拽图片到聊天区"} className="w-full px-4 py-2.5 text-sm bg-transparent text-[rgb(var(--text-primary))] placeholder:text-[rgb(var(--text-muted))] outline-none resize-y min-h-[42px]" disabled={isSending} autoFocus rows={1} />
          </div>
          <button onClick={() => { setShowGifPicker(!showGifPicker); setShowEmojiPicker(false); if (!showGifPicker) handleGifSearch("trending"); }} className={`p-2.5 rounded-xl transition-all shrink-0 ${showGifPicker ? "bg-[rgb(var(--accent))] text-white" : "text-[rgb(var(--text-muted))] hover:text-[rgb(var(--text-primary))] hover:bg-[rgb(var(--surface-tertiary))]"}`} title="GIF">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          </button>
          <button onClick={() => { setShowEmojiPicker(!showEmojiPicker); setShowGifPicker(false); }} className={`p-2.5 rounded-xl transition-all shrink-0 ${showEmojiPicker ? "bg-[rgb(var(--accent))] text-white" : "text-[rgb(var(--text-muted))] hover:text-[rgb(var(--text-primary))] hover:bg-[rgb(var(--surface-tertiary))]"}`} title="表情">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15.182 15.182a4.5 4.5 0 01-6.364 0M21 12a9 9 0 11-18 0 9 9 0 0118 0zM9.75 9.75c0 .414-.168.75-.375.75S9 10.164 9 9.75 9.168 9 9.375 9s.375.336.375.75zm-.375 0h.008v.015h-.008V9.75zm5.625 0c0 .414-.168.75-.375.75s-.375-.336-.375-.75.168-.75.375-.75.375.336.375.75zm-.375 0h.008v.015h-.008V9.75z" /></svg>
          </button>
          <button onClick={handleSendMessage} disabled={isSending || !newMessage.trim()} className="p-2.5 rounded-xl bg-[rgb(var(--accent))] text-white hover:bg-[rgb(var(--accent-hover))] disabled:opacity-40 disabled:cursor-not-allowed transition-all shrink-0" title="发送">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" /></svg>
          </button>
        </div>
      </div>
      </div>
      )}
    </div>
  );
}
