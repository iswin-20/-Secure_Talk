import Link from "next/link";

export const metadata = { title: "帮助 — 瞬语" };

export default function HelpPage() {
  return (
    <div style={{ background: "#fff", minHeight: "100vh" }}>
      <nav style={{
        position: "sticky", top: 0, zIndex: 10,
        background: "rgba(255,255,255,0.85)", backdropFilter: "blur(20px)",
        borderBottom: "1px solid rgba(0,0,0,0.04)",
      }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", padding: "0 40px", display: "flex", alignItems: "center", justifyContent: "space-between", height: 64 }}>
          <Link href="/" style={{ fontSize: 20, fontWeight: 500, letterSpacing: "-0.4px", color: "#0a0a0b", textDecoration: "none", display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 32, height: 32, background: "linear-gradient(135deg, #6366f1, #a855f7)", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 15, fontWeight: 600 }}>ST</div>
            瞬语
          </Link>
          <div style={{ display: "flex", gap: 32 }}>
            <Link href="/about" style={{ fontSize: 14, fontWeight: 400, color: "#6b6b7b", textDecoration: "none" }}>关于</Link>
            <Link href="/help" style={{ fontSize: 14, fontWeight: 500, color: "#0a0a0b", textDecoration: "none" }}>帮助</Link>
          </div>
        </div>
      </nav>

      <div style={{ maxWidth: 720, margin: "0 auto", padding: "80px 40px" }}>
        <h1 style={{ fontSize: 40, fontWeight: 300, letterSpacing: "-1.6px", background: "linear-gradient(135deg, #1a1a2e, #4f46e5, #a855f7)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", marginBottom: 40 }}>
          帮助中心
        </h1>

        <section style={{ marginBottom: 48 }}>
          <h2 style={{ fontSize: 22, fontWeight: 500, color: "#0a0a0b", marginBottom: 12 }}>如何创建聊天房间？</h2>
          <p style={{ fontSize: 16, lineHeight: 1.8, color: "#4b5563", fontWeight: 300 }}>
            登录后，在大厅顶部的创建栏输入房间名称，选择公开/私密和人数上限，点击「创建房间」。私密房间可设置访问密码，只有知道密码的人才能加入。
          </p>
        </section>

        <section style={{ marginBottom: 48 }}>
          <h2 style={{ fontSize: 22, fontWeight: 500, color: "#0a0a0b", marginBottom: 12 }}>如何加入聊天？</h2>
          <p style={{ fontSize: 16, lineHeight: 1.8, color: "#4b5563", fontWeight: 300 }}>
            在大厅浏览公开房间列表，点击「加入」。私密房间需要输入访问密码。加入后选择一个角色身份即可开始聊天。
          </p>
        </section>

        <section style={{ marginBottom: 48 }}>
          <h2 style={{ fontSize: 22, fontWeight: 500, color: "#0a0a0b", marginBottom: 12 }}>消息真的加密吗？</h2>
          <p style={{ fontSize: 16, lineHeight: 1.8, color: "#4b5563", fontWeight: 300 }}>
            是的。所有消息使用 AES-256-GCM 端到端加密，密钥仅在客户端生成。发送前加密、接收后解密，服务器全程只能看到密文。你可以在浏览器开发者工具中验证网络传输的数据都是加密状态。
          </p>
        </section>

        <section style={{ marginBottom: 48 }}>
          <h2 style={{ fontSize: 22, fontWeight: 500, color: "#0a0a0b", marginBottom: 12 }}>如何销毁聊天？</h2>
          <p style={{ fontSize: 16, lineHeight: 1.8, color: "#4b5563", fontWeight: 300 }}>
            每个聊天房间都支持投票销毁。任何人发起投票后，其他成员可在消息区上方的横幅中投票。票数达到半数以上，聊天立即销毁，所有消息不可恢复。
          </p>
        </section>

        <section style={{ marginBottom: 48 }}>
          <h2 style={{ fontSize: 22, fontWeight: 500, color: "#0a0a0b", marginBottom: 12 }}>GIF 和翻译功能</h2>
          <p style={{ fontSize: 16, lineHeight: 1.8, color: "#4b5563", fontWeight: 300 }}>
            聊天中支持搜索和发送 GIF 动图，点击「偷表情」可收藏。消息支持多语言翻译（中/EN/日/韩/法/德/西），点击消息旁的翻译图标即可。
          </p>
        </section>

        <section>
          <h2 style={{ fontSize: 22, fontWeight: 500, color: "#0a0a0b", marginBottom: 12 }}>还有问题？</h2>
          <p style={{ fontSize: 16, lineHeight: 1.8, color: "#4b5563", fontWeight: 300 }}>
            联系开发者：<a href="mailto:leid0711@gmail.com" style={{ color: "#6366f1" }}>leid0711@gmail.com</a>
          </p>
        </section>
      </div>
    </div>
  );
}
