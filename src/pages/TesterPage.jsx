import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useGarageWS } from "../hooks/useWebSocket";
import api from "../lib/api";
import { StatusPill } from "../components/StatusPill";
import { NotificationBell } from "../components/NotificationBell";
import { LogOut, CheckCheck, XCircle, AlertTriangle } from "lucide-react";
import MacJitLogo from "../components/MacJitLogo";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "../components/ui/dialog";

const FAIL_REASONS = [
  "Oil/fluid leak detected",
  "Brakes not functioning properly",
  "Engine noise not resolved",
  "Lights / electrical issue",
  "Tyre pressure incorrect",
  "AC not working",
  "Steering issue",
  "Incomplete service items",
  "Parts not fitted correctly",
  "Cleanliness / finish issue",
];

function QAFailDialog({ bookingId, plate, onFailed }) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState([]);
  const [custom, setCustom] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);

  const toggle = (r) =>
    setSelected((prev) => prev.includes(r) ? prev.filter((x) => x !== r) : [...prev, r]);

  const submit = async () => {
    const all = [...selected, ...(custom.trim() ? [custom.trim()] : [])];
    if (all.length === 0) { toast.error("Select at least one reason"); return; }
    setBusy(true);
    try {
      await api.post(`/bookings/${bookingId}/qa-fail`, { reasons: all, notes });
      toast.error(`QA Failed — ${plate} returned to mechanic`);
      setOpen(false);
      setSelected([]);
      setCustom("");
      setNotes("");
      onFailed();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          data-testid={`qa-fail-btn-${bookingId}`}
          className="bg-red-600 hover:bg-red-500 text-white font-display font-black uppercase tracking-widest px-6 py-4 flex items-center gap-2 border-b-4 border-red-800 active:translate-y-1 active:border-b-0 transition-all">
          <XCircle className="w-5 h-5" /> QA Fail
        </button>
      </DialogTrigger>
      <DialogContent className="bg-zinc-950 border-zinc-800 text-zinc-100 max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display font-black uppercase tracking-tight flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-400" /> QA Fail — {plate}
          </DialogTitle>
        </DialogHeader>
        <p className="font-mono text-[10px] uppercase tracking-widest text-zinc-500 mb-3">Select all reasons that apply</p>
        <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
          {FAIL_REASONS.map((r) => (
            <label key={r} className="flex items-center gap-3 cursor-pointer group">
              <input
                type="checkbox"
                checked={selected.includes(r)}
                onChange={() => toggle(r)}
                className="accent-red-500 w-4 h-4"
              />
              <span className="font-mono text-xs text-zinc-300 group-hover:text-white transition-colors">{r}</span>
            </label>
          ))}
        </div>
        <input
          type="text"
          placeholder="Other reason (optional)"
          value={custom}
          onChange={(e) => setCustom(e.target.value)}
          className="mt-3 w-full bg-zinc-900 border border-zinc-700 text-zinc-100 font-mono text-xs px-3 py-2 focus:outline-none focus:border-red-500"
        />
        <textarea
          placeholder="Additional notes for mechanic (optional)"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          className="mt-2 w-full bg-zinc-900 border border-zinc-700 text-zinc-100 font-mono text-xs px-3 py-2 focus:outline-none focus:border-red-500 resize-none"
        />
        <div className="flex gap-3 mt-4">
          <button
            onClick={submit}
            disabled={busy}
            className="flex-1 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white font-display font-black uppercase tracking-widest py-3 transition-colors">
            {busy ? "Submitting…" : "Confirm Fail"}
          </button>
          <button
            onClick={() => setOpen(false)}
            className="border border-zinc-700 text-zinc-400 font-mono text-[10px] uppercase tracking-widest px-4 py-3 hover:border-zinc-500 transition-colors">
            Cancel
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function TesterPage() {
  const { user, token, logout } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [tick, setTick] = useState(0);

  const load = () => api.get("/bookings").then((r) => setBookings(r.data));
  useEffect(() => { load(); }, []);
  useGarageWS(token, (e) => { if (e.type !== "connected") { toast(e.type.replace(/_/g, " "), { description: e.data?.plate_number || "" }); load(); setTick((t) => t + 1); } });

  const queue = bookings.filter((b) => b.status === "READY_TO_TEST");
  const recent = bookings.filter((b) => ["QA_DONE", "BILLED", "PAID"].includes(b.status)).slice(0, 5);

  const passQA = async (id) => { await api.post(`/bookings/${id}/qa-done`); toast.success("Marked QA Done"); load(); };

  return (
    <div className="dark min-h-screen bg-zinc-950 text-zinc-100">
      <header className="sticky top-0 z-20 bg-zinc-950/90 backdrop-blur-xl border-b border-zinc-800">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <MacJitLogo size={32} />
            <div>
              <p className="font-display font-black text-lg tracking-tighter">MACJIT <span className="text-orange-500">/ TESTER</span></p>
              <p className="font-mono text-[10px] uppercase tracking-widest text-zinc-500">{user?.name}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <a href="/employee" data-testid="hr-link" className="border border-zinc-800 hover:border-orange-500 hover:text-orange-500 text-zinc-300 font-mono text-[10px] uppercase tracking-widest px-3 py-2 transition-colors">HR</a>
            <NotificationBell refreshKey={tick} />
            <button data-testid="logout-btn" onClick={logout} className="p-2 hover:bg-zinc-800 rounded-full"><LogOut className="w-4 h-4" /></button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8 space-y-8">
        <section>
          <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-orange-500 mb-3">Awaiting QA · {queue.length}</p>
          <div className="space-y-3">
            {queue.length === 0 && (
              <div className="border border-dashed border-zinc-800 p-12 text-center">
                <p className="font-display font-black text-xl uppercase">Queue empty</p>
                <p className="text-zinc-500 text-sm mt-1">Cars will appear here once mechanics finish.</p>
              </div>
            )}
            {queue.map((b) => (
              <div key={b.id} data-testid={`test-row-${b.id}`} className="border border-zinc-800 bg-zinc-900/40 p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-mono text-[10px] uppercase tracking-widest text-zinc-500">{b.id.slice(0, 8)}</p>
                    <p className="font-display font-black text-2xl tracking-tighter">{b.plate_number}</p>
                    <p className="font-mono text-sm text-zinc-400">{b.car_make} {b.car_model} · by {b.mechanic_name} · {b.bay_name}</p>
                  </div>
                  <div className="flex gap-2">
                    <QAFailDialog bookingId={b.id} plate={b.plate_number} onFailed={load} />
                    <button
                      data-testid={`qa-done-btn-${b.id}`}
                      onClick={() => passQA(b.id)}
                      className="bg-emerald-500 hover:bg-emerald-400 text-black font-display font-black uppercase tracking-widest px-6 py-4 flex items-center gap-2 border-b-4 border-emerald-700 active:translate-y-1 active:border-b-0 transition-all">
                      <CheckCheck className="w-5 h-5" /> QA Done
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section>
          <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-zinc-500 mb-3">Recently passed</p>
          <div className="space-y-2">
            {recent.map((b) => (
              <div key={b.id} className="border border-zinc-800/50 bg-zinc-900/20 p-4 flex items-center justify-between">
                <div>
                  <p className="font-display font-bold">{b.plate_number}</p>
                  <p className="font-mono text-xs text-zinc-500">{b.customer_name}</p>
                </div>
                <StatusPill status={b.status} />
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
