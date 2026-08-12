import Link from "next/link";

export const metadata = { title: "隐私政策 — 瞬语" };

export default function PrivacyPage() {
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
        </div>
      </nav>

      <div style={{ maxWidth: 720, margin: "0 auto", padding: "80px 40px" }}>
        <h1 style={{ fontSize: 40, fontWeight: 300, letterSpacing: "-1.6px", background: "linear-gradient(135deg, #1a1a2e, #4f46e5, #a855f7)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", marginBottom: 40 }}>
          隐私政策
        </h1>

        <p style={{ fontSize: 14, color: "#9ca3af", marginBottom: 40 }}>最后更新：2026年8月</p>

        <section style={{ marginBottom: 36 }}>
          <h2 style={{ fontSize: 20, fontWeight: 500, color: "#0a0a0b", marginBottom: 12 }}>1. 我们收集什么</h2>
          <p style={{ fontSize: 15, lineHeight: 1.8, color: "#4b5563", fontWeight: 300 }}>
            <strong>我们不收集你的聊天内容。</strong>所有消息在发送前已加密，我们的服务器只存储加密后的密文，无法解密。
          </p>
          <p style={{ fontSize: 15, lineHeight: 1.8, color: "#4b5563", fontWeight: 300, marginTop: 12 }}>
            我们仅存储以下基本信息：用户名（你注册时提供的）、密码哈希值（不可逆加密）、聊天房间名称和元数据（创建时间、人数）。
          </p>
        </section>

        <section style={{ marginBottom: 36 }}>
          <h2 style={{ fontSize: 20, fontWeight: 500, color: "#0a0a0b", marginBottom: 12 }}>2. 我们如何保护数据</h2>
          <ul style={{ fontSize: 15, lineHeight: 2, color: "#4b5563", fontWeight: 300, paddingLeft: 20 }}>
            <li>消息使用 AES-256-GCM 端到端加密</li>
            <li>加密密钥仅在客户端生成，永远不会离开你的设备</li>
            <li>密码使用 scrypt 哈希存储，无法反向还原</li>
            <li>HTTPS 加密所有网络传输</li>
            <li>服务器部署在安全加固的 Linux 环境中</li>
          </ul>
        </section>

        <section style={{ marginBottom: 36 }}>
          <h2 style={{ fontSize: 20, fontWeight: 500, color: "#0a0a0b", marginBottom: 12 }}>3. 数据存储</h2>
          <p style={{ fontSize: 15, lineHeight: 1.8, color: "#4b5563", fontWeight: 300 }}>
            聊天消息存储在本地 SQLite 数据库中，每个聊天房间的数据独立加密。你可以随时通过投票销毁机制彻底删除聊天数据，删除后不可恢复。
          </p>
        </section>

        <section style={{ marginBottom: 36 }}>
          <h2 style={{ fontSize: 20, fontWeight: 500, color: "#0a0a0b", marginBottom: 12 }}>4. Cookies 和追踪</h2>
          <p style={{ fontSize: 15, lineHeight: 1.8, color: "#4b5563", fontWeight: 300 }}>
            瞬语 <strong>不含任何第三方追踪器</strong>。我们仅使用必要的 session cookie 来维持你的登录状态。该 cookie 不包含个人信息，关闭浏览器后失效（或 7 天后过期）。
          </p>
        </section>

        <section style={{ marginBottom: 36 }}>
          <h2 style={{ fontSize: 20, fontWeight: 500, color: "#0a0a0b", marginBottom: 12 }}>5. 数据共享</h2>
          <p style={{ fontSize: 15, lineHeight: 1.8, color: "#4b5563", fontWeight: 300 }}>
            <strong>我们不会出售、出租或分享你的数据给任何第三方。</strong>即使收到数据请求，我们也无法解密消息内容，因为它们以端到端加密方式存储。
          </p>
        </section>

        <section style={{ marginBottom: 36 }}>
          <h2 style={{ fontSize: 20, fontWeight: 500, color: "#0a0a0b", marginBottom: 12 }}>6. 你的权利</h2>
          <ul style={{ fontSize: 15, lineHeight: 2, color: "#4b5563", fontWeight: 300, paddingLeft: 20 }}>
            <li>随时导出你的聊天数据</li>
            <li>随时删除账号和所有关联数据</li>
            <li>随时销毁任何你参与的聊天房间</li>
            <li>无需提供真实个人信息即可使用</li>
          </ul>
        </section>

        <section style={{ marginBottom: 36 }}>
          <h2 style={{ fontSize: 20, fontWeight: 500, color: "#0a0a0b", marginBottom: 12 }}>7. 儿童隐私</h2>
          <p style={{ fontSize: 15, lineHeight: 1.8, color: "#4b5563", fontWeight: 300 }}>
            瞬语 不面向 13 岁以下儿童。我们不会故意收集儿童的个人信息。
          </p>
        </section>

        <section>
          <h2 style={{ fontSize: 20, fontWeight: 500, color: "#0a0a0b", marginBottom: 12 }}>8. 联系我们</h2>
          <p style={{ fontSize: 15, lineHeight: 1.8, color: "#4b5563", fontWeight: 300 }}>
            隐私相关问题请联系：<a href="mailto:leid0711@gmail.com" style={{ color: "#6366f1" }}>leid0711@gmail.com</a>
          </p>
        </section>
      </div>
    </div>
  );
}
