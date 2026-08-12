# 瞬语 / BlinkTalk

> 端到端加密群聊 · 阅后即焚 · 视频同步 · 音乐同步

**瞬语 (BlinkTalk)** 是一个端到端加密的临时群聊应用。消息在浏览器端加密，服务器无法读取。支持多人聊天、视频同步观看、音乐同步收听。

📖 完整文档：[中文](./README.zh.md) ｜ [English](./README.en.md)

---

## 快速预览

- 🔐 **端到端加密** — AES-GCM 加密，密钥不出浏览器
- 👥 **多人聊天** — 2-15 人，每人独一无二 Notion 风格头像
- 🔥 **阅后即焚** — 消息阅读后自动销毁
- ⏱️ **自动过期** — 闲置指定时间后聊天室自动销毁
- 🔒 **访问密码** — 额外密码保护
- 🎬 **视频同步** — 一起看 YouTube/视频，进度实时同步
- 🎵 **音乐同步** — 一起听 QQ音乐+网易云，播放进度自动对齐
- 😀 **微信表情** — 内置微信风格表情选择器
- 🎭 **角色自选** — 统一链接，每人自选角色

## 技术栈

| 模块 | 技术 |
|---|---|
| 框架 | Next.js 14 (App Router) |
| 加密 | Web Crypto API (AES-GCM) |
| 存储 | SQLite |
| 部署 | PM2 + Nginx |
| 头像 | DiceBear Notionists |
| 表情 | wechat-emoji-renderer |

## 安装

```bash
git clone https://github.com/iswin-20/BlinkTalk.git
cd BlinkTalk
npm install
```

配置 `.env.local`：

```env
ADMIN_PASSWORD=your_admin_password
NEXT_PUBLIC_APP_URL=https://your-domain.com
```

```bash
npm run dev    # 开发
npm run build  # 构建
npm run start  # 生产
```

## License

MIT
