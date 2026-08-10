# Secure Talk 🔒

> 端到端加密群聊 · 阅后即焚 · 角色分配 · 安全第一

**Secure Talk** 是一个端到端加密的临时群聊应用。创建一个链接，分享给朋友，每个人选择自己的角色后即可开始安全对话。消息在浏览器端加密，服务器无法读取。

---

## ✨ 功能

- 🔐 **端到端加密** — 消息在发送前加密，只有持有密钥的参与者能解密
- 👥 **群聊支持** — 2-15 人同时聊天，每人拥有唯一的 Notion 风格头像
- 🎭 **角色自选** — 共享一个链接，每个人进入后选择未被占用的角色
- 🔥 **阅后即焚** — 可设置消息在阅读后自动销毁
- ⏱️ **自动过期** — 聊天室在指定时间无消息后自动销毁
- 🔒 **访问密码** — 可为聊天室设置额外的访问密码保护
- 😀 **微信表情包** — 内置微信风格表情，聊天更生动

---

## 🚀 快速开始

### 环境要求

- Node.js 18+
- npm 或 yarn

### 安装

```bash
git clone https://github.com/iswin-20/-Secure_Talk.git
cd -Secure_Talk
npm install
```

### 配置

创建 `.env.local` 文件：

```env
ADMIN_PASSWORD=your_admin_password
NEXT_PUBLIC_APP_URL=https://your-domain.com
```

### 运行

```bash
npm run dev    # 开发模式
npm run build  # 构建
npm run start  # 生产模式 (端口 3457 或其他)
```

---

## 🛠️ 技术栈

- **框架**: Next.js 14 (App Router)
- **加密**: Web Crypto API (AES-GCM)
- **存储**: SQLite (本地数据库)
- **头像**: DiceBear Notionists
- **表情**: wechat-emoji-renderer
- **部署**: PM2 + Nginx

---

## 📝 使用说明

1. 访问聊天创建页面，输入管理员密码
2. 设置参与人数（2-15人）
3. 可选：设置访问密码、失效时间
4. 创建聊天 → 得到一个统一链接
5. 将链接分享给朋友
6. 每个人打开链接选择自己的角色（先到先得）
7. 开始安全聊天！

---

## 🙏 致谢

本项目基于 **[next-secure-share](https://github.com/infrost/next-secure-share)** 衍生开发，感谢原作者 **infrost** 的优秀工作。

在原项目基础上，我们增加了以下功能：
- 多人群聊支持（原为双人聊天）
- 统一链接 + 角色自选机制
- Notion 风格随机头像
- 微信表情包集成
- 聊天框拖拽调整大小
- 全面 UI 重构（数字保险箱设计系统）
- SQLite 本地存储替代云端依赖

---

## 📄 许可证

MIT License

---

# Secure Talk 🔒

> End-to-end encrypted group chat · Burn-after-read · Role selection · Security first

**Secure Talk** is an end-to-end encrypted ephemeral group chat application. Create one link, share it with friends, and everyone picks their own role before starting a secure conversation. Messages are encrypted in the browser — the server cannot read them.

---

## ✨ Features

- 🔐 **E2E Encryption** — Messages are encrypted before sending; only participants with the key can decrypt
- 👥 **Group Chat** — 2-15 participants, each with a unique Notion-style avatar
- 🎭 **Role Selection** — One shared link; everyone picks an available role on entry
- 🔥 **Burn After Read** — Messages can self-destruct after being read
- ⏱️ **Auto Expiry** — Chat rooms auto-destroy after a configurable idle period
- 🔒 **Access Password** — Optional extra password protection for chat rooms
- 😀 **WeChat Emojis** — Built-in WeChat-style emoji picker for lively conversations

---

## 🚀 Quick Start

### Requirements

- Node.js 18+
- npm or yarn

### Installation

```bash
git clone https://github.com/iswin-20/-Secure_Talk.git
cd -Secure_Talk
npm install
```

### Configuration

Create `.env.local`:

```env
ADMIN_PASSWORD=your_admin_password
NEXT_PUBLIC_APP_URL=https://your-domain.com
```

### Run

```bash
npm run dev    # Development
npm run build  # Build
npm run start  # Production (port 3457 or custom)
```

---

## 🛠️ Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Encryption**: Web Crypto API (AES-GCM)
- **Storage**: SQLite (local database)
- **Avatars**: DiceBear Notionists
- **Emojis**: wechat-emoji-renderer
- **Deployment**: PM2 + Nginx

---

## 📝 Usage

1. Go to the chat creation page and enter the admin password
2. Set the number of participants (2-15)
3. Optional: set an access password, expiry time
4. Create chat → get a single unified link
5. Share the link with friends
6. Everyone opens the link and picks their role (first come, first served)
7. Start chatting securely!

---

## 🙏 Acknowledgments

This project is derived from **[next-secure-share](https://github.com/infrost/next-secure-share)** by **infrost**. Huge thanks to the original author for their excellent work.

Enhancements over the original project:
- Multi-person group chat (originally two-person only)
- Unified link + role selection mechanism
- Notion-style random avatars
- WeChat emoji integration
- Resizable chat window
- Complete UI redesign (Digital Safe design system)
- SQLite local storage replacing cloud dependencies

---

## 📄 License

MIT License
