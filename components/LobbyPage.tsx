"use client";

import { useState } from "react";
import { logout } from "@/lib/auth-client";

interface Room {
  id: string;
  name: string;
  creator: string;
  creator_id: number;
  is_public: boolean;
  participant_count: number;
  created_at: number;
}

interface AuthUser {
  id: number;
  username: string;
}

export default function LobbyPage({ user, rooms }: { user: AuthUser; rooms: Room[] }) {
  const [showModal, setShowModal] = useState(false);
  const [roomName, setRoomName] = useState("");
  const [isPublic, setIsPublic] = useState(true);
  const [participantCount, setParticipantCount] = useState("5");
  const [accessPassword, setAccessPassword] = useState("");
  const [error, setError] = useState("");
  const [creating, setCreating] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [dissolvingId, setDissolvingId] = useState<string | null>(null);

  const handleLogout = async () => {
    await logout();
    window.location.href = "/auth";
  };

  const resetForm = () => {
    setRoomName("");
    setIsPublic(true);
    setParticipantCount("5");
    setAccessPassword("");
    setError("");
  };

  const handleCreateRoom = async () => {
    if (!roomName.trim()) { setError("请输入房间名称"); return; }
    setError("");
    setCreating(true);
    try {
      const res = await fetch("/api/rooms/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: roomName.trim(),
          isPublic,
          participantCount: Math.max(2, Math.min(30, parseInt(participantCount) || 5)),
          accessPassword: (!isPublic && accessPassword) ? accessPassword : undefined,
        }),
      });
      const data = await res.json();
      if (data.success) {
        // Generate encryption key: random for public, derived from password for private
        let key: string;
        if (!isPublic && accessPassword) {
          const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(accessPassword));
          key = btoa(String.fromCharCode(...new Uint8Array(hash)));
        } else {
          const { generateKey } = await import("@/lib/chat-crypto");
          key = await generateKey();
        }
        window.location.href = `/chat/${data.roomId}#${key}`;
      } else {
        setError(data.error || "创建失败");
        setCreating(false);
      }
    } catch {
      setError("创建失败");
      setCreating(false);
    }
  };

  const handleJoinRoom = (roomId: string) => {
    window.location.href = `/chat/${roomId}`;
  };

  const handleDissolveRoom = async (e: React.MouseEvent, roomId: string) => {
    e.stopPropagation();
    if (!confirm("确定要解散此房间吗？所有聊天记录将被永久删除，此操作不可撤销。")) return;
    setDissolvingId(roomId);
    try {
      const res = await fetch("/api/rooms/dissolve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomId }),
      });
      const data = await res.json();
      if (data.success) {
        window.location.reload();
      } else {
        setError(data.error || "解散失败");
        setDissolvingId(null);
      }
    } catch {
      setError("解散失败");
      setDissolvingId(null);
    }
  };

  const copyRoomLink = (e: React.MouseEvent, roomId: string) => {
    e.stopPropagation();
    const link = `https://talk.vidaxl.space/chat/${roomId}`;
    navigator.clipboard.writeText(link).then(() => {
      setCopiedId(roomId);
      setTimeout(() => setCopiedId(null), 2000);
    });
  };

  const publicRooms = rooms;
  const formatTime = (ts: number) => {
    const d = new Date(ts * 1000);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    if (diffMins < 1) return "刚刚";
    if (diffMins < 60) return `${diffMins} 分钟前`;
    if (diffHours < 24) return `${diffHours} 小时前`;
    if (diffDays < 7) return `${diffDays} 天前`;
    return d.toLocaleDateString("zh-CN");
  };

  return (
    <div style={{ background: "#fff", minHeight: "100vh" }}>
      {/* Nav */}
      <nav className="stripe-nav">
        <div style={{ maxWidth: "1100px", margin: "0 auto", padding: "0 40px", display: "flex", alignItems: "center", justifyContent: "space-between", height: "64px" }}>
          <div style={{ fontSize: "20px", fontWeight: 500, letterSpacing: "-0.4px", color: "#0a0a0b", display: "flex", alignItems: "center", gap: "10px" }}>
            <div style={{
              width: "32px", height: "32px",
              background: "linear-gradient(135deg, #6366f1, #a855f7)",
              borderRadius: "8px",
              display: "flex", alignItems: "center", justifyContent: "center",
              color: "white", fontSize: "15px", fontWeight: 600,
            }}>ST</div>
            瞬语
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "24px" }}>
            <a href="/about" style={{ fontSize: "14px", fontWeight: 400, color: "#6b6b7b", textDecoration: "none" }}>关于</a>
            <a href="/help" style={{ fontSize: "14px", fontWeight: 400, color: "#6b6b7b", textDecoration: "none" }}>帮助</a>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            <div style={{
              width: "36px", height: "36px",
              background: "linear-gradient(135deg, #6366f1, #a855f7)",
              borderRadius: "50%",
              display: "flex", alignItems: "center", justifyContent: "center",
              color: "#fff", fontSize: "14px", fontWeight: 500,
            }}>
              {user.username.charAt(0).toUpperCase()}
            </div>
            <span style={{ fontSize: "15px", fontWeight: 400, color: "#0a0a0b" }}>{user.username}</span>
            <button onClick={handleLogout} className="btn-stripe-ghost">
              退出登录
            </button>
          </div>
        </div>
      </nav>

      <div style={{ maxWidth: "1100px", margin: "0 auto", padding: "0 40px" }}>
        {/* Lobby Header */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          marginBottom: "40px", paddingTop: "40px",
        }}>
          <div>
            <h2 style={{ fontSize: "28px", fontWeight: 300, letterSpacing: "-0.56px", color: "#0a0a0b", margin: 0 }}>
              聊天大厅
            </h2>
            <p style={{ fontSize: "15px", color: "#9ca3af", marginTop: "4px", fontWeight: 300 }}>
              选择一个房间开始安全对话
            </p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="btn-stripe-primary"
            style={{ padding: "12px 28px", fontSize: "15px", fontWeight: 500, width: "auto" }}
          >
            + 创建房间
          </button>
        </div>

        {/* Error */}
        {error && (
          <div style={{ padding: "12px 16px", borderRadius: "10px", background: "#fef2f2", border: "1px solid #fecaca", marginBottom: "24px" }}>
            <p style={{ fontSize: "14px", color: "#dc2626", margin: 0 }}>{error}</p>
          </div>
        )}

        {/* Room Grid */}
        {publicRooms.length === 0 ? (
          <div style={{ textAlign: "center", padding: "100px 0" }}>
            <p style={{ fontSize: "16px", color: "#d1d5db", fontWeight: 300 }}>
              还没有房间，创建第一个吧
            </p>
          </div>
        ) : (
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))",
            gap: "20px",
            paddingBottom: "100px",
          }}>
            {publicRooms.map(room => (
              <div
                key={room.id}
                className="stripe-card"
                style={{ padding: "28px", cursor: "pointer" }}
                onClick={() => handleJoinRoom(room.id)}
              >
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "10px" }}>
                  <h3 style={{ fontSize: "18px", fontWeight: 500, letterSpacing: "-0.18px", color: "#0a0a0b", margin: 0 }}>
                    {room.name}
                  </h3>
                  <span className={room.is_public ? "room-badge-public" : "room-badge-private"}>
                    {room.is_public ? "公开" : "私密"}
                  </span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "20px", fontSize: "14px", color: "#9ca3af", fontWeight: 300, marginBottom: "18px" }}>
                  <span>👥 {room.participant_count} 人</span>
                  <span>🕐 {formatTime(room.created_at)}</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span style={{ fontSize: "13px", color: "#d1d5db", fontWeight: 300 }}>
                    {room.creator} 创建
                  </span>
                  <div style={{ display: "flex", gap: "8px" }}>
                    {room.creator_id === user.id && (
                      <button
                        onClick={(e) => handleDissolveRoom(e, room.id)}
                        disabled={dissolvingId === room.id}
                        style={{
                          padding: "9px 12px", fontSize: "13px", fontWeight: 400,
                          borderRadius: "8px", border: "1.5px solid #fca5a5",
                          background: "#fff", color: "#ef4444", cursor: "pointer",
                          fontFamily: "inherit", opacity: dissolvingId === room.id ? 0.5 : 1,
                          transition: "all 0.15s",
                        }}
                        title="解散房间"
                      >
                        {dissolvingId === room.id ? "解散中..." : "💣 解散"}
                      </button>
                    )}
                    <button
                      onClick={(e) => copyRoomLink(e, room.id)}
                      style={{
                        padding: "9px 12px", fontSize: "13px", fontWeight: 400,
                        borderRadius: "8px", border: "1px solid #e5e7eb", background: "#fff",
                        color: "#6b6b7b", cursor: "pointer", fontFamily: "inherit",
                        transition: "all 0.15s",
                      }}
                      title="复制链接"
                    >
                      {copiedId === room.id ? "✓ 已复制" : "🔗 链接"}
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleJoinRoom(room.id); }}
                      className="btn-stripe-primary"
                      style={{ padding: "9px 20px", fontSize: "14px", fontWeight: 500, borderRadius: "8px", width: "auto" }}
                    >
                      加入房间
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Room Modal */}
      {showModal && (
        <div
          style={{
            position: "fixed", inset: 0, zIndex: 50,
            background: "rgba(0,0,0,0.3)", backdropFilter: "blur(4px)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}
          onClick={() => { setShowModal(false); resetForm(); }}
        >
          <div
            style={{
              background: "#fff", borderRadius: "20px", padding: "40px",
              width: "480px", maxWidth: "90vw",
              boxShadow: "0px 20px 60px rgba(0,0,0,0.12), 0px 4px 12px rgba(0,0,0,0.06)",
            }}
            onClick={e => e.stopPropagation()}
          >
            <h3 style={{ fontSize: "24px", fontWeight: 500, letterSpacing: "-0.48px", color: "#0a0a0b", marginBottom: "8px" }}>
              创建新房间
            </h3>
            <p style={{ fontSize: "14px", color: "#9ca3af", fontWeight: 300, marginBottom: "28px" }}>
              设置房间信息，邀请朋友加入安全聊天
            </p>

            {/* Room Name — PROMINENT */}
            <div style={{ marginBottom: "24px" }}>
              <label style={{ display: "block", fontSize: "14px", fontWeight: 500, color: "#374151", marginBottom: "10px" }}>
                房间名称 <span style={{ color: "#ef4444" }}>*</span>
              </label>
              <input
                type="text"
                value={roomName}
                onChange={e => { setRoomName(e.target.value); setError(""); }}
                onKeyDown={e => e.key === "Enter" && handleCreateRoom()}
                placeholder="给你的房间起个名字..."
                autoFocus
                style={{
                  width: "100%", padding: "14px 16px",
                  fontSize: "17px", fontWeight: 400, fontFamily: "inherit",
                  color: "#0a0a0b", background: "#fafbff",
                  border: roomName ? "1.5px solid #c7d2fe" : "1.5px solid #e5e7eb",
                  borderRadius: "12px", outline: "none",
                  transition: "border-color 0.2s, box-shadow 0.2s",
                }}
                onFocus={e => e.target.style.boxShadow = "0px 0px 0px 4px rgba(99,102,241,0.08)"}
                onBlur={e => e.target.style.boxShadow = "none"}
              />
            </div>

            {/* Room Type */}
            <div style={{ marginBottom: "24px" }}>
              <label style={{ display: "block", fontSize: "14px", fontWeight: 500, color: "#374151", marginBottom: "10px" }}>
                房间类型
              </label>
              <div style={{ display: "flex", gap: "10px" }}>
                <button
                  onClick={() => setIsPublic(true)}
                  style={{
                    flex: 1, padding: "12px 16px", fontSize: "14px", fontWeight: 500,
                    borderRadius: "10px", border: isPublic ? "2px solid #6366f1" : "1.5px solid #e5e7eb",
                    background: isPublic ? "#fafbff" : "#fff",
                    color: isPublic ? "#4f46e5" : "#6b6b7b",
                    cursor: "pointer", fontFamily: "inherit",
                    transition: "all 0.15s",
                  }}
                >
                  🌐 公开房间
                </button>
                <button
                  onClick={() => setIsPublic(false)}
                  style={{
                    flex: 1, padding: "12px 16px", fontSize: "14px", fontWeight: 500,
                    borderRadius: "10px", border: !isPublic ? "2px solid #6366f1" : "1.5px solid #e5e7eb",
                    background: !isPublic ? "#fafbff" : "#fff",
                    color: !isPublic ? "#4f46e5" : "#6b6b7b",
                    cursor: "pointer", fontFamily: "inherit",
                    transition: "all 0.15s",
                  }}
                >
                  🔒 私密房间
                </button>
              </div>
            </div>

            {/* Password — only for private */}
            {!isPublic && (
              <div style={{ marginBottom: "24px" }}>
                <label style={{ display: "block", fontSize: "14px", fontWeight: 500, color: "#374151", marginBottom: "10px" }}>
                  访问密码
                </label>
                <input
                  type="text"
                  value={accessPassword}
                  onChange={e => setAccessPassword(e.target.value)}
                  placeholder="设置房间密码"
                  style={{
                    width: "100%", padding: "12px 16px",
                    fontSize: "15px", fontWeight: 400, fontFamily: "inherit",
                    color: "#0a0a0b", background: "#fff",
                    border: "1.5px solid #e5e7eb", borderRadius: "10px", outline: "none",
                  }}
                  onFocus={e => e.target.style.borderColor = "#6366f1"}
                  onBlur={e => e.target.style.borderColor = "#e5e7eb"}
                />
                <p style={{ fontSize: "12px", color: "#9ca3af", marginTop: "6px" }}>留空则不设密码</p>
              </div>
            )}

            {/* Participant Count */}
            <div style={{ marginBottom: "28px" }}>
              <label style={{ display: "block", fontSize: "14px", fontWeight: 500, color: "#374151", marginBottom: "10px" }}>
                人数上限
              </label>
              <input
                type="number"
                min={2}
                max={30}
                value={participantCount}
                onChange={e => setParticipantCount(e.target.value)}
                style={{
                  width: "100%", padding: "12px 16px",
                  fontSize: "15px", fontWeight: 400, fontFamily: "inherit",
                  color: "#0a0a0b", background: "#fff",
                  border: "1.5px solid #e5e7eb", borderRadius: "10px", outline: "none",
                }}
                onFocus={e => e.target.style.borderColor = "#6366f1"}
                onBlur={e => e.target.style.borderColor = "#e5e7eb"}
              />
            </div>

            {/* Actions */}
            {error && (
              <div style={{ padding: "10px 14px", borderRadius: "8px", background: "#fef2f2", marginBottom: "16px" }}>
                <p style={{ fontSize: "13px", color: "#dc2626", margin: 0 }}>{error}</p>
              </div>
            )}
            <div style={{ display: "flex", gap: "10px" }}>
              <button
                onClick={() => { setShowModal(false); resetForm(); }}
                style={{
                  flex: 1, padding: "13px 20px", fontSize: "14px", fontWeight: 500,
                  borderRadius: "10px", border: "1.5px solid #e5e7eb",
                  background: "#fff", color: "#6b6b7b",
                  cursor: "pointer", fontFamily: "inherit",
                }}
              >
                取消
              </button>
              <button
                onClick={handleCreateRoom}
                disabled={creating}
                className="btn-stripe-primary"
                style={{
                  flex: 2, padding: "13px 20px", fontSize: "15px", fontWeight: 500,
                  borderRadius: "10px", width: "auto", opacity: creating ? 0.6 : 1,
                }}
              >
                {creating ? "创建中..." : "创建房间"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
