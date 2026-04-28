import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useGarageWS } from "../hooks/useWebSocket";
import api from "../lib/api";
import { StatusPill } from "../components/StatusPill";
import { Timeline } from "../components/Timeline";
import { NotificationBell } from "../components/NotificationBell";
import { Wrench, LogOut, AlertTriangle, IndianRupee, ExternalLink, User, Phone } from "lucide-react";
import MacJitLogo from "../components/MacJitLogo";
import { toast } from "sonner";
import Marquee from "react-fast-marquee";

export default function CustomerPage() {
  const { user, token, logout } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [tick, setTick] = useState(0);

  const load = () => api.get("/bookings").then((r) => setBookings(r.data)).catch(() => {});
  useEffect(() => { load(); }, []);

  useGarageWS(token, (e) => {
    if (e.type === "connected") return;
    toast(e.type.replace(/_/g, " "), { description: e.data?.plate_number || "" });
    load(); setTick((t) => t + 1);
  });

  const active = bookings.find((b) => b.status !== "PAID") || bookings[0];

  return (
    <div className="min-h-screen bg-zinc-100 text-zinc-900">
      <div className="bg-black text-orange-500 py-1.5">
        <Marquee speed={40} gradient={false}>
          <span className="font-mono text-[10px] uppercase tracking-[0.3em] mx-8">LIVE GARAGE OPERATIONS · ASYNC EVENTS · SMS UPDATES · YOUR CAR OUR PRIORITY ·</span>
          <span className="font-mono text-[10px] uppercase tracking-[0.3em] mx-8">LIVE GARAGE OPERATIONS · ASYNC EVENTS · SMS UPDATES · YOUR CAR OUR PRIORITY ·</span>
        </Marquee>
      </div>

      <header className="sticky top-0 z-20 bg-white/80 backdrop-blur-xl border-b border-zinc-200">
        <div className="max-w-3xl mx-auto px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MacJitLogo size={32} />
            <span className="font-display font-black text-lg tracking-tighter">MACJIT</span>
          </div>
          <div className="flex items-center gap-2">
            <NotificationBell refreshKey={tick} />
            <button data-testid="logout-btn" onClick={logout} className="p-2 hover:bg-zinc-100 rounded-full"><LogOut className="w-4 h-4" /></button>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-5 py-8 space-y-8 pb-20">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-zinc-500">Welcome back</p>
          <h1 className="font-display font-black text-4xl sm:text-5xl tracking-tighter mt-1">{user?.name}</h1>
        </div>

        {!active ? (
          <div data-testid="no-booking" className="border border-dashed border-zinc-300 p-12 text-center bg-white">
            <Wrench className="w-10 h-10 text-zinc-400 mx-auto mb-3" />
            <p className="font-display font-black text-xl uppercase">No active booking</p>
            <p className="text-sm text-zinc-500 mt-1">Visit the reception to book a service.</p>
          </div>
        ) : (
          <>
            <section className="bg-white border border-zinc-200 p-6 shadow-[0_8px_32px_rgba(0,0,0,0.04)]" data-testid="active-booking-card">
              <div className="flex items-start justify-between gap-4 mb-4">
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-zinc-500">Your car</p>
                  <h2 className="font-display font-black text-2xl mt-0.5">{active.car_make} {active.car_model}</h2>
                  <p className="font-mono text-sm text-zinc-600 mt-0.5">{active.plate_number} · {active.service_type}</p>
                </div>
                <StatusPill status={active.status} testid="customer-status-pill" />
              </div>

              {(active.mechanic_name || active.bay_name) && (
                <div className="mt-3 pt-3 border-t border-zinc-100 grid grid-cols-2 gap-4 font-mono text-sm">
                  <div data-testid="assigned-mechanic">
                    <p className="text-[10px] uppercase tracking-widest text-zinc-500 flex items-center gap-1"><User className="w-3 h-3"/>Mechanic</p>
                    <p className="font-bold">{active.mechanic_name || "—"}</p>
                    {active.mechanic_phone && <a href={`tel:${active.mechanic_phone}`} className="text-[11px] text-orange-600 flex items-center gap-1 mt-0.5"><Phone className="w-3 h-3"/>{active.mechanic_phone}</a>}
                  </div>
                  <div><p className="text-[10px] uppercase tracking-widest text-zinc-500">Service Bay</p><p className="font-bold">{active.bay_name || "—"}</p></div>
                  {active.tester_name && (
                    <div data-testid="assigned-tester">
                      <p className="text-[10px] uppercase tracking-widest text-zinc-500 flex items-center gap-1"><User className="w-3 h-3"/>QA Tester</p>
                      <p className="font-bold">{active.tester_name}</p>
                    </div>
                  )}
                </div>
              )}
              {active.estimated_start_at && active.status !== "PAID" && (
                <div data-testid="eta-banner" className="mt-3 bg-black text-white p-3 flex items-center justify-between">
                  <div>
                    <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-orange-500">Estimated slot</p>
                    <p className="font-display font-bold text-sm">
                      {new Date(active.estimated_start_at).toLocaleString([], { weekday: "short", hour: "2-digit", minute: "2-digit" })}
                      {" → "}
                      {new Date(active.estimated_end_at).toLocaleString([], { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                  <span className="font-mono text-[10px] uppercase tracking-widest text-zinc-400">~ 2h</span>
                </div>
              )}
            </section>

            {active.approval_pending && (
              <section data-testid="approval-card" className="bg-yellow-50 border-2 border-orange-500 p-6">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-6 h-6 text-yellow-700 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <h3 className="font-display font-black text-lg uppercase">Approval needed</h3>
                    <p className="text-sm mt-1">{active.approval_reason}</p>
                    <p className="font-mono text-sm font-bold mt-2">Extra cost: ₹{active.extra_cost}</p>
                    <button
                      data-testid="approve-work-btn"
                      onClick={async () => { await api.post(`/bookings/${active.id}/approve`); toast.success("Approved"); load(); }}
                      className="mt-4 bg-black hover:bg-zinc-800 text-white font-display font-black uppercase tracking-widest px-6 py-3 transition-colors"
                    >Approve →</button>
                  </div>
                </div>
              </section>
            )}

            {active.status === "BILLED" && active.payment_link && !active.paid && (
              <section data-testid="payment-card" className="bg-black text-white p-6">
                <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-orange-500">Total due</p>
                <div className="flex items-baseline gap-1 mt-1">
                  <IndianRupee className="w-7 h-7 text-orange-500" />
                  <span className="font-display font-black text-5xl tracking-tighter">{active.bill_amount}</span>
                </div>
                <a
                  data-testid="pay-bill-btn"
                  href={`/pay/${active.id}`}
                  className="mt-5 inline-flex items-center gap-2 bg-orange-500 hover:bg-orange-400 text-black font-display font-black uppercase tracking-widest px-6 py-3 transition-colors"
                >Pay Now <ExternalLink className="w-4 h-4" /></a>
              </section>
            )}

            {active.paid && (
              <div data-testid="thanks-card" className="bg-emerald-500 text-white p-8 text-center">
                <p className="font-mono text-[10px] uppercase tracking-[0.3em]">Thank you for visiting</p>
                <p className="font-display font-black text-3xl mt-1 tracking-tighter">Drive safe! 🏁</p>
              </div>
            )}

            <section className="bg-white border border-zinc-200 p-6">
              <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-zinc-500 mb-4">Service progress</p>
              <Timeline status={active.status} light />
            </section>

            {active.items && active.items.length > 0 && (
              <section className="bg-white border border-zinc-200 p-6">
                <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-zinc-500 mb-4">Parts used</p>
                {active.items.map((it) => (
                  <div key={it.inventory_id} className="flex justify-between py-2 border-b border-zinc-100 last:border-0">
                    <div>
                      <p className="font-bold text-sm">{it.name}</p>
                      <p className="font-mono text-[10px] text-zinc-500">{it.sku} × {it.qty}</p>
                    </div>
                    <p className="font-mono font-bold">₹{it.subtotal}</p>
                  </div>
                ))}
              </section>
            )}
          </>
        )}
      </main>
    </div>
  );
}
