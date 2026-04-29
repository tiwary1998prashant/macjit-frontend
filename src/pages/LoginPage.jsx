import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Zap, Phone, Lock, ArrowLeft, KeyRound } from "lucide-react";
import MacJitLogo from "../components/MacJitLogo";
import { toast } from "sonner";

/**
 * Staff login only (phone + password). Customers do NOT log in — they track
 * their booking with their vehicle plate number on the public /track page.
 *
 * If the staff account still has the initial password set by the admin,
 * we force a one-time password reset before letting them into the dashboard.
 */
export default function LoginPage() {
  const { login, changePassword } = useAuth();
  const nav = useNavigate();

  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  // force-reset modal state
  const [forceReset, setForceReset] = useState(null); // { user }
  const [newPwd, setNewPwd] = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");

  const submit = async (e) => {
    e?.preventDefault();
    if (!phone || !password) return toast.error("Enter your phone and password");
    setBusy(true);
    try {
      const { user, mustReset } = await login(phone.trim(), password);
      if (mustReset) {
        setForceReset({ user });
        toast.message("Set a new password to continue");
      } else {
        toast.success(`Welcome, ${user.name}`);
        nav(`/${user.role}`);
      }
    } catch (err) {
      toast.error(err.response?.data?.detail || "Login failed");
    } finally { setBusy(false); }
  };

  const submitNewPassword = async (e) => {
    e?.preventDefault();
    if (newPwd.length < 6) return toast.error("New password must be at least 6 characters");
    if (newPwd !== confirmPwd) return toast.error("Passwords do not match");
    setBusy(true);
    try {
      await changePassword(password, newPwd);
      toast.success("Password updated");
      const u = forceReset?.user;
      setForceReset(null);
      if (u) nav(`/${u.role}`);
    } catch (err) {
      toast.error(err.response?.data?.detail || "Could not update password");
    } finally { setBusy(false); }
  };

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
            <h1 className="font-display font-black text-5xl xl:text-6xl text-white tracking-tighter leading-[0.95] uppercase">Staff<br />Console.</h1>
            <p className="text-zinc-400 mt-6 max-w-sm font-mono text-sm">
              Restricted area. Reception, mechanics, testers, shopkeepers and admin only.
              Only accounts created by the admin can sign in.
            </p>
            <p className="text-zinc-500 mt-6 max-w-sm font-mono text-xs">
              Looking for your bill or service status? Customers don't need an account —
              just open the track page and enter your vehicle number.
            </p>
            <button onClick={() => nav("/track")}
              className="mt-3 font-mono text-[11px] uppercase tracking-[0.2em] text-orange-500 hover:text-orange-400">
              → Go to vehicle tracker
            </button>
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
          <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-orange-500 mb-2">Staff sign in</p>
          <h2 className="font-display font-black text-3xl text-white tracking-tight uppercase">Service Console</h2>

          <form onSubmit={submit} className="space-y-4 mt-8">
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
              <input
                data-testid="login-phone"
                placeholder="Registered phone number"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
                inputMode="tel"
                className="w-full bg-zinc-950 border border-zinc-800 pl-10 pr-4 py-3 font-mono text-white focus:border-orange-500 focus:outline-none"
              />
            </div>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
              <input
                data-testid="login-password"
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full bg-zinc-950 border border-zinc-800 pl-10 pr-4 py-3 font-mono text-white focus:border-orange-500 focus:outline-none"
              />
            </div>
            <button data-testid="login-submit" disabled={busy}
              className="w-full bg-orange-500 hover:bg-orange-400 text-black font-display font-black uppercase tracking-widest py-4 transition-colors disabled:opacity-50">
              {busy ? "Signing in..." : "Enter →"}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-zinc-800">
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-zinc-500">
              No account? Only the admin can create staff accounts.
              Customers track their bill at
              <button onClick={() => nav("/track")} className="text-orange-500 hover:text-orange-400 ml-1">
                /track
              </button>.
            </p>
          </div>
        </div>
      </div>

      {/* Force-reset modal */}
      {forceReset && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur grid place-items-center p-4" data-testid="force-reset-modal">
          <form onSubmit={submitNewPassword}
            className="w-full max-w-md bg-zinc-950 border border-orange-500/50 p-8 space-y-4">
            <div className="flex items-center gap-3">
              <KeyRound className="w-6 h-6 text-orange-500" />
              <h3 className="font-display font-black text-2xl text-white tracking-tight uppercase">Set a new password</h3>
            </div>
            <p className="font-mono text-xs text-zinc-400">
              You're using the temporary password your admin set. Choose a new password to continue.
            </p>
            <input
              data-testid="new-password"
              type="password" placeholder="New password (min 6 chars)" value={newPwd}
              onChange={(e) => setNewPwd(e.target.value)} required minLength={6}
              className="w-full bg-zinc-900 border border-zinc-800 px-4 py-3 font-mono text-white focus:border-orange-500 focus:outline-none"
            />
            <input
              data-testid="confirm-password"
              type="password" placeholder="Confirm new password" value={confirmPwd}
              onChange={(e) => setConfirmPwd(e.target.value)} required minLength={6}
              className="w-full bg-zinc-900 border border-zinc-800 px-4 py-3 font-mono text-white focus:border-orange-500 focus:outline-none"
            />
            <button disabled={busy} data-testid="submit-new-password"
              className="w-full bg-orange-500 hover:bg-orange-400 text-black font-display font-black uppercase tracking-widest py-3 transition-colors disabled:opacity-50">
              {busy ? "Saving..." : "Update Password →"}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
