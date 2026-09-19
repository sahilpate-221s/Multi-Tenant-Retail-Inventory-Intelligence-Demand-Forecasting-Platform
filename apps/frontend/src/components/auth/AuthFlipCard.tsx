import { useState, useEffect, type FormEvent } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../../lib/authContext";
import { ApiError } from "../../lib/apiClient";
import { AuthVisualCanvas } from "./AuthVisualCanvas";

interface AuthFlipCardProps {
  initialMode?: "login" | "register";
}

export default function AuthFlipCard({ initialMode = "login" }: AuthFlipCardProps) {
  const [mode, setMode] = useState<"login" | "register">(() => {
    if (typeof window !== "undefined" && window.location.pathname.includes("register")) {
      return "register";
    }
    return initialMode;
  });
  const [isFlipping, setIsFlipping] = useState(false);
  const [mounted, setMounted] = useState(false);
  const navigate = useNavigate();
  const { login, register } = useAuth();

  // Entrance animation
  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 60);
    return () => clearTimeout(t);
  }, []);

  // Listen to browser Back / Forward buttons
  useEffect(() => {
    const handlePop = () => {
      const target = window.location.pathname.includes("register") ? "register" : "login";
      setMode(target);
    };
    window.addEventListener("popstate", handlePop);
    return () => window.removeEventListener("popstate", handlePop);
  }, []);

  // Login Form state
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);

  // Register Form state
  const [regStoreName, setRegStoreName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regError, setRegError] = useState("");
  const [regLoading, setRegLoading] = useState(false);

  const flipTo = (target: "login" | "register") => {
    if (mode === target) return;
    setIsFlipping(true);
    setMode(target);
    window.history.pushState(null, "", target === "login" ? "/login" : "/register");
    setTimeout(() => setIsFlipping(false), 1050);
  };

  const handleLoginSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoginError("");
    setLoginLoading(true);
    try {
      await login(loginEmail, loginPassword);
      navigate("/dashboard");
    } catch (err) {
      if (err instanceof ApiError) {
        setLoginError(err.message);
      } else {
        setLoginError("Failed to sign in. Please verify your credentials.");
      }
    } finally {
      setLoginLoading(false);
    }
  };

  const handleRegisterSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setRegError("");
    setRegLoading(true);
    try {
      await register(regStoreName, regEmail, regPassword);
      navigate("/dashboard");
    } catch (err) {
      if (err instanceof ApiError) {
        setRegError(err.message);
      } else {
        setRegError("Failed to create account. Please try again.");
      }
    } finally {
      setRegLoading(false);
    }
  };

  const isFlipped = mode === "register";

  return (
    <div
      className="min-h-screen w-full flex flex-col items-center justify-center relative overflow-hidden"
      style={{
        background: "radial-gradient(ellipse 80% 60% at 50% 30%, #161619 0%, #0a0a0c 100%)",
      }}
    >
      {/* Grid texture */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: `
            linear-gradient(rgba(212, 168, 83, 0.025) 1px, transparent 1px),
            linear-gradient(90deg, rgba(212, 168, 83, 0.025) 1px, transparent 1px)
          `,
          backgroundSize: "52px 52px",
        }}
      />
      {/* Radial glow */}
      <div
        className="absolute pointer-events-none"
        style={{
          width: "600px",
          height: "600px",
          top: "0%",
          left: "50%",
          transform: "translate(-50%, -40%)",
          background: "radial-gradient(circle, rgba(212,168,83,0.07) 0%, transparent 70%)",
          filter: "blur(20px)",
        }}
      />

      {/* ── Top bar (borderless, minimalist) ── */}
      <div
        className="w-full px-6 md:px-10 absolute top-0 left-0 right-0 h-16 flex items-center justify-between z-20 pointer-events-auto"
      >
        {/* Back to Home */}
        <Link
          to="/"
          id="auth-back-home-btn"
          className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium text-[#97979d] hover:text-[#e8e6e3] transition-all group"
          style={{
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.07)",
            backdropFilter: "blur(12px)",
          }}
          title="Back to landing page"
        >
          <svg
            className="w-3.5 h-3.5 transition-transform group-hover:-translate-x-0.5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          <span>Back to home</span>
        </Link>
      </div>

      {/* ── Card container ── */}
      <div
        className="w-full max-w-[900px] mx-auto px-4 py-8"
        style={{
          perspective: "2200px",
          opacity: mounted ? 1 : 0,
          transform: mounted ? "translateY(0)" : "translateY(20px)",
          transition: "opacity 0.5s ease, transform 0.5s cubic-bezier(0.16,1,0.3,1)",
        }}
      >
        <div
          className="w-full relative will-change-transform"
          style={{
            transformStyle: "preserve-3d",
            transition: "transform 1.25s cubic-bezier(0.2, 0.9, 0.25, 1)",
            transform: isFlipped ? "rotateY(180deg)" : "rotateY(0deg)",
            height: "480px",
          }}
        >

          {/* ══════════════════════════════════════════
              FRONT FACE: SIGN IN
          ══════════════════════════════════════════ */}
          <div
            className="w-full h-full grid grid-cols-1 md:grid-cols-12 rounded-2xl overflow-hidden absolute inset-0"
            style={{
              backfaceVisibility: "hidden",
              border: "1px solid rgba(255,255,255,0.08)",
              background: "rgba(16,16,20,0.9)",
              boxShadow: isFlipping
                ? "0 40px 100px -10px rgba(0,0,0,0.95), 0 0 60px rgba(212,168,83,0.14)"
                : "0 24px 60px -12px rgba(0,0,0,0.8), 0 0 0 1px rgba(255,255,255,0.04)",
              backdropFilter: "blur(24px)",
              transition: "box-shadow 0.6s ease",
            }}
          >
            {/* Left visual panel */}
            <div className="hidden md:flex md:col-span-5 relative flex-col justify-between p-8 overflow-hidden"
              style={{ borderRight: "1px solid rgba(255,255,255,0.06)" }}
            >
              <AuthVisualCanvas mode="login" />

              <div className="relative z-10">
                <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-lg bg-[#1a1a1d]/80 border border-[#303035] backdrop-blur-sm">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#4aba7a] animate-pulse" />
                  <span className="text-[10px] font-mono text-[#e8e6e3] tracking-widest uppercase">
                    Secure Access
                  </span>
                </div>
                <h2 className="mt-4 text-xl font-bold tracking-tight text-[#e8e6e3]">
                  Welcome back
                </h2>
                <p className="mt-2 text-xs text-[#97979d] leading-relaxed">
                  Real-time stock intelligence and demand forecasting awaits.
                </p>
              </div>

              <div className="relative z-10 p-4 rounded-xl bg-[#0c0c0e]/85 border border-[#262629]">
                <div className="flex justify-between items-center text-[10px] font-mono text-[#5c5c64] uppercase tracking-wider">
                  <span>Security</span>
                  <span className="text-[#4aba7a]">TLS Encrypted</span>
                </div>
                <div className="mt-2 flex items-baseline gap-2 font-mono text-[#e8e6e3]">
                  <span className="text-2xl font-bold">99.98%</span>
                  <span className="text-xs text-[#d4a853]">Uptime</span>
                </div>
              </div>
            </div>

            {/* Right: Sign In form */}
            <div className="md:col-span-7 p-6 md:p-8 flex flex-col justify-center bg-[#0e0e11]">
              <div>
                <h1 className="text-xl font-semibold text-[#e8e6e3] tracking-tight mb-1">
                  Sign in to your account
                </h1>
                <p className="text-xs text-[#5c5c64] mb-5">
                  Enter your credentials to access the dashboard.
                </p>

                {loginError && (
                  <div className="mb-5 p-3 rounded-lg bg-[rgba(212,90,74,0.08)] border border-[rgba(212,90,74,0.25)] text-xs text-[#d45a4a]">
                    {loginError}
                  </div>
                )}

                <form onSubmit={handleLoginSubmit} className="space-y-3">
                  <div>
                    <label className="block text-[10px] font-mono uppercase text-[#5c5c64] mb-2 tracking-widest">
                      Email
                    </label>
                    <input
                      type="email"
                      required
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      placeholder="you@company.com"
                      className="w-full px-3.5 py-2.5 rounded-lg text-sm bg-[#0a0a0c] text-[#e8e6e3] border border-[#262629] focus:outline-none focus:border-[#d4a853] focus:ring-1 focus:ring-[rgba(212,168,83,0.2)] transition-all"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-[10px] font-mono uppercase text-[#5c5c64] tracking-widest">
                        Password
                      </label>
                      <span className="text-[10px] text-[#5c5c64] hover:text-[#d4a853] cursor-pointer transition-colors">
                        Forgot?
                      </span>
                    </div>
                    <input
                      type="password"
                      required
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      placeholder="••••••••••••"
                      className="w-full px-3.5 py-2.5 rounded-lg text-sm bg-[#0a0a0c] text-[#e8e6e3] border border-[#262629] focus:outline-none focus:border-[#d4a853] focus:ring-1 focus:ring-[rgba(212,168,83,0.2)] transition-all font-mono"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loginLoading}
                    className="w-full mt-2 py-2.5 px-4 rounded-lg text-sm font-semibold text-[#0c0c0e] transition-all hover:opacity-90 active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    style={{
                      background: "linear-gradient(135deg, #d4a853 0%, #e8be66 100%)",
                      boxShadow: "0 0 20px rgba(212,168,83,0.2)",
                    }}
                  >
                    {loginLoading ? (
                      <>
                        <span className="w-4 h-4 border-2 border-[#0c0c0e] border-t-transparent rounded-full animate-spin" />
                        Signing in...
                      </>
                    ) : (
                      "Sign in →"
                    )}
                  </button>
                </form>
              </div>

              {/* Footer row */}
              <div className="mt-5 pt-4 border-t border-[#1e1e22] flex items-center justify-between text-xs">
                <span className="text-[#5c5c64]">
                  Don't have an account?{" "}
                  <button
                    type="button"
                    onClick={() => flipTo("register")}
                    className="text-[#d4a853] hover:text-[#e8be66] font-semibold transition-colors"
                  >
                    Create one
                  </button>
                </span>
              </div>
            </div>
          </div>

          {/* ══════════════════════════════════════════
              BACK FACE: REGISTER
          ══════════════════════════════════════════ */}
          <div
            className="w-full h-full grid grid-cols-1 md:grid-cols-12 rounded-2xl overflow-hidden absolute inset-0"
            style={{
              backfaceVisibility: "hidden",
              transform: "rotateY(180deg)",
              border: "1px solid rgba(255,255,255,0.08)",
              background: "rgba(16,16,20,0.9)",
              boxShadow: isFlipping
                ? "0 40px 100px -10px rgba(0,0,0,0.95), 0 0 60px rgba(212,168,83,0.14)"
                : "0 24px 60px -12px rgba(0,0,0,0.8), 0 0 0 1px rgba(255,255,255,0.04)",
              backdropFilter: "blur(24px)",
              transition: "box-shadow 0.6s ease",
            }}
          >
            {/* Left visual panel */}
            <div className="hidden md:flex md:col-span-5 relative flex-col justify-between p-8 overflow-hidden"
              style={{ borderRight: "1px solid rgba(255,255,255,0.06)" }}
            >
              <AuthVisualCanvas mode="register" />

              <div className="relative z-10">
                <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-lg bg-[#1a1a1d]/80 border border-[#303035] backdrop-blur-sm">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#d4a853] animate-pulse" />
                  <span className="text-[10px] font-mono text-[#d4a853] tracking-widest uppercase">
                    New Account
                  </span>
                </div>
                <h2 className="mt-4 text-xl font-bold tracking-tight text-[#e8e6e3]">
                  Set up your store
                </h2>
                <p className="mt-2 text-xs text-[#97979d] leading-relaxed">
                  Get AI-powered inventory intelligence up and running in minutes.
                </p>
              </div>

              <div className="relative z-10 p-4 rounded-xl bg-[#0c0c0e]/85 border border-[#262629]">
                <div className="text-[10px] font-mono text-[#5c5c64] uppercase tracking-wider mb-2">
                  What you get
                </div>
                <div className="space-y-1.5 text-[11px] font-mono text-[#97979d]">
                  <div className="flex items-center gap-2">
                    <span className="w-1 h-1 rounded-full bg-[#4aba7a]" />
                    <span>Demand forecasting</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-1 h-1 rounded-full bg-[#d4a853]" />
                    <span>Anomaly detection</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-1 h-1 rounded-full bg-[#6b8cc7]" />
                    <span>AI assistant</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right: Register form */}
            <div className="md:col-span-7 p-6 md:p-8 flex flex-col justify-center bg-[#0e0e11]">
              <div>
                <h1 className="text-xl font-semibold text-[#e8e6e3] tracking-tight mb-1">
                  Create your account
                </h1>
                <p className="text-xs text-[#5c5c64] mb-5">
                  Takes less than two minutes to get started.
                </p>

                {regError && (
                  <div className="mb-5 p-3 rounded-lg bg-[rgba(212,90,74,0.08)] border border-[rgba(212,90,74,0.25)] text-xs text-[#d45a4a]">
                    {regError}
                  </div>
                )}

                <form onSubmit={handleRegisterSubmit} className="space-y-3">
                  <div>
                    <label className="block text-[10px] font-mono uppercase text-[#5c5c64] mb-2 tracking-widest">
                      Store / Organization name
                    </label>
                    <input
                      type="text"
                      required
                      value={regStoreName}
                      onChange={(e) => setRegStoreName(e.target.value)}
                      placeholder="e.g. Apex Central Logistics"
                      className="w-full px-3.5 py-2.5 rounded-lg text-sm bg-[#0a0a0c] text-[#e8e6e3] border border-[#262629] focus:outline-none focus:border-[#d4a853] focus:ring-1 focus:ring-[rgba(212,168,83,0.2)] transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-mono uppercase text-[#5c5c64] mb-2 tracking-widest">
                      Email
                    </label>
                    <input
                      type="email"
                      required
                      value={regEmail}
                      onChange={(e) => setRegEmail(e.target.value)}
                      placeholder="you@company.com"
                      className="w-full px-3.5 py-2.5 rounded-lg text-sm bg-[#0a0a0c] text-[#e8e6e3] border border-[#262629] focus:outline-none focus:border-[#d4a853] focus:ring-1 focus:ring-[rgba(212,168,83,0.2)] transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-mono uppercase text-[#5c5c64] mb-2 tracking-widest">
                      Password
                    </label>
                    <input
                      type="password"
                      required
                      minLength={8}
                      value={regPassword}
                      onChange={(e) => setRegPassword(e.target.value)}
                      placeholder="Minimum 8 characters"
                      className="w-full px-3.5 py-2.5 rounded-lg text-sm bg-[#0a0a0c] text-[#e8e6e3] border border-[#262629] focus:outline-none focus:border-[#d4a853] focus:ring-1 focus:ring-[rgba(212,168,83,0.2)] transition-all font-mono"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={regLoading}
                    className="w-full mt-2 py-2.5 px-4 rounded-lg text-sm font-semibold text-[#0c0c0e] transition-all hover:opacity-90 active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    style={{
                      background: "linear-gradient(135deg, #d4a853 0%, #e8be66 100%)",
                      boxShadow: "0 0 20px rgba(212,168,83,0.2)",
                    }}
                  >
                    {regLoading ? (
                      <>
                        <span className="w-4 h-4 border-2 border-[#0c0c0e] border-t-transparent rounded-full animate-spin" />
                        Creating account...
                      </>
                    ) : (
                      "Create account →"
                    )}
                  </button>
                </form>
              </div>

              {/* Footer row */}
              <div className="mt-5 pt-4 border-t border-[#1e1e22] flex items-center justify-between text-xs">
                <span className="text-[#5c5c64]">
                  Already have an account?{" "}
                  <button
                    type="button"
                    onClick={() => flipTo("login")}
                    className="text-[#d4a853] hover:text-[#e8be66] font-semibold transition-colors"
                  >
                    Sign in
                  </button>
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
