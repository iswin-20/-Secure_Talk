// app/chat/[id]/page.tsx
import { redis } from "@/lib/redis";
import { getSessionUser } from "@/lib/auth-server";
import db from "@/lib/db";
import type { ChatData } from "@/lib/types";
import RoleSelector from "./RoleSelector";
import ChatClient from "./ChatClient";

export default async function ChatPage({ params, searchParams }: {
  params: { id: string };
  searchParams: { p?: string };
}) {
  const chatId = params.id;
  const user = getSessionUser();

  // Check if user is room creator + get access password
  let isCreator = false;
  let accessPassword: string | undefined;
  if (user) {
    const room = db.prepare('SELECT creator_id, access_password FROM rooms WHERE id = ?').get(chatId) as { creator_id: number; access_password: string | null } | undefined;
    isCreator = room?.creator_id === user.id;
    accessPassword = room?.access_password || undefined;
  }

  // Load chat data from Redis
  const raw = await redis.get(`chat:${chatId}`);
  const data: ChatData | null = raw ? (raw as ChatData) : null;

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[rgb(var(--bg))]">
        <div className="text-center p-8">
          <h1 className="text-2xl font-bold text-[rgb(var(--text-primary))] mb-2">房间不存在</h1>
          <p className="text-sm text-[rgb(var(--text-muted))] mb-4">此聊天室已过期或不存在。</p>
          <a href="/" style={{
            display: "inline-flex", alignItems: "center", gap: "4px",
            padding: "10px 20px", fontSize: "14px", fontWeight: 500,
            borderRadius: "10px", background: "linear-gradient(135deg, #4f46e5, #6366f1)",
            color: "#fff", textDecoration: "none",
            boxShadow: "0px 2px 8px rgba(99,102,241,0.25)",
          }}>← 返回大厅</a>
        </div>
      </div>
    );
  }

  const participantId = searchParams.p;

  // If user has a participant ID, show chat
  if (participantId && data.participants.find(p => p.id === participantId)?.claimed) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[rgb(var(--bg))] p-4">
        <ChatClient
          chatId={chatId}
          myIdentity={participantId}
          myColor={data.participants.find(p => p.id === participantId)?.color || "#ccc"}
          participants={data.participants}
          requiredAccessPassword={accessPassword}
          isRoomCreator={isCreator}
        />
      </div>
    );
  }

  // Check access password
  if (data.accessPasswordCipher && !searchParams.p) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[rgb(var(--bg))]">
        <div className="text-center p-8">
          <h1 className="text-2xl font-bold text-[rgb(var(--text-primary))] mb-2">需要密码</h1>
          <p className="text-sm text-[rgb(var(--text-muted))] mb-4">此房间需要密码才能进入</p>
          <a href="/" style={{
            display: "inline-flex", alignItems: "center", gap: "4px",
            padding: "10px 20px", fontSize: "14px", fontWeight: 500,
            borderRadius: "10px", background: "linear-gradient(135deg, #4f46e5, #6366f1)",
            color: "#fff", textDecoration: "none",
            boxShadow: "0px 2px 8px rgba(99,102,241,0.25)",
          }}>← 返回大厅</a>
        </div>
      </div>
    );
  }

  // Show role selector
  return (
    <div className="min-h-screen flex items-center justify-center bg-[rgb(var(--bg))] p-4">
      <RoleSelector chatId={chatId} participants={data.participants} />
    </div>
  );
}
