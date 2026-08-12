"use client";

import { useState } from "react";
import { login, register } from "@/lib/auth-client";
import { useRouter } from "next/navigation";

export default function AuthForm() {
  const router = useRouter();
  const [authUsername, setAuthUsername] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [error, setError] = useState("");
  const [isRegistering, setIsRegistering] = useState(false);

  const handleLogin = async () => {
    if (!authUsername.trim() || !authPassword.trim()) {
      setError("请填写用户名和密码");
      return;
    }
    setError("");
    const result = await login(authUsername, authPassword);
    if (result.success && result.user) {
      router.push("/");
      router.refresh();
    } else {
      setError(result.error || "登录失败");
    }
  };

  const handleRegister = async () => {
    if (!authUsername.trim() || !authPassword.trim()) {
      setError("请填写用户名和密码");
      return;
    }
    if (authPassword.length < 6) {
      setError("密码至少需要6个字符");
      return;
    }
    setError("");
    const result = await register(authUsername, authPassword);
    if (result.success) {
      router.push("/");
      router.refresh();
    } else {
      setError(result.error || "注册失败");
    }
  };

  return (
    <div style={{ background: "#fff", minHeight: "100vh" }}>
      {/* Nav */}
      <nav className="stripe-nav">
        <div style={{ maxWidth: "1100px", margin: "0 auto", padding: "0 40px", display: "flex", alignItems: "center", justifyContent: "space-between", height: "64px" }}>
          <a href="/" style={{ fontSize: "20px", fontWeight: 500, letterSpacing: "-0.4px", color: "#0a0a0b", display: "flex", alignItems: "center", gap: "10px", textDecoration: "none" }}>
            <div style={{
              width: "32px", height: "32px",
              background: "linear-gradient(135deg, #6366f1, #a855f7)",
              borderRadius: "8px",
              display: "flex", alignItems: "center", justifyContent: "center",
              color: "white", fontSize: "15px", fontWeight: 600,
            }}>ST</div>
            瞬语
          </a>
          <div style={{ display: "flex", alignItems: "center", gap: "32px" }}>
            <a href="/about" style={{ fontSize: "14px", fontWeight: 400, color: "#6b6b7b", textDecoration: "none" }}>关于</a>
            <a href="/help" style={{ fontSize: "14px", fontWeight: 400, color: "#6b6b7b", textDecoration: "none" }}>帮助</a>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <div style={{ padding: "100px 0 60px", textAlign: "center" }}>
        <h1 style={{
          fontSize: "56px", fontWeight: 300, letterSpacing: "-2.24px", lineHeight: 1.05,
          background: "linear-gradient(135deg, #1a1a2e 0%, #4f46e5 50%, #a855f7 100%)",
          WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
          backgroundClip: "text",
          margin: 0,
        }}>
          安全、私密的<br />每一次对话
        </h1>
        <p style={{ fontSize: "20px", fontWeight: 300, color: "#6b6b7b", marginTop: "16px", maxWidth: "480px", marginLeft: "auto", marginRight: "auto" }}>
          端到端加密，你的消息只属于你
        </p>
      </div>

      {/* Auth Card */}
      <div style={{ display: "flex", justifyContent: "center", paddingBottom: "100px" }}>
        <div style={{
          width: "420px", background: "#fff",
          borderRadius: "20px",
          border: "1px solid rgba(0,0,0,0.06)",
          boxShadow: "0px 4px 24px rgba(0,0,0,0.03), 0px 1px 3px rgba(0,0,0,0.04)",
          padding: "48px",
        }}>
          <h2 style={{ fontSize: "26px", fontWeight: 400, letterSpacing: "-0.52px", marginBottom: "6px", color: "#0a0a0b" }}>
            {isRegistering ? "创建账号" : "登录"}
          </h2>
          <p style={{ fontSize: "15px", color: "#9ca3af", fontWeight: 300, marginBottom: "32px" }}>
            {isRegistering ? "加入 瞬语，开始安全对话" : "欢迎回来，继续你的安全对话"}
          </p>

          {/* Error */}
          {error && (
            <div style={{ padding: "12px 16px", borderRadius: "10px", background: "#fef2f2", border: "1px solid #fecaca", marginBottom: "22px" }}>
              <p style={{ fontSize: "14px", color: "#dc2626", margin: 0 }}>{error}</p>
            </div>
          )}

          <div style={{ marginBottom: "22px" }}>
            <label style={{ display: "block", fontSize: "13px", fontWeight: 500, color: "#4b5563", marginBottom: "8px", letterSpacing: "0.13px", textTransform: "uppercase" }}>用户名</label>
            <input
              type="text"
              className="stripe-input"
              placeholder="你的用户名"
              value={authUsername}
              onChange={e => { setAuthUsername(e.target.value); setError(""); }}
              onKeyDown={e => e.key === "Enter" && handleLogin()}
              autoFocus
            />
          </div>

          <div style={{ marginBottom: "22px" }}>
            <label style={{ display: "block", fontSize: "13px", fontWeight: 500, color: "#4b5563", marginBottom: "8px", letterSpacing: "0.13px", textTransform: "uppercase" }}>密码</label>
            <input
              type="password"
              className="stripe-input"
              placeholder="••••••••"
              value={authPassword}
              onChange={e => { setAuthPassword(e.target.value); setError(""); }}
              onKeyDown={e => e.key === "Enter" && (isRegistering ? handleRegister() : handleLogin())}
            />
          </div>

          {isRegistering ? (
            <>
              <button onClick={handleRegister} className="btn-stripe-primary" style={{ width: "100%" }}>
                创建新账号
              </button>
              <div style={{ display: "flex", alignItems: "center", gap: "16px", margin: "28px 0", color: "#d1d5db", fontSize: "12px", fontWeight: 300 }}>
                <span style={{ flex: 1, height: "1px", background: "#f3f4f6" }} />
                已有账号
                <span style={{ flex: 1, height: "1px", background: "#f3f4f6" }} />
              </div>
              <button
                onClick={() => { setIsRegistering(false); setError(""); }}
                style={{
                  width: "100%", display: "inline-flex", alignItems: "center", justifyContent: "center",
                  padding: "13px 24px", fontSize: "15px", fontWeight: 500,
                  borderRadius: "10px", border: "1.5px solid #e5e7eb", cursor: "pointer",
                  fontFamily: "inherit", letterSpacing: "-0.15px",
                  background: "#fff", color: "#4f46e5",
                  transition: "all 0.2s",
                }}
                onMouseEnter={e => { (e.target as HTMLButtonElement).style.borderColor = "#6366f1"; (e.target as HTMLButtonElement).style.background = "#fafbff"; }}
                onMouseLeave={e => { (e.target as HTMLButtonElement).style.borderColor = "#e5e7eb"; (e.target as HTMLButtonElement).style.background = "#fff"; }}
              >
                返回登录
              </button>
            </>
          ) : (
            <>
              <button onClick={handleLogin} className="btn-stripe-primary" style={{ width: "100%" }}>
                登 录
              </button>
              <div style={{ display: "flex", alignItems: "center", gap: "16px", margin: "28px 0", color: "#d1d5db", fontSize: "12px", fontWeight: 300 }}>
                <span style={{ flex: 1, height: "1px", background: "#f3f4f6" }} />
                或者
                <span style={{ flex: 1, height: "1px", background: "#f3f4f6" }} />
              </div>
              <button
                onClick={() => { setIsRegistering(true); setError(""); }}
                style={{
                  width: "100%", display: "inline-flex", alignItems: "center", justifyContent: "center",
                  padding: "13px 24px", fontSize: "15px", fontWeight: 500,
                  borderRadius: "10px", border: "1.5px solid #e5e7eb", cursor: "pointer",
                  fontFamily: "inherit", letterSpacing: "-0.15px",
                  background: "#fff", color: "#4f46e5",
                  transition: "all 0.2s",
                }}
                onMouseEnter={e => { (e.target as HTMLButtonElement).style.borderColor = "#6366f1"; (e.target as HTMLButtonElement).style.background = "#fafbff"; }}
                onMouseLeave={e => { (e.target as HTMLButtonElement).style.borderColor = "#e5e7eb"; (e.target as HTMLButtonElement).style.background = "#fff"; }}
              >
                创建新账号
              </button>
            </>
          )}

          <p style={{ textAlign: "center", fontSize: "13px", color: "#9ca3af", fontWeight: 300, marginTop: "24px" }}>
            继续即表示你同意 <a href="/terms" style={{ color: "#6366f1", textDecoration: "none", fontWeight: 500 }}>服务条款</a> 和 <a href="/privacy" style={{ color: "#6366f1", textDecoration: "none", fontWeight: 500 }}>隐私政策</a>
          </p>
        </div>
      </div>
    </div>
  );
}
