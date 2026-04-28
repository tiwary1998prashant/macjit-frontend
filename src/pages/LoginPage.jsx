import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Zap, Phone, User, Lock, ArrowLeft, Send, KeyRound } from "lucide-react";
import MacJitLogo from "../components/MacJitLogo";
import { toast } from "sonner";

/**
 * mode = "customer" (default) -> phone-only, OTP-based login (no password)
 * mode = "staff"             -> username + password (admin / mechanic / tester / shop / reception)
 */
export default function LoginPage({ mode = "customer" }) {
  const isStaff = mode === "staff";
  const { login, otpRequest, otpVerify } = useAuth();
  const nav = useNavigate();

  // staff state
  const [u, setU] = useState("");
  const [staffPhone, setStaffPhone] = useState("");
  const [p, setP] = useState("");

  // customer OTP state
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [name, setName] = useState("");
  const [step, setStep] = useState("phone"); // phone -> otp
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [busy, setBusy] = useState(false);
  const [debugOtp, setDebugOtp] = useState(null);

  useEffect(() => {
    if (secondsLeft <= 0) return;
    const t = setInterval(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearInterval(t);
  }, [secondsLeft]);

  const submitStaff = async (e) => {
    e?.preventDefault();
    setBusy(true);
    try {
      const user = await login(u || null, p, u ? null : staffPhone);
      toast.success(`Welcome, ${user.name}`);
      nav(`/${user.role}`);
    } catch (err) {
      toast.error(err.response?.data?.detail || "Login failed");
    } finally { setBusy(false); }
  };

  const sendOtp = async (e) => {
    e?.preventDefault();
    if (!phone || phone.replace(/\D/g, "").length < 10) {
      return toast.error("Enter a valid 10-digit phone number");
    }
    setBusy(true);
    try {
      const r = await otpRequest(phone);
      setDebugOtp(r.debug_otp || null);
      setStep("otp");
      setSecondsLeft(r.expires_in || 300);
      toast.success(r.debug_otp ? `OTP sent (DEV: ${r.debug_otp})` : "OTP sent — check SMS / WhatsApp");
    } catch (err) {
      toast.error(err.response?.data?.detail || "Could not send OTP");
    } finally { setBusy(false); }
  };

  const verifyOtp = async (e) => {
    e?.preventDefault();
    if (otp.length !== 6) return toast.error("Enter the 6-digit OTP");
    setBusy(true);
    try {
      const user = await otpVerify(phone, otp, name);
      toast.success(`Welcome, ${user.name || "Customer"}`);
      nav(`/${user.role}`);
    } catch (err) {
      toast.error(err.response?.data?.detail || "Invalid OTP");
    } finally { setBusy(false); }
  };

  const resendOtp = async () => {
    setOtp(""); setSecondsLeft(0);
    await sendOtp();
  };

  const fmtTime = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

  return (
    <div className="min-h-screen bg-zinc-950 grid-bg flex items-center justify-center p-6">
      <div className="w-full max-w-5xl grid lg:grid-cols-2 gap-8">
        {/* Brand panel */}
        <div className="hidden lg:flex flex-col justify-between border border-zinc-800 bg-zinc-900/30 p-10 relative overflow-hidden">
          <div className="absolute inset-0 opacity-20">
            <img src="https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?auto=format&fit=crop&w=900&q=70" className="w-full h-full object-cover" alt="" />
          </div>
          <div className="relative">
            <div className="flex items-center gap-3 mb-12">
              <MacJitLogo size={44} />
              <div className="leading-none">
                <span className="font-display font-black text-2xl tracking-tighter text-white block"><span>MAC</span><span className="text-orange-500">JIT</span></span>
                <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-orange-500/90">Mechanic Just In Time</span>
              </div>
            </div>
            <h1 className="font-display font-black text-5xl xl:text-6xl text-white tracking-tighter leading-[0.95] uppercase">
              {isStaff ? <>Staff<br />Console.</> : <>Track your<br />car<br /><span className="text-orange-500">in real-time.</span></>}
            </h1>
            <p className="text-zinc-400 mt-6 max-w-sm font-mono text-sm">
              {isStaff
                ? "Restricted area. Reception, mechanics, testers and admin only."
                : "Sign in with your phone — we'll text you a one-time password. New here? You'll be set up automatically."}
            </p>
          </div>
          <div className="relative flex items-center gap-2 text-zinc-500 font-mono text-[10px] uppercase tracking-[0.2em] flex-wrap">
            <span className="flex items-center gap-2"><Zap className="w-3 h-3 text-orange-500" />macjit.com</span><span>·</span>
            <span>hello@macjit.com</span><span>·</span><span>+91 93534 01156</span>
          </div>
        </div>

        {/* Form panel */}
        <div className="border border-zinc-800 bg-zinc-900/40 p-8 lg:p-12">
          <button onClick={() => nav("/")} data-testid="back-home" className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest text-zinc-500 hover:text-orange-500 mb-6">
            <ArrowLeft className="w-3 h-3" />Back to home
          </button>
          <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-orange-500 mb-2">{isStaff ? "Staff sign in" : "Customer sign in"}</p>
          <h2 className="font-display font-black text-3xl text-white tracking-tight uppercase">{isStaff ? "Service Console" : "My Bookings"}</h2>

          {/* STAFF: classic username/password */}
          {isStaff && (
            <form onSubmit={submitStaff} className="space-y-4 mt-8">
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <input data-testid="login-username" placeholder="Username (or phone)" value={u} onChange={(e) => setU(e.target.value)} required className="w-full bg-zinc-950 border border-zinc-800 pl-10 pr-4 py-3 font-mono text-white focus:border-orange-500 focus:outline-none" />
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <input data-testid="login-password" type="password" placeholder="Password" value={p} onChange={(e) => setP(e.target.value)} required className="w-full bg-zinc-950 border border-zinc-800 pl-10 pr-4 py-3 font-mono text-white focus:border-orange-500 focus:outline-none" />
              </div>
              <button data-testid="login-submit" disabled={busy} className="w-full bg-orange-500 hover:bg-orange-400 text-black font-display font-black uppercase tracking-widest py-4 transition-colors disabled:opacity-50">{busy ? "Signing in..." : "Enter →"}</button>
            </form>
          )}

          {/* CUSTOMER: OTP flow */}
          {!isStaff && step === "phone" && (
            <form onSubmit={sendOtp} className="space-y-4 mt-8">
              <p className="font-mono text-xs text-zinc-400">Enter your mobile number — we'll text you a 6-digit code.</p>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <input data-testid="otp-phone" placeholder="98765 43210" value={phone} onChange={(e) => setPhone(e.target.value)} required inputMode="tel" className="w-full bg-zinc-950 border border-zinc-800 pl-10 pr-4 py-4 font-mono text-white text-lg focus:border-orange-500 focus:outline-none" />
              </div>
              <input data-testid="otp-name" placeholder="Your name (optional, only if first time)" value={name} onChange={(e) => setName(e.target.value)} className="w-full bg-zinc-950 border border-zinc-800 px-4 py-3 font-mono text-white focus:border-orange-500 focus:outline-none" />
              <button data-testid="otp-send" disabled={busy} className="w-full bg-orange-500 hover:bg-orange-400 text-black font-display font-black uppercase tracking-widest py-4 transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                {busy ? "Sending..." : <>Send OTP <Send className="w-4 h-4" /></>}
              </button>
            </form>
          )}

          {!isStaff && step === "otp" && (
            <form onSubmit={verifyOtp} className="space-y-4 mt-8">
              <div className="flex items-center justify-between">
                <p className="font-mono text-xs text-zinc-400">OTP sent to <span className="text-orange-500">+91 {phone.replace(/\D/g, "").slice(-10)}</span></p>
                <button type="button" onClick={() => { setStep("phone"); setOtp(""); }} className="font-mono text-[10px] uppercase tracking-widest text-zinc-500 hover:text-orange-500">Edit</button>
              </div>
              {debugOtp && (
                <div data-testid="dev-otp-banner" className="border border-orange-500/40 bg-orange-500/5 p-3 font-mono text-xs text-orange-300">
                  <span className="text-orange-500 font-bold">DEV ONLY:</span> Twilio FROM number not configured — your OTP is <span className="font-bold text-white text-base ml-2">{debugOtp}</span>
                </div>
              )}
              <div className="relative">
                <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <input data-testid="otp-code" placeholder="6-digit OTP" value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))} required inputMode="numeric" maxLength={6} autoFocus className="w-full bg-zinc-950 border border-zinc-800 pl-10 pr-4 py-4 font-mono text-white text-2xl tracking-[0.5em] text-center focus:border-orange-500 focus:outline-none" />
              </div>
              <button data-testid="otp-verify" disabled={busy || otp.length !== 6} className="w-full bg-orange-500 hover:bg-orange-400 text-black font-display font-black uppercase tracking-widest py-4 transition-colors disabled:opacity-50">{busy ? "Verifying..." : "Verify & Sign In →"}</button>
              <div className="flex items-center justify-between font-mono text-[11px]">
                <span className="text-zinc-500">{secondsLeft > 0 ? <>Expires in <span className="text-orange-500">{fmtTime(secondsLeft)}</span></> : <span className="text-red-400">Expired</span>}</span>
                <button type="button" onClick={resendOtp} disabled={busy || secondsLeft > 240} className="uppercase tracking-widest text-orange-500 hover:text-orange-400 disabled:opacity-30 disabled:cursor-not-allowed">
                  Resend OTP
                </button>
              </div>
            </form>
          )}

          {!isStaff && (
            <div className="mt-8 pt-6 border-t border-zinc-800">
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-zinc-500">
                New here? Walk in to our garage at <span className="text-orange-500">Varthur, Bangalore — 560087</span> or call
                <a href="tel:+919353401156" className="text-orange-500 ml-1">+91 93534 01156</a>. We'll book your car for you.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
