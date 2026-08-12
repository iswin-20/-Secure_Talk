# Secure Talk 🔒 — Full Documentation

> End-to-end encrypted group chat · Burn-after-read · Video sync · Music sync

**Secure Talk** is an end-to-end encrypted ephemeral group chat application. Create a link, share it with friends, and everyone picks a role before starting a secure conversation. Messages are encrypted in the browser — the server cannot read them.

📖 [中文文档](./README.zh.md)

---

## Features

### 🔐 End-to-End Encryption
All messages are encrypted with AES-GCM in the browser. The encryption key is passed via URL hash or derived from an access password — the server never sees plaintext. Only participants with the correct key can decrypt messages.

### 👥 Group Chat
Supports 2-15 simultaneous participants. Each person picks a role on entry (first come, first served) and gets a unique DiceBear Notionists avatar with a distinct color identifier.

### 🔥 Burn After Read
Messages are automatically deleted from the server and local storage after being read. Ideal for sensitive conversations.

### ⏱️ Auto Expiry
Chat rooms can be set to auto-destroy after a configurable idle period. The expiry timer starts from room creation.

### 🔒 Access Password
Optional additional password protection for chat rooms. The password also serves as the source for deriving the encryption key via SHA-256.

### 🎬 Video Sync (Watch Together)
Three modes supported:
- **YouTube** — Precise sync via YouTube IFrame API (play/pause/seek/speed)
- **Direct Video Links** — .mp4 / .webm / .ogg / .mov / .mkv playback and sync
- **Any Webpage** — Embed any URL via iframe

Playback state (play, pause, seek, speed) is broadcast to all room members in real time.

### 🎵 Music Sync (Listen Together)
- **Dual-source Search** — NetEase Cloud Music + QQ Music, with per-source filtering
- **Artist Filter** — Auto-generated artist tags after search for one-click filtering
- **Play Queue** — Add songs to queue, skip to previous/next
- **Lyrics Sync** — Real-time scrolling lyrics with current-line highlighting (NetEase)
- **Drift Correction** — Micro-adjusts playback speed (0.95x-1.05x) for seamless alignment, no hard jumps

### 😀 WeChat Emojis
Built-in WeChat-style emoji picker using wechat-emoji-renderer with sprite sheet rendering.

### Other Features
- **Image Upload** — Drag-and-drop or Ctrl+V paste images into chat
- **Message Replies** — Reply with quoted context
- **Emoji Reactions** — Add 👍❤️😂😮😢😡👎💩 reactions to messages
- **Translation** — Multi-language message translation
- **GIF Search** — Built-in Tenor GIF search with sticker stealing
- **Do Not Disturb** — Desktop notifications when tab is inactive, can be disabled
- **Vote to Destroy** — Multi-person voting to destroy the entire chat room
- **Creator Dissolve** — Room creator can dissolve the room directly
- **Delete and Leave** — Delete all your messages and exit the chat

---

## Tech Stack

| Module | Technology |
|---|---|
| Framework | Next.js 14 (App Router) |
| Encryption | Web Crypto API (AES-GCM, 256-bit) |
| Storage | SQLite (better-sqlite3), local database |
| Real-time | WebSocket (Go server) + polling |
| Music Backend | Mineradio V3 (Node.js), QQ Music + NetEase APIs |
| Video Sync | YouTube IFrame API + HTML5 Video API |
| Avatars | DiceBear Notionists |
| Emojis | wechat-emoji-renderer (sprite sheet) |
| GIF | Tenor API |
| Deployment | PM2 + Nginx + systemd |

---

## Installation & Deployment

### Requirements

- Node.js 18+
- npm
- Go 1.21+ (WebSocket server)

### Local Development

```bash
git clone https://github.com/iswin-20/Secure_Talk.git
cd Secure_Talk
npm install
```

Create `.env.local`:

```env
ADMIN_PASSWORD=your_a...nnpm run dev    # Development (localhost:3457)
npm run build  # Build
npm run start  # Production
```

### Production Deployment

```bash
# Build
npm run build

# PM2
pm2 start npm --name "talk" -- run start

# Nginx reverse proxy
# Configure WebSocket proxy /ws → Go server
# Static files handled by Next.js
```

The Go WebSocket server (vt-server) must be compiled separately and deployed at `127.0.0.1:7002`, with Nginx proxying the `/ws` path.

---

## Usage

1. Visit the creation page and enter the admin password
2. Set participant count (2-15)
3. Optional: access password, expiry time
4. Create → get a unified link (with encryption key in hash)
5. Share the link
6. Each person opens the link and picks an available role
7. Start chatting!

### Encrypted Link Format

```
https://talk.vidaxl.space/chat/{chatId}#{encryptionKey}
```

- `{chatId}` — Room identifier
- `{encryptionKey}` — AES-GCM 256-bit key (Base64), passed via URL hash, invisible to server

Private rooms derive the key from the access password via SHA-256 — no hash needed.

---

## Project Structure

```
├── app/
│   ├── chat/[id]/        # Chat page
│   │   ├── ChatClient.tsx # Main chat client
│   │   ├── actions.ts    # Server Actions
│   │   └── FileMessage.tsx
│   ├── layout.tsx
│   └── page.tsx          # Home/creation page
├── components/           # Shared components
├── lib/
│   ├── chat-crypto.ts    # AES-GCM encrypt/decrypt
│   ├── db.ts             # SQLite database
│   └── types.ts          # TypeScript types
├── public/
│   ├── music-sync.html   # Music sync page
│   ├── video-sync.html   # Video sync page
│   └── sprite.png        # WeChat emoji sprite sheet
└── ...
```

---

## License

MIT
