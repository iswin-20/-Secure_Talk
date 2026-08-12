import Link from "next/link";

export const metadata = { title: "关于 — 瞬语" };

export default function AboutPage() {
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
            <Link href="/about" style={{ fontSize: 14, fontWeight: 500, color: "#0a0a0b", textDecoration: "none" }}>关于</Link>
            <Link href="/help" style={{ fontSize: 14, fontWeight: 400, color: "#6b6b7b", textDecoration: "none" }}>帮助</Link>
          </div>
        </div>
      </nav>

      <div style={{ maxWidth: 720, margin: "0 auto", padding: "80px 40px" }}>
        <h1 style={{ fontSize: 40, fontWeight: 300, letterSpacing: "-1.6px", background: "linear-gradient(135deg, #1a1a2e, #4f46e5, #a855f7)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", marginBottom: 40 }}>
          关于 瞬语
        </h1>

        <section style={{ marginBottom: 48 }}>
          <h2 style={{ fontSize: 22, fontWeight: 500, color: "#0a0a0b", marginBottom: 16 }}>我们的使命</h2>
          <p style={{ fontSize: 16, lineHeight: 1.8, color: "#4b5563", fontWeight: 300 }}>
            瞬语 致力于为每个人提供真正安全、私密的即时通讯体验。我们相信，隐私不是特权，而是基本权利。
          </p>
        </section>

        <section style={{ marginBottom: 48 }}>
          <h2 style={{ fontSize: 22, fontWeight: 500, color: "#0a0a0b", marginBottom: 16 }}>端到端加密</h2>
          <p style={{ fontSize: 16, lineHeight: 1.8, color: "#4b5563", fontWeight: 300 }}>
            所有消息在发送端加密、接收端解密。即使我们的服务器也无法读取你的聊天内容。你的隐私在我们的服务器上只是一串无法解读的密文。
          </p>
        </section>

        <section style={{ marginBottom: 48 }}>
          <h2 style={{ fontSize: 22, fontWeight: 500, color: "#0a0a0b", marginBottom: 16 }}>我们的承诺</h2>
          <ul style={{ fontSize: 16, lineHeight: 2, color: "#4b5563", fontWeight: 300, paddingLeft: 20 }}>
            <li>不收集任何聊天内容</li>
            <li>不含任何第三方追踪器</li>
            <li>消息仅存储在本地加密数据库</li>
            <li>聊天房间可随时销毁，不留痕迹</li>
            <li>开源透明，代码可审计</li>
          </ul>
        </section>

        <section>
          <h2 style={{ fontSize: 22, fontWeight: 500, color: "#0a0a0b", marginBottom: 16 }}>技术架构</h2>
          <p style={{ fontSize: 16, lineHeight: 1.8, color: "#4b5563", fontWeight: 300 }}>
            瞬语 采用 AES-GCM 加密算法，密钥仅在客户端生成和持有。消息通过 WebSocket 实时传输，服务器仅作为加密数据的转发管道。你可以随时导出自己的加密密钥，完全掌控数据所有权。
          </p>
        </section>
      </div>
    </div>
  );
}
