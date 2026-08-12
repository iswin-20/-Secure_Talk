# Secure Talk 🔒 — 完整中文文档

> 端到端加密群聊 · 阅后即焚 · 角色分配 · 视频同步 · 音乐同步

**Secure Talk** 是一个端到端加密的临时群聊应用。创建一个链接，分享给朋友，每个人选择自己的角色后即可开始安全对话。消息在浏览器端加密，服务器无法读取。

---

## 功能

### 🔐 端到端加密
所有消息使用 AES-GCM 在浏览器端加密。加密密钥通过 URL hash 传递或由访问密码推导，服务器从未接触明文。只有持有正确密钥的参与者才能解密消息。

### 👥 多人群聊
支持 2-15 人同时聊天。每位参与者进入时从预设角色中选择一个身份（先到先得），并自动分配 DiceBear Notionists 风格的唯一头像和颜色标识。

### 🔥 阅后即焚
消息在被对方阅读后自动从服务器和本地删除。适合敏感对话场景。

### ⏱️ 自动过期
可设置聊天室在指定时间内没有新消息后自动销毁。过期时间从创建时开始计算。

### 🔒 访问密码
可为聊天室设置额外的访问密码保护。只有知道密码的人才能进入，密码同时用作加密密钥的衍生源。

### 🎬 视频同步（一起看）
支持三种模式：
- **YouTube** — 通过 YouTube IFrame API 实现精确同步（播放/暂停/进度/倍速）
- **视频直链** — 支持 .mp4 / .webm / .ogg / .mov / .mkv 直链播放与同步
- **任意网页** — 通过 iframe 嵌入任意网页

房间内所有人进度实时同步。播放、暂停、拖拽进度条、切换倍速都会广播给所有人。

### 🎵 音乐同步（一起听）
- **双源搜索**：网易云音乐 + QQ音乐，支持分源筛选
- **歌手筛选**：搜索后自动生成歌手标签，一键筛选
- **播放队列**：支持点歌加入队列，上下一首切换
- **歌词同步**：实时歌词滚动高亮（网易云源）
- **进度对齐**：借鉴 music-together 时间推算算法，微调播放速度（0.95x-1.05x）而非硬跳，小偏差无感对齐

### 😀 微信表情
内置微信风格表情选择器（wechat-emoji-renderer），支持 sprite 雪碧图渲染，聊天更生动。

### 其他
- **图片拖拽/粘贴上传** — 支持拖拽图片到聊天框或 Ctrl+V 粘贴
- **消息回复** — 长按消息可回复，带引用上下文
- **表情表态** — 对消息添加 👍❤️😂😮😢😡👎💩 表态
- **翻译** — 支持多语言翻译
- **GIF 搜索** — 内置 Tenor GIF 搜索，偷表情功能
- **免打扰模式** — 标签页失焦时桌面通知提醒，可关闭
- **投票销毁** — 多人投票决定销毁整个聊天室
- **解散房间** — 创建者可直接解散房间
- **删除并退出** — 删除自己所有消息并退出聊天

---

## 技术栈

| 模块 | 技术 |
|---|---|
| 框架 | Next.js 14 (App Router) |
| 加密 | Web Crypto API (AES-GCM, 256-bit) |
| 存储 | SQLite (better-sqlite3)，本地数据库 |
| 实时通信 | WebSocket（Go 服务端）+ 轮询 |
| 音乐后端 | Mineradio V3（Node.js），QQ音乐+网易云 API |
| 视频同步 | YouTube IFrame API + HTML5 Video API |
| 头像 | DiceBear Notionists |
| 表情 | wechat-emoji-renderer (sprite sheet) |
| GIF | Tenor API |
| 部署 | PM2 + Nginx + systemd |

---

## 安装与部署

### 环境要求

- Node.js 18+
- npm
- Go 1.21+（WebSocket 服务端）

### 本地开发

```bash
git clone https://github.com/iswin-20/Secure_Talk.git
cd Secure_Talk
npm install
```

创建 `.env.local`：

```env
ADMIN_PASSWORD=your_admin_password
NEXT_PUBLIC_APP_URL=http://localhost:3457
```

```bash
npm run dev    # 开发模式 (localhost:3457)
npm run build  # 构建
npm run start  # 生产模式
```

### 生产部署

```bash
# 构建
npm run build

# PM2 启动
pm2 start npm --name "talk" -- run start

# Nginx 反代
# 配置 WebSocket 代理 /ws → Go 服务
# 静态文件由 Next.js 处理
```

Go WebSocket 服务端（vt-server）需单独编译部署在 `127.0.0.1:7002`，Nginx 代理 `/ws` 路径。

---

## 使用说明

1. 访问聊天创建页面，输入管理员密码
2. 设置参与人数（2-15人）
3. 可选：设置访问密码、失效时间
4. 创建聊天 → 得到统一链接（含加密密钥的 hash）
5. 将链接分享给朋友
6. 每个人打开链接，选择未被占用的角色
7. 开始安全聊天！

### 加密链接格式

```
https://talk.vidaxl.space/chat/{chatId}#{encryptionKey}
```

- `{chatId}` — 聊天室标识
- `{encryptionKey}` — AES-GCM 256位密钥（Base64编码），通过 URL hash 传递，服务器不可见

私密房间通过访问密码 SHA-256 衍生密钥，无需 hash 传递。

---

## 项目结构

```
├── app/
│   ├── chat/[id]/        # 聊天页面
│   │   ├── ChatClient.tsx # 主聊天客户端
│   │   ├── actions.ts    # Server Actions
│   │   └── FileMessage.tsx
│   ├── layout.tsx
│   └── page.tsx          # 首页/创建页面
├── components/           # 共享组件
├── lib/
│   ├── chat-crypto.ts    # AES-GCM 加密/解密
│   ├── db.ts             # SQLite 数据库
│   └── types.ts          # TypeScript 类型
├── public/
│   ├── music-sync.html   # 音乐同步页面
│   ├── video-sync.html   # 视频同步页面
│   └── sprite.png        # 微信表情雪碧图
└── ...
```

---

## License

MIT
