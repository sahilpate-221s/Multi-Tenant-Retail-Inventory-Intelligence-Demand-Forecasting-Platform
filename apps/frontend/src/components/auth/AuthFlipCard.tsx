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
  const navigate = useNavigate();
  const { login, register } = useAuth();

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
    setTimeout(() => {
      setIsFlipping(false);
    }, 1050);
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
      className="min-h-screen w-full flex flex-col items-center justify-center p-4 relative overflow-hidden select-none"
      style={{
        background: "radial-gradient(ellipse 70% 50% at 50% 50%, #161619 0%, #0c0c0e 100%)",
      }}
    >
      {/* Background ambient lighting and grid */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: `
            linear-gradient(rgba(212, 168, 83, 0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(212, 168, 83, 0.03) 1px, transparent 1px)
          `,
          backgroundSize: "48px 48px",
        }}
      />
      <div
        className="absolute w-[500px] h-[500px] rounded-full blur-[140px] pointer-events-none"
        style={{
          background: "radial-gradient(circle, rgba(212,168,83,0.08) 0%, transparent 70%)",
          top: "20%",
          left: "50%",
          transform: "translate(-50%, -50%)",
        }}
      />

      {/* Top Header Navigation: Back to Landing Page + Brand */}
      <div className="w-full max-w-[960px] mb-6 z-20 flex items-center justify-between">
        <Link
          to="/"
          id="return-landing-btn-top"
          className="inline-flex items-center gap-2.5 px-4 py-2 rounded-xl text-xs font-mono font-medium text-[#e8e6e3] hover:text-[#0c0c0e] bg-[rgba(24,24,30,0.8)] hover:bg-[#d4a853] border border-[rgba(255,255,255,0.12)] hover:border-[#d4a853] transition-all duration-200 shadow-[0_4px_20px_rgba(0,0,0,0.5)] backdrop-blur-md group"
          title="Return to StockPilot Landing Page"
        >
          <svg
            className="w-4 h-4 transition-transform group-hover:-translate-x-1 text-[#d4a853] group-hover:text-[#0c0c0e]"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          <span className="tracking-wide">Return to Landing Page</span>
        </Link>

        <Link to="/" className="flex items-center gap-2 group">
          <span className="text-base font-bold tracking-widest text-[#e8e6e3]">STOCK</span>
          <span className="text-base font-bold tracking-widest text-[#d4a853]">PILOT</span>
          <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-[rgba(212,168,83,0.12)] text-[#d4a853] border border-[rgba(212,168,83,0.25)]">
            v2.4
          </span>
        </Link>
      </div>

      {/* ─── 3D Perspective Card Container ─── */}
      <div
        className="w-full max-w-[940px] relative z-10"
        style={{
          perspective: "2200px",
          WebkitPerspective: "2200px",
        }}
      >
        <div
          className="w-full relative will-change-transform"
          style={{
            transformStyle: "preserve-3d",
            WebkitTransformStyle: "preserve-3d",
            transition: "transform 1.25s cubic-bezier(0.2, 0.9, 0.25, 1)",
            transform: isFlipped ? "rotateY(180deg)" : "rotateY(0deg)",
            WebkitTransform: isFlipped ? "rotateY(180deg)" : "rotateY(0deg)",
            minHeight: "580px",
          }}
        >
          {/* ═══════════════════════════════════════════ */}
          {/* FRONT FACE: SIGN IN                       */}
          {/* ═══════════════════════════════════════════ */}
          <div
            className="w-full grid grid-cols-1 md:grid-cols-12 rounded-xl overflow-hidden"
            style={{
              backfaceVisibility: "hidden",
              WebkitBackfaceVisibility: "hidden",
              transform: "rotateY(0deg)",
              WebkitTransform: "rotateY(0deg)",
              border: "1px solid var(--color-sp-border-default)",
              background: "var(--color-sp-elevated)",
              boxShadow: isFlipping
                ? "0 40px 100px -10px rgba(0,0,0,0.95), 0 0 50px rgba(212,168,83,0.18)"
                : "0 24px 60px -12px rgba(0,0,0,0.75), 0 0 30px rgba(212,168,83,0.06)",
              transition: "box-shadow 0.6s ease",
            }}
          >
            {/* Left Panel: Visual Engine Showcase */}
            <div className="hidden md:flex md:col-span-5 relative flex-col justify-between p-8 border-r border-[#262629] overflow-hidden">
              <AuthVisualCanvas mode="login" />

              <div className="relative z-10">
                <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded bg-[#1a1a1d]/80 border border-[#303035] backdrop-blur-sm">
                  <span className="w-2 h-2 rounded-full bg-[#4aba7a] animate-pulse" />
                  <span className="text-[11px] font-mono text-[#e8e6e3] tracking-wide">
                    AUTHENTICATION ENCLAVE
                  </span>
                </div>
                <h2 className="mt-4 text-2xl font-bold tracking-tight text-[#e8e6e3]">
                  Operator Access
                </h2>
                <p className="mt-2 text-xs text-[#97979d] leading-relaxed">
                  Real-time stock velocity, neural demand telemetry, and dynamic allocation protocols.
                </p>
              </div>

              {/* Live Telemetry Ticker Box */}
              <div className="relative z-10 p-4 rounded-lg bg-[#0c0c0e]/85 border border-[#303035] backdrop-blur-md">
                <div className="flex justify-between items-center text-[10px] font-mono text-[#5c5c64] uppercase tracking-wider">
                  <span>SECURITY STATUS</span>
                  <span className="text-[#4aba7a]">ENCRYPTED TLS</span>
                </div>
                <div className="mt-2 flex items-baseline gap-2 font-mono text-[#e8e6e3]">
                  <span className="text-xl font-bold">99.98%</span>
                  <span className="text-xs text-[#d4a853]">UPTIME METRIC</span>
                </div>
                <div className="mt-2 text-[10px] font-mono text-[#97979d]">
                  NODE ID: SP-CENTRAL-01 // LATENCY: 22ms
                </div>
              </div>
            </div>

            {/* Right Panel: Sign In Form */}
            <div className="md:col-span-7 p-8 md:p-10 flex flex-col justify-between bg-[#141416]">
              <div>
                <div className="flex items-center justify-between">
                  <h1 className="text-xl font-semibold text-[#e8e6e3] tracking-tight">
                    Sign in to your console
                  </h1>
                  <span className="text-xs font-mono text-[#5c5c64]">STEP 1/1</span>
                </div>
                <p className="mt-1 text-xs text-[#97979d]">
                  Enter your verified store credentials to continue.
                </p>

                {loginError && (
                  <div className="mt-4 p-3 rounded bg-[rgba(212,90,74,0.1)] border border-[rgba(212,90,74,0.3)] text-xs text-[#d45a4a]">
                    {loginError}
                  </div>
                )}

                <form onSubmit={handleLoginSubmit} className="mt-6 space-y-4">
                  <div>
                    <label className="block text-[11px] font-mono uppercase text-[#97979d] mb-1.5 tracking-wider">
                      Work Email
                    </label>
                    <input
                      type="email"
                      required
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      placeholder="operator@stockpilot.io"
                      className="w-full px-3.5 py-2.5 rounded text-sm bg-[#0c0c0e] text-[#e8e6e3] border border-[#303035] focus:outline-none focus:border-[#d4a853] focus:ring-1 focus:ring-[#d4a853] transition-colors"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-[11px] font-mono uppercase text-[#97979d] tracking-wider">
                        Password
                      </label>
                      <span className="text-[11px] text-[#5c5c64] hover:text-[#d4a853] cursor-pointer transition-colors">
                        Forgot?
                      </span>
                    </div>
                    <input
                      type="password"
                      required
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      placeholder="••••••••••••"
                      className="w-full px-3.5 py-2.5 rounded text-sm bg-[#0c0c0e] text-[#e8e6e3] border border-[#303035] focus:outline-none focus:border-[#d4a853] focus:ring-1 focus:ring-[#d4a853] transition-colors font-mono"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loginLoading}
                    className="w-full mt-2 py-2.5 px-4 rounded text-sm font-semibold tracking-wide text-[#0c0c0e] bg-[#d4a853] hover:bg-[#e8be66] active:scale-[0.99] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {loginLoading ? (
                      <>
                        <span className="w-4 h-4 border-2 border-[#0c0c0e] border-t-transparent rounded-full animate-spin" />
                        Authenticating...
                      </>
                    ) : (
                      "Access Inventory Mesh →"
                    )}
                  </button>
                </form>
              </div>

              {/* Flip to Register Toggle & Return to Landing */}
              <div className="mt-8 pt-6 border-t border-[#262629] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
                <Link
                  to="/"
                  className="text-[#97979d] hover:text-[#d4a853] flex items-center gap-1.5 transition-colors font-mono"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                  </svg>
                  <span>Return to Landing</span>
                </Link>

                <button
                  type="button"
                  onClick={() => flipTo("register")}
                  className="font-semibold text-[#d4a853] hover:text-[#e8be66] hover:underline flex items-center gap-1 transition-colors"
                >
                  Create Account (Flip) ↺
                </button>
              </div>
            </div>
          </div>

          {/* ═══════════════════════════════════════════ */}
          {/* BACK FACE: REGISTER                       */}
          {/* ═══════════════════════════════════════════ */}
          <div
            className="w-full grid grid-cols-1 md:grid-cols-12 rounded-xl overflow-hidden absolute inset-0"
            style={{
              backfaceVisibility: "hidden",
              WebkitBackfaceVisibility: "hidden",
              transform: "rotateY(180deg)",
              WebkitTransform: "rotateY(180deg)",
              border: "1px solid var(--color-sp-border-default)",
              background: "var(--color-sp-elevated)",
              boxShadow: isFlipping
                ? "0 40px 100px -10px rgba(0,0,0,0.95), 0 0 50px rgba(212,168,83,0.18)"
                : "0 24px 60px -12px rgba(0,0,0,0.75), 0 0 30px rgba(212,168,83,0.06)",
              transition: "box-shadow 0.6s ease",
            }}
          >
            {/* Left Panel: Visual Engine Showcase (Registration) */}
            <div className="hidden md:flex md:col-span-5 relative flex-col justify-between p-8 border-r border-[#262629] overflow-hidden">
              <AuthVisualCanvas mode="register" />

              <div className="relative z-10">
                <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded bg-[#1a1a1d]/80 border border-[#303035] backdrop-blur-sm">
                  <span className="w-2 h-2 rounded-full bg-[#d4a853] animate-pulse" />
                  <span className="text-[11px] font-mono text-[#d4a853] tracking-wide">
                    PROVISION INSTANCE
                  </span>
                </div>
                <h2 className="mt-4 text-2xl font-bold tracking-tight text-[#e8e6e3]">
                  Initialize Tenant
                </h2>
                <p className="mt-2 text-xs text-[#97979d] leading-relaxed">
                  Establish an isolated cryptographic tenant workspace with AI forecasting, anomaly triggers, and real-time inventory ledger.
                </p>
              </div>

              {/* Tenant Provisioning Spec Box */}
              <div className="relative z-10 p-4 rounded-lg bg-[#0c0c0e]/85 border border-[#303035] backdrop-blur-md">
                <div className="text-[10px] font-mono text-[#5c5c64] uppercase tracking-wider mb-1">
                  PROVISIONING PARAMETERS
                </div>
                <div className="space-y-1 text-[11px] font-mono text-[#97979d]">
                  <div className="flex justify-between">
                    <span>MULTI-TENANT ISOLATION</span>
                    <span className="text-[#4aba7a]">ACTIVE</span>
                  </div>
                  <div className="flex justify-between">
                    <span>3D SPATIAL TWIN</span>
                    <span className="text-[#d4a853]">ENABLED</span>
                  </div>
                  <div className="flex justify-between">
                    <span>DEMAND FORECASTING</span>
                    <span className="text-[#e8e6e3]">REAL-TIME</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Panel: Register Form */}
            <div className="md:col-span-7 p-8 md:p-10 flex flex-col justify-between bg-[#141416]">
              <div>
                <div className="flex items-center justify-between">
                  <h1 className="text-xl font-semibold text-[#e8e6e3] tracking-tight">
                    Create your organization
                  </h1>
                  <span className="text-xs font-mono text-[#d4a853]">TENANT INIT</span>
                </div>
                <p className="mt-1 text-xs text-[#97979d]">
                  Deploy your intelligent inventory node in under 30 seconds.
                </p>

                {regError && (
                  <div className="mt-4 p-3 rounded bg-[rgba(212,90,74,0.1)] border border-[rgba(212,90,74,0.3)] text-xs text-[#d45a4a]">
                    {regError}
                  </div>
                )}

                <form onSubmit={handleRegisterSubmit} className="mt-5 space-y-3.5">
                  <div>
                    <label className="block text-[11px] font-mono uppercase text-[#97979d] mb-1.5 tracking-wider">
                      Store / Organization Name
                    </label>
                    <input
                      type="text"
                      required
                      value={regStoreName}
                      onChange={(e) => setRegStoreName(e.target.value)}
                      placeholder="e.g. Apex Central Logistics"
                      className="w-full px-3.5 py-2.5 rounded text-sm bg-[#0c0c0e] text-[#e8e6e3] border border-[#303035] focus:outline-none focus:border-[#d4a853] focus:ring-1 focus:ring-[#d4a853] transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-mono uppercase text-[#97979d] mb-1.5 tracking-wider">
                      Work Email
                    </label>
                    <input
                      type="email"
                      required
                      value={regEmail}
                      onChange={(e) => setRegEmail(e.target.value)}
                      placeholder="director@apexlogistics.com"
                      className="w-full px-3.5 py-2.5 rounded text-sm bg-[#0c0c0e] text-[#e8e6e3] border border-[#303035] focus:outline-none focus:border-[#d4a853] focus:ring-1 focus:ring-[#d4a853] transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-mono uppercase text-[#97979d] mb-1.5 tracking-wider">
                      Master Password
                    </label>
                    <input
                      type="password"
                      required
                      minLength={8}
                      value={regPassword}
                      onChange={(e) => setRegPassword(e.target.value)}
                      placeholder="Minimum 8 characters"
                      className="w-full px-3.5 py-2.5 rounded text-sm bg-[#0c0c0e] text-[#e8e6e3] border border-[#303035] focus:outline-none focus:border-[#d4a853] focus:ring-1 focus:ring-[#d4a853] transition-colors font-mono"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={regLoading}
                    className="w-full mt-2 py-2.5 px-4 rounded text-sm font-semibold tracking-wide text-[#0c0c0e] bg-[#d4a853] hover:bg-[#e8be66] active:scale-[0.99] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {regLoading ? (
                      <>
                        <span className="w-4 h-4 border-2 border-[#0c0c0e] border-t-transparent rounded-full animate-spin" />
                        Provisioning Node...
                      </>
                    ) : (
                      "Initialize Store Instance →"
                    )}
                  </button>
                </form>
              </div>

              {/* Flip back to Login Toggle & Return to Landing */}
              <div className="mt-6 pt-5 border-t border-[#262629] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
                <Link
                  to="/"
                  className="text-[#97979d] hover:text-[#d4a853] flex items-center gap-1.5 transition-colors font-mono"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                  </svg>
                  <span>Return to Landing</span>
                </Link>

                <button
                  type="button"
                  onClick={() => flipTo("login")}
                  className="font-semibold text-[#d4a853] hover:text-[#e8be66] hover:underline flex items-center gap-1 transition-colors"
                >
                  Sign in to console (Flip) ↺
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
