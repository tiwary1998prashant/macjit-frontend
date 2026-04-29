import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import api from "../lib/api";
import { StatusPill } from "../components/StatusPill";
import { Timeline } from "../components/Timeline";
import { Wrench, AlertTriangle, IndianRupee, ExternalLink, User, Phone, Search, MessageCircle, ArrowLeft } from "lucide-react";
import MacJitLogo from "../components/MacJitLogo";
import { toast } from "sonner";
import Marquee from "react-fast-marquee";

/**
 * PUBLIC vehicle tracker — no login, no account.
 * Customer enters their vehicle plate number and sees:
 *   - active booking + live status & timeline
 *   - bill (if generated) + Pay Now
 *   - "Send bill on WhatsApp" button (uses Twilio)
 *   - approval prompt (if mechanic raised one)
 */
export default function CustomerPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const nav = useNavigate();
  const initial = (searchParams.get("plate") || "").toUpperCase();

  const [plate, setPlate] = useState(initial);
  const [data, setData] = useState(null);   // { active, history, invoice_url }
  const [busy, setBusy] = useState(false);
  const [searched, setSearched] = useState(false);

  const lookup = async (p = plate) => {
    const q = (p || "").trim().toUpperCase();
    if (!q) return toast.error("Enter your vehicle number");
    setBusy(true); setSearched(true);
    try {
      const r = await api.get("/track", { params: { plate: q } });
      setData(r.data);
      setSearchParams({ plate: q });
    } catch (err) {
      setData(null);
      toast.error(err.response?.data?.detail || "Could not find any booking for that vehicle");
    } finally { setBusy(false); }
  };

  // Auto-lookup if a plate was provided in the URL.
  useEffect(() => { if (initial) lookup(initial); /* eslint-disable-next-line */ }, []);

  // Refresh every 15s while a booking is being viewed and not yet PAID.
  useEffect(() => {
    if (!data?.active || data.active.status === "PAID") return;
    const t = setInterval(() => lookup(plate), 15000);
    return () => clearInterval(t);
    // eslint-disable-next-line
  }, [data?.active?.id]);

  const active = data?.active;

  const approve = async () => {
    setBusy(true);
    try {
      await api.post(`/bookings/${active.id}/approve`, { plate_number: active.plate_number });
      toast.success("Approved — your mechanic can continue.");
      lookup(plate);
    } catch (err) {
      toast.error(err.response?.data?.detail || "Could not approve");
    } finally { setBusy(false); }
  };

  const sendWhatsappBill = async () => {
    setBusy(true);
    try {
      const r = await api.post(`/track/${active.id}/send-bill`, { plate_number: active.plate_number });
      toast.success(`Bill sent on WhatsApp to ${r.data.sent_to}`);
    } catch (err) {
      toast.error(err.response?.data?.detail || "Could not send bill");
    } finally { setBusy(false); }
  };

  return (
    <div className="min-h-screen bg-zinc-100 text-zinc-900">
      <div className="bg-black text-orange-500 py-1.5">
        <Marquee speed={40} gradient={false}>
          <span className="font-mono text-[10px] uppercase tracking-[0.3em] mx-8">TRACK YOUR CAR · NO LOGIN · WHATSAPP BILL · LIVE STATUS · YOUR CAR OUR PRIORITY ·</span>
          <span className="font-mono text-[10px] uppercase tracking-[0.3em] mx-8">TRACK YOUR CAR · NO LOGIN · WHATSAPP BILL · LIVE STATUS · YOUR CAR OUR PRIORITY ·</span>
        </Marquee>
      </div>

      <header className="sticky top-0 z-20 bg-white/80 backdrop-blur-xl border-b border-zinc-200">
        <div className="max-w-3xl mx-auto px-5 py-4 flex items-center justify-between">
          <button onClick={() => nav("/")} className="flex items-center gap-2 group">
            <MacJitLogo size={32} />
            <span className="font-display font-black text-lg tracking-tighter group-hover:text-orange-500">MACJIT</span>
          </button>
          <button onClick={() => nav("/")} className="flex items-center gap-1 font-mono text-[10px] uppercase tracking-widest text-zinc-500 hover:text-orange-500">
            <ArrowLeft className="w-3 h-3" /> Home
          </button>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-5 py-8 space-y-8 pb-20">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-zinc-500">Track your service</p>
          <h1 className="font-display font-black text-4xl sm:text-5xl tracking-tighter mt-1">Vehicle Tracker</h1>
          <p className="font-mono text-xs text-zinc-500 mt-2">Enter the number plate of the car you dropped off.</p>
        </div>

        <form
          onSubmit={(e) => { e.preventDefault(); lookup(); }}
          className="bg-white border border-zinc-200 p-5 flex flex-col sm:flex-row gap-3 shadow-sm"
        >
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
            <input
              data-testid="plate-input"
              autoFocus
              placeholder="e.g. KA-05-MN-2024"
              value={plate}
              onChange={(e) => setPlate(e.target.value.toUpperCase())}
              className="w-full bg-zinc-50 border border-zinc-200 pl-10 pr-4 py-3 font-mono text-base focus:border-orange-500 focus:outline-none uppercase tracking-wide"
            />
          </div>
          <button
            data-testid="plate-search"
            disabled={busy}
            className="bg-orange-500 hover:bg-orange-400 text-black font-display font-black uppercase tracking-widest px-6 py-3 transition-colors disabled:opacity-50"
          >
            {busy ? "Looking..." : "Track →"}
          </button>
        </form>

        {searched && !active && !busy && (
          <div data-testid="no-booking" className="border border-dashed border-zinc-300 p-12 text-center bg-white">
            <Wrench className="w-10 h-10 text-zinc-400 mx-auto mb-3" />
            <p className="font-display font-black text-xl uppercase">No booking found</p>
            <p className="text-sm text-zinc-500 mt-1">Double-check the plate number, or visit the reception desk.</p>
          </div>
        )}

        {active && (
          <>
            <section className="bg-white border border-zinc-200 p-6 shadow-[0_8px_32px_rgba(0,0,0,0.04)]" data-testid="active-booking-card">
              <div className="flex items-start justify-between gap-4 mb-4">
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-zinc-500">Booking for</p>
                  <h2 className="font-display font-black text-2xl mt-0.5">{active.car_make} {active.car_model}</h2>
                  <p className="font-mono text-sm text-zinc-600 mt-0.5">{active.plate_number} · {active.service_type}</p>
                  <p className="font-mono text-xs text-zinc-500 mt-1">Customer: {active.customer_name}</p>
                </div>
                <StatusPill status={active.status} testid="customer-status-pill" />
              </div>

              {(active.mechanic_name || active.bay_name) && (
                <div className="mt-3 pt-3 border-t border-zinc-100 grid grid-cols-2 gap-4 font-mono text-sm">
                  <div data-testid="assigned-mechanic">
                    <p className="text-[10px] uppercase tracking-widest text-zinc-500 flex items-center gap-1"><User className="w-3 h-3"/>Mechanic</p>
                    <p className="font-bold">{active.mechanic_name || "—"}</p>
                    {active.mechanic_phone && (
                      <a href={`tel:${active.mechanic_phone}`} className="text-[11px] text-orange-600 flex items-center gap-1 mt-0.5">
                        <Phone className="w-3 h-3"/>{active.mechanic_phone}
                      </a>
                    )}
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-widest text-zinc-500">Service Bay</p>
                    <p className="font-bold">{active.bay_name || "—"}</p>
                  </div>
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
                      {active.estimated_end_at && new Date(active.estimated_end_at).toLocaleString([], { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
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
                      onClick={approve}
                      disabled={busy}
                      className="mt-4 bg-black hover:bg-zinc-800 text-white font-display font-black uppercase tracking-widest px-6 py-3 transition-colors disabled:opacity-50"
                    >Approve →</button>
                  </div>
                </div>
              </section>
            )}

            {active.status === "BILLED" && !active.paid && (
              <section data-testid="payment-card" className="bg-black text-white p-6">
                <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-orange-500">Total due</p>
                <div className="flex items-baseline gap-1 mt-1">
                  <IndianRupee className="w-7 h-7 text-orange-500" />
                  <span className="font-display font-black text-5xl tracking-tighter">{active.bill_amount}</span>
                </div>
                <div className="flex flex-wrap gap-3 mt-5">
                  <a
                    data-testid="pay-bill-btn"
                    href={`/pay/${active.id}?plate=${encodeURIComponent(active.plate_number || "")}`}
                    className="inline-flex items-center gap-2 bg-orange-500 hover:bg-orange-400 text-black font-display font-black uppercase tracking-widest px-6 py-3 transition-colors"
                  >Pay Now <ExternalLink className="w-4 h-4" /></a>
                  <button
                    data-testid="send-whatsapp-bill"
                    onClick={sendWhatsappBill}
                    disabled={busy}
                    className="inline-flex items-center gap-2 border border-white/30 hover:border-orange-500 hover:text-orange-500 text-white font-display font-black uppercase tracking-widest px-6 py-3 transition-colors disabled:opacity-50"
                  ><MessageCircle className="w-4 h-4" /> Send bill on WhatsApp</button>
                </div>
              </section>
            )}

            {active.paid && (
              <div data-testid="thanks-card" className="bg-emerald-500 text-white p-8 text-center">
                <p className="font-mono text-[10px] uppercase tracking-[0.3em]">Thank you for visiting</p>
                <p className="font-display font-black text-3xl mt-1 tracking-tighter">Drive safe! 🏁</p>
                {data.invoice_url && (
                  <a href={data.invoice_url} target="_blank" rel="noreferrer"
                    className="mt-4 inline-flex items-center gap-2 bg-black text-orange-500 font-display font-black uppercase tracking-widest px-5 py-3">
                    Download Invoice <ExternalLink className="w-3 h-3"/>
                  </a>
                )}
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

            {data?.history?.length > 1 && (
              <section className="bg-white border border-zinc-200 p-6">
                <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-zinc-500 mb-4">Past visits</p>
                <ul className="divide-y divide-zinc-100">
                  {data.history.filter((b) => b.id !== active.id).slice(0, 5).map((b) => (
                    <li key={b.id} className="py-2 flex items-center justify-between text-sm">
                      <div>
                        <p className="font-bold">{b.service_type}</p>
                        <p className="font-mono text-[10px] text-zinc-500">{new Date(b.created_at).toLocaleDateString()}</p>
                      </div>
                      <span className="font-mono text-xs">{b.paid ? `₹${b.bill_amount}` : b.status}</span>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </>
        )}
      </main>
    </div>
  );
}
