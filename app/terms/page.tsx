import Link from "next/link";

export const metadata = { title: "服务条款 — 瞬语" };

export default function TermsPage() {
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
          服务条款
        </h1>

        <p style={{ fontSize: 14, color: "#9ca3af", marginBottom: 40 }}>最后更新：2026年8月</p>

        <section style={{ marginBottom: 36 }}>
          <h2 style={{ fontSize: 20, fontWeight: 500, color: "#0a0a0b", marginBottom: 12 }}>1. 接受条款</h2>
          <p style={{ fontSize: 15, lineHeight: 1.8, color: "#4b5563", fontWeight: 300 }}>
            使用 瞬语 即表示你同意本服务条款。如果你不同意这些条款，请勿使用我们的服务。
          </p>
        </section>

        <section style={{ marginBottom: 36 }}>
          <h2 style={{ fontSize: 20, fontWeight: 500, color: "#0a0a0b", marginBottom: 12 }}>2. 服务说明</h2>
          <p style={{ fontSize: 15, lineHeight: 1.8, color: "#4b5563", fontWeight: 300 }}>
            瞬语 提供端到端加密的即时通讯服务。我们致力于保护你的隐私和数据安全，但不对以下情况负责：网络中断、第三方攻击、用户自身设备安全问题导致的泄露。
          </p>
        </section>

        <section style={{ marginBottom: 36 }}>
          <h2 style={{ fontSize: 20, fontWeight: 500, color: "#0a0a0b", marginBottom: 12 }}>3. 用户行为规范</h2>
          <p style={{ fontSize: 15, lineHeight: 1.8, color: "#4b5563", fontWeight: 300 }}>
            你同意不会利用本服务从事以下行为：
          </p>
          <ul style={{ fontSize: 15, lineHeight: 2, color: "#4b5563", fontWeight: 300, paddingLeft: 20, marginTop: 8 }}>
            <li>发布违法、侵权、骚扰、诽谤或威胁性内容</li>
            <li>传播恶意软件、病毒或垃圾信息</li>
            <li>冒充他人身份或伪造信息来源</li>
            <li>试图破解、逆向工程或绕过加密机制</li>
            <li>将服务用于任何非法目的</li>
          </ul>
        </section>

        <section style={{ marginBottom: 36 }}>
          <h2 style={{ fontSize: 20, fontWeight: 500, color: "#0a0a0b", marginBottom: 12 }}>4. 账号安全</h2>
          <p style={{ fontSize: 15, lineHeight: 1.8, color: "#4b5563", fontWeight: 300 }}>
            你对自己的账号安全负责。请妥善保管密码，不要与他人共享。对于因密码泄露导致的数据泄露，瞬语 不承担责任。
          </p>
        </section>

        <section style={{ marginBottom: 36 }}>
          <h2 style={{ fontSize: 20, fontWeight: 500, color: "#0a0a0b", marginBottom: 12 }}>5. 服务终止</h2>
          <p style={{ fontSize: 15, lineHeight: 1.8, color: "#4b5563", fontWeight: 300 }}>
            我们保留在以下情况下终止或暂停服务的权利：违反服务条款、收到合法执法请求、技术或安全原因需暂停服务。
          </p>
        </section>

        <section style={{ marginBottom: 36 }}>
          <h2 style={{ fontSize: 20, fontWeight: 500, color: "#0a0a0b", marginBottom: 12 }}>6. 免责声明</h2>
          <p style={{ fontSize: 15, lineHeight: 1.8, color: "#4b5563", fontWeight: 300 }}>
            瞬语 按「现状」提供，不提供任何明示或暗示的保证。我们不保证服务不间断、无错误或完全安全。
          </p>
        </section>

        <section>
          <h2 style={{ fontSize: 20, fontWeight: 500, color: "#0a0a0b", marginBottom: 12 }}>7. 联系方式</h2>
          <p style={{ fontSize: 15, lineHeight: 1.8, color: "#4b5563", fontWeight: 300 }}>
            如有任何问题，请联系：<a href="mailto:leid0711@gmail.com" style={{ color: "#6366f1" }}>leid0711@gmail.com</a>
          </p>
        </section>
      </div>
    </div>
  );
}
