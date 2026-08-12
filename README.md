# Secure Talk 🔒

> End-to-end encrypted group chat · 端到端加密群聊  
> Burn-after-read · 阅后即焚 · Role selection · 角色分配

**Secure Talk** is an end-to-end encrypted ephemeral group chat. Create one link, share it, everyone picks a role, start chatting. Messages are encrypted in the browser — the server cannot read them.

端到端加密的临时群聊应用。创建一个链接分享给朋友，每人选择角色后即可安全对话。消息在浏览器端加密，服务器无法读取。

---

## ✨ 功能 / Features

- 🔐 **E2E Encryption / 端到端加密** — Encrypted before sending; only key-holders can decrypt / 消息发送前加密，只有持密钥者能解密
- 👥 **Group Chat / 群聊** — 2-15 people, each with unique Notion-style avatar / 每人 Notion 风格唯一头像
- 🎭 **Role Selection / 角色自选** — One link, everyone picks an available role / 统一链接，先到先得选角色
- 🔥 **Burn After Read / 阅后即焚** — Messages self-destruct after being read
- ⏱️ **Auto Expiry / 自动过期** — Rooms destroy after configurable idle time / 指定时间无消息后自动销毁
- 🔒 **Access Password / 访问密码** — Optional extra password protection
- 😀 **WeChat Emojis / 微信表情** — Built-in emoji picker / 内置微信风格表情选择器
- 🎬 **Video Sync / 视频同步** — Watch YouTube/videos together in sync / 一起看视频，进度实时同步
- 🎵 **Music Sync / 音乐同步** — Listen together with QQ Music + NetEase / 一起听歌，QQ音乐+网易云双源

---

## 🚀 快速开始 / Quick Start

### 环境要求 / Requirements

- Node.js 18+
- npm or yarn

### 安装 / Installation

```bash
git clone https://github.com/iswin-20/-Secure_Talk.git
cd -Secure_Talk
npm install
```

### 配置 / Configuration

Create `.env.local`:

```env
ADMIN_PASSWORD=your_admin_password
NEXT_PUBLIC_APP_URL=https://your-domain.com
```

### 运行 / Run

```bash
npm run dev    # 开发 / Development
npm run build  # 构建 / Build
npm run start  # 生产 / Production (port 3457)
```

---

## 🛠️ 技术栈 / Tech Stack

| 用途 / Use | 技术 / Tech |
|---|---|
| Framework / 框架 | Next.js 14 (App Router) |
| Encryption / 加密 | Web Crypto API (AES-GCM) |
| Storage / 存储 | SQLite (local) |
| Avatars / 头像 | DiceBear Notionists |
| Emojis / 表情 | wechat-emoji-renderer |
| Deployment / 部署 | PM2 + Nginx |

---

## 📝 使用说明 / Usage

1. Visit creation page → enter admin password / 访问创建页面 → 输入管理员密码
2. Set participant count (2-15) / 设置参与人数
3. Optional: access password, expiry time / 可选：访问密码、失效时间
4. Create → get one link / 创建 → 得到统一链接
5. Share the link / 分享链接
6. Everyone picks a role / 每人选择角色
7. Start chatting! / 开始聊天！

---

## 🙏 致谢 / Acknowledgments

Derived from **[next-secure-share](https://github.com/infrost/next-secure-share)** by **infrost**. Huge thanks!

基于 **infrost** 的 next-secure-share 衍生开发，感谢原作者。

### 增强功能 / Enhancements

- Multi-person group chat (originally 2-person) / 多人群聊（原双人）
- Unified link + role selection / 统一链接+角色自选
- Notion-style avatars / Notion 风格头像
- WeChat emoji integration / 微信表情集成
- Resizable chat + Video/Music sync / 拖拽聊天+视频音乐同步
- Complete UI redesign / 全面 UI 重构
- SQLite replacing cloud storage / SQLite 替代云端依赖

---

## 📄 License / 许可证

MIT
