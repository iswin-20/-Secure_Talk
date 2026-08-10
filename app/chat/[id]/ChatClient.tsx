"use client";

import { useEffect, useState, useRef } from "react";
import { getChatHistory, postMessage, destroyChat } from "../actions";
import { encryptMessage, decryptMessage, encryptFile } from "@/lib/chat-crypto";
import type { EncryptedMessage, FileMetadata, Participant } from "@/lib/types";
import { upload } from "@vercel/blob/client";
import FileMessage from "./FileMessage";
import { WechatEmojiRenderer, EmojiPicker } from "wechat-emoji-renderer/react";

const isUploadEnabled = process.env.NEXT_PUBLIC_UPLOAD_ENABLE === "true";
const maxUploadSizeMB = parseInt(process.env.NEXT_PUBLIC_UPLOAD_MAX_SIZE_MB || "25", 10);
const maxUploadSizeBytes = maxUploadSizeMB * 1024 * 1024;
const blobSharedSecret = process.env.NEXT_PUBLIC_BLOB_SHARED_SECRET;

interface ChatClientProps {
  chatId: string;
  myIdentity: string;
  myColor: string;
  participants: Participant[];
  requiredAccessPassword?: string;
}

export default function ChatClient({ chatId, myIdentity, myColor, participants, requiredAccessPassword }: ChatClientProps) {
  const [accessKey, setAccessKey] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(!requiredAccessPassword);
  const [passwordInput, setPasswordInput] = useState("");
  const [authError, setAuthError] = useState("");
  const [messages, setMessages] = useState<EncryptedMessage[]>([]);
  const [decryptedContent, setDecryptedContent] = useState<Record<string, string>>({});
  const [newMessage, setNewMessage] = useState("");
  const [error, setError] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isDestroyed, setIsDestroyed] = useState(false);
  const [isDestroying, setIsDestroying] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const messageInputRef = useRef<HTMLInputElement>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  // 1. Get encryption key from URL hash
  useEffect(() => {
    const key = window.location.hash.substring(1);
    if (key) {
      setAccessKey(key);
    } else {
      setError("未找到加密密钥，聊天无法访问。");
    }
  }, []);

  // 2. Decrypt messages
  useEffect(() => {
    if (!accessKey || messages.length === 0) return;
    const decryptAll = async () => {
      const newDecryptedContent: Record<string, string> = {};
      for (const msg of messages) {
        if (msg.content && !decryptedContent[msg.timestamp]) {
          try {
            const plainText = await decryptMessage(accessKey, msg.content);
            newDecryptedContent[msg.timestamp] = plainText;
          } catch {
            newDecryptedContent[msg.timestamp] = "无法解密。";
          }
        }
      }
      if (Object.keys(newDecryptedContent).length > 0) {
        setDecryptedContent((prev) => ({ ...prev, ...newDecryptedContent }));
      }
    };
    decryptAll();
  }, [messages, accessKey, decryptedContent]);

  // 3. Poll for new messages
  const fetchHistory = async () => {
    if (!isAuthenticated || !accessKey) return;
    try {
      const result = await getChatHistory(chatId);
      if (result.messages) {
        const newMessages = result.messages;
        setMessages((prev) => {
          if (prev.length !== newMessages.length) return newMessages;
          if (prev.length === 0) return prev;
          const lastOld = prev[prev.length - 1];
          const lastNew = newMessages[newMessages.length - 1];
          if (lastOld.timestamp !== lastNew.timestamp || lastOld.content !== lastNew.content) {
            return newMessages;
          }
          return prev;
        });
      } else if (result.error) {
        setError(result.error);
      }
    } catch (e) {
      console.error("Fetch history error:", e);
    }
  };

  useEffect(() => {
    fetchHistory();
    const intervalId = setInterval(fetchHistory, 1000);
    return () => clearInterval(intervalId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, accessKey, chatId]);

  // Shift key to focus input
  useEffect(() => {
    let shiftAlone = false;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Shift") shiftAlone = true;
      else shiftAlone = false;
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === "Shift" && shiftAlone) {
        if (document.activeElement?.tagName !== "INPUT" && document.activeElement?.tagName !== "TEXTAREA") {
          messageInputRef.current?.focus();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, []);

  // Delete key to destroy chat
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Delete" && document.activeElement?.tagName !== "INPUT" && document.activeElement?.tagName !== "TEXTAREA") {
        handleDestroyChat();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // 4. Scroll to bottom
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;
    const isScrolledToBottom = container.scrollHeight - container.clientHeight <= container.scrollTop + 100;
    if (isScrolledToBottom) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, decryptedContent]);

  const handleAuth = () => {
    if (passwordInput === requiredAccessPassword) {
      setIsAuthenticated(true);
      setAuthError("");
    } else {
      setAuthError("密码错误");
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !accessKey || isSending) return;
    setIsSending(true);
    setError("");
    try {
      const encryptedContent = await encryptMessage(accessKey, newMessage);
      const message: EncryptedMessage = { sender: myIdentity, timestamp: Date.now(), content: encryptedContent };
      const result = await postMessage(chatId, message);
      if (result.success) {
        setNewMessage("");
        setMessages((prev) => [...prev, message]);
      } else {
        setError(result.error || "消息发送失败");
      }
    } catch (e) {
      console.error("Send message error:", e);
      setError("加密失败");
    } finally {
      setIsSending(false);
    }
  };

  const handleDestroyChat = async () => {
    if (confirm("确定要永久销毁此聊天吗？此操作不可撤销。")) {
      setIsDestroying(true);
      setError("");
      try {
        const result = await destroyChat(chatId);
        if (!result.success) {
          setError(result.error || "销毁失败");
        } else {
          setIsDestroyed(true);
        }
      } catch (e) {
        console.error("Destroy chat error:", e);
        setError("销毁出错");
        setIsDestroying(false);
      }
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) handleSendFile(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSendFile = async (file: File) => {
    if (!accessKey || isUploading) return;
    if (file.size > maxUploadSizeBytes) {
      setError(`文件过大 (最大 ${maxUploadSizeMB}MB)`);
      return;
    }
    setIsUploading(true);
    setUploadProgress(0);
    setError("");
    try {
      const encryptedFileBlob = await encryptFile(accessKey, file);
      const newBlob = await upload(file.name, encryptedFileBlob, {
        access: "public",
        handleUploadUrl: "/api/blob/upload",
        onUploadProgress: (progress) => setUploadProgress(progress.percentage),
        headers: { "x-blob-secret": blobSharedSecret || "" },
      });
      const encryptedFilename = await encryptMessage(accessKey, file.name);
      const encryptedType = await encryptMessage(accessKey, file.type);
      const fileMeta: FileMetadata = { url: newBlob.url, encryptedFilename, encryptedType, size: file.size };
      const message: EncryptedMessage = { sender: myIdentity, timestamp: Date.now(), file: fileMeta };
      const result = await postMessage(chatId, message);
      if (result.success) {
        setMessages((prev) => [...prev, message]);
      } else {
        setError(result.error || "文件发送失败");
      }
    } catch (e) {
      console.error("Send file error:", e);
      setError("上传或加密出错");
    } finally {
      setIsUploading(false);
    }
  };


  if (!accessKey) {
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
          <input
            type="password"
            value={passwordInput}
            onChange={(e) => setPasswordInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAuth()}
            placeholder="输入访问密码"
            className="w-full px-4 py-2.5 text-sm bg-[rgb(var(--surface-secondary))] border border-[rgb(var(--border))] rounded-xl text-[rgb(var(--text-primary))] placeholder:text-[rgb(var(--text-muted))] focus:border-[rgb(var(--accent))] focus:ring-2 focus:ring-[rgb(var(--accent))]/10 outline-none transition-all"
            autoFocus
          />
          <button
            onClick={handleAuth}
            className="w-full py-2.5 text-sm font-semibold text-white bg-[rgb(var(--accent))] hover:bg-[rgb(var(--accent-hover))] rounded-xl transition-colors"
          >
            解锁
          </button>
          {authError && <p className="text-sm text-red-500 text-center">{authError}</p>}
        </div>
      </div>
    );
  }

  return (
    <div
      className="flex flex-col bg-[rgb(var(--surface))] border border-[rgb(var(--border))] rounded-2xl shadow-xl shadow-black/5 animate-scale-in overflow-hidden"
      style={{ resize: "both", minHeight: "400px", minWidth: "520px", height: "80vh", maxWidth: "90vw", width: "100%" }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-[rgb(var(--border))] bg-[rgb(var(--surface-secondary))]">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: myColor }} />
          <h1 className="font-display text-base font-bold text-[rgb(var(--text-primary))]">安全聊天 · {participants.length}人</h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchHistory}
            className="px-3 py-1.5 text-xs font-medium text-[rgb(var(--text-secondary))] hover:text-[rgb(var(--text-primary))] hover:bg-[rgb(var(--surface-tertiary))] rounded-lg transition-colors"
          >
            刷新
          </button>
          <button
            onClick={handleDestroyChat}
            disabled={isDestroying}
            className="px-3 py-1.5 text-xs font-medium text-red-500 hover:text-white hover:bg-red-500 rounded-lg transition-colors disabled:opacity-50"
          >
            {isDestroying ? "销毁中..." : "销毁"}
          </button>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {messages.length === 0 && (
          <div className="flex items-center justify-center h-full">
            <p className="text-sm text-[rgb(var(--text-muted))]">发送第一条消息开始对话</p>
          </div>
        )}
        {messages.map((msg) => {
          const isSelf = msg.sender === myIdentity;
          const senderParticipant = participants.find((p) => p.id === msg.sender);
          const senderColor = senderParticipant?.color || "rgb(var(--text-muted))";
          const avatarUrl = `https://api.dicebear.com/9.x/notionists/svg?seed=${encodeURIComponent(msg.sender)}`;
          const selfAvatarUrl = `https://api.dicebear.com/9.x/notionists/svg?seed=${encodeURIComponent(myIdentity)}`;
          return (
          <div
            key={msg.timestamp}
            className={`flex items-end gap-2 ${isSelf ? "justify-end" : "justify-start"} animate-fade-in`}
          >
            {!isSelf && (
              <img
                src={avatarUrl}
                className="w-7 h-7 rounded-full shrink-0"
                alt=""
              />
            )}
            <div className="flex flex-col">
              {!isSelf && (
                <span
                  className="text-[10px] font-medium mb-0.5 ml-1"
                  style={{ color: senderColor }}
                >
                  {msg.sender.substring(0, 3)}
                </span>
              )}
              <div
                className={`max-w-[500px] px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                  isSelf
                    ? "bg-[rgb(var(--chat-self))] text-white rounded-br-md"
                    : "bg-[rgb(var(--chat-other))] text-[rgb(var(--text-primary))] rounded-bl-md"
                }`}
              >
                {msg.content && decryptedContent[msg.timestamp] && (
                  <WechatEmojiRenderer text={decryptedContent[msg.timestamp]} emojiSize={22} spriteUrl="/sprite.png" />
                )}
                {msg.content && !decryptedContent[msg.timestamp] && (
                  <span className="text-[rgb(var(--text-muted))]">解密中...</span>
                )}
                {msg.file && accessKey && <FileMessage fileMeta={msg.file} accessKey={accessKey} />}
              </div>
            </div>
            {isSelf && (
              <img
                src={selfAvatarUrl}
                className="w-7 h-7 rounded-full shrink-0"
                alt=""
              />
            )}
          </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 border-t border-[rgb(var(--border))] bg-[rgb(var(--surface-secondary))] relative">
        {error && (
          <div className="mb-3 px-3 py-2 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
            <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}
        {isUploading && (
          <div className="mb-3">
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs text-[rgb(var(--accent))] font-medium">上传中 {uploadProgress}%</p>
            </div>
            <div className="w-full bg-[rgb(var(--surface-tertiary))] rounded-full h-1.5">
              <div
                className="bg-[rgb(var(--accent))] h-1.5 rounded-full transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          </div>
        )}
        {showEmojiPicker && (
          <div className="absolute bottom-full left-4 right-4 mb-3 z-50 animate-slide-up">
            <EmojiPicker
              spriteUrl="/sprite.png"
              onSelectEmoji={(emoji) => {
                setNewMessage((prev) => prev + emoji.code);
              }}
            />
          </div>
        )}
        <div className="flex items-center gap-2">
          <input
            ref={messageInputRef}
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !isSending && handleSendMessage()}
            placeholder="输入消息..."
            className="flex-1 px-4 py-2.5 text-sm bg-[rgb(var(--surface))] border border-[rgb(var(--border))] rounded-xl text-[rgb(var(--text-primary))] placeholder:text-[rgb(var(--text-muted))] focus:border-[rgb(var(--accent))] focus:ring-2 focus:ring-[rgb(var(--accent))]/10 outline-none transition-all"
            disabled={isSending || isUploading}
          />
          <button
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            className={`p-2.5 rounded-xl transition-all shrink-0 ${
              showEmojiPicker
                ? "bg-[rgb(var(--accent))] text-white"
                : "text-[rgb(var(--text-muted))] hover:text-[rgb(var(--text-primary))] hover:bg-[rgb(var(--surface-tertiary))]"
            }`}
            title="表情"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15.182 15.182a4.5 4.5 0 01-6.364 0M21 12a9 9 0 11-18 0 9 9 0 0118 0zM9.75 9.75c0 .414-.168.75-.375.75S9 10.164 9 9.75 9.168 9 9.375 9s.375.336.375.75zm-.375 0h.008v.015h-.008V9.75zm5.625 0c0 .414-.168.75-.375.75s-.375-.336-.375-.75.168-.75.375-.75.375.336.375.75zm-.375 0h.008v.015h-.008V9.75z"
              />
            </svg>
          </button>
          {isUploadEnabled && (
            <>
              <input type="file" ref={fileInputRef} onChange={handleFileSelect} className="hidden" disabled={isUploading || isSending} />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading || isSending}
                className="p-2.5 rounded-xl text-[rgb(var(--text-muted))] hover:text-[rgb(var(--text-primary))] hover:bg-[rgb(var(--surface-tertiary))] transition-all shrink-0 disabled:opacity-40"
                title="发送文件"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M18.375 12.739l-7.693 7.693a4.5 4.5 0 01-6.364-6.364l10.94-10.94A3 3 0 1119.5 7.372L8.552 18.32m.009-.01l-.01.01m5.699-9.941l-7.81 7.81a1.5 1.5 0 002.112 2.13" />
                </svg>
              </button>
            </>
          )}
          <button
            onClick={handleSendMessage}
            disabled={isSending || isUploading || !newMessage.trim()}
            className="p-2.5 rounded-xl bg-[rgb(var(--accent))] text-white hover:bg-[rgb(var(--accent-hover))] disabled:opacity-40 disabled:cursor-not-allowed transition-all shrink-0"
            title="发送"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
