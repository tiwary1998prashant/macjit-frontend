import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../lib/api";
import { Wrench, Check, ShieldCheck, IndianRupee, ExternalLink, Lock, Sparkles } from "lucide-react";
import MacJitLogo from "../components/MacJitLogo";
import { toast } from "sonner";

export default function CheckoutPage() {
  const { bookingId } = useParams();
  const nav = useNavigate();
  const [booking, setBooking] = useState(null);
  const [busy, setBusy] = useState(false);
  const [paid, setPaid] = useState(false);

  useEffect(() => {
    api.get(`/bookings/${bookingId}`).then((r) => {
      setBooking(r.data);
      if (r.data.paid) setPaid(true);
    }).catch(() => toast.error("Booking not found"));
  }, [bookingId]);

  const payNow = async () => {
    setBusy(true);
    try {
      if (booking.payment_link && !booking.payment_link.includes("rzp.io/test")) {
        // real Razorpay link — open it
        window.open(booking.payment_link, "_blank");
      }
      await api.post(`/bookings/${bookingId}/pay`);
      setPaid(true);
      toast.success("Payment received · Thank you!");
    } catch (e) { toast.error("Payment failed — please try again"); }
    finally { setBusy(false); }
  };

  if (!booking) {
    return <div className="min-h-screen bg-zinc-50 grid place-items-center font-mono text-sm text-zinc-500">Loading bill...</div>;
  }

  const items = booking.items || [];
  const itemsTotal = items.reduce((s, i) => s + i.subtotal, 0);

  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-zinc-50 to-zinc-100">
      {/* Header */}
      <header className="border-b border-zinc-200">
        <div className="max-w-2xl mx-auto px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MacJitLogo size={32} />
            <span className="font-display font-black tracking-tighter">MACJIT</span>
          </div>
          <div className="flex items-center gap-1.5 text-zinc-500">
            <Lock className="w-3 h-3" />
            <span className="font-mono text-[10px] uppercase tracking-widest">Secure checkout</span>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-6 py-10">
        {paid ? (
          <div className="text-center py-12">
            <div className="w-20 h-20 mx-auto rounded-full bg-emerald-500 flex items-center justify-center mb-6 animate-bounce">
              <Check className="w-10 h-10 text-white" strokeWidth={3} />
            </div>
            <h1 className="font-display font-black text-4xl tracking-tighter">Payment received</h1>
            <p className="text-zinc-600 mt-3 font-mono text-sm">Thank you for visiting MacJit.<br />Drive safe! 🏁</p>
            <div className="mt-8 inline-block bg-black text-white p-6 text-left">
              <p className="font-mono text-[10px] uppercase tracking-widest text-orange-500">Receipt</p>
              <p className="font-display font-black text-2xl tracking-tighter mt-1">#{bookingId.slice(0, 8).toUpperCase()}</p>
              <p className="font-mono text-sm text-zinc-300 mt-2">{booking.plate_number} · ₹{booking.bill_amount}</p>
              <p className="font-mono text-[10px] text-zinc-500 mt-1">{new Date().toLocaleString()}</p>
            </div>
            <button onClick={() => nav("/")} className="mt-10 font-mono text-[11px] uppercase tracking-widest text-zinc-500 hover:text-black underline underline-offset-8">← Back to MacJit</button>
          </div>
        ) : (
          <>
            <div className="mb-2 flex items-center gap-2">
              <span className="bg-orange-500 text-black font-mono text-[10px] uppercase tracking-widest font-bold px-2 py-0.5">Bill</span>
              <span className="font-mono text-[10px] uppercase tracking-widest text-zinc-500">#{bookingId.slice(0, 8).toUpperCase()}</span>
            </div>
            <h1 className="font-display font-black text-5xl tracking-tighter">Pay for service</h1>
            <p className="text-zinc-500 mt-1 font-mono text-sm">{booking.car_make} {booking.car_model} · {booking.plate_number}</p>

            {/* Bill breakdown */}
            <div className="mt-8 bg-white border border-zinc-200 shadow-sm">
              <div className="p-6">
                <p className="font-mono text-[10px] uppercase tracking-widest text-zinc-500 mb-4">Service breakdown</p>
                <div className="flex justify-between py-2">
                  <span className="text-sm">{booking.service_type.replace("-", " ")} — base</span>
                  <span className="font-mono">₹{(booking.subtotal || 0) - itemsTotal - (booking.extra_cost || 0)}</span>
                </div>
                {items.map((it) => (
                  <div key={it.inventory_id} className="flex justify-between py-2 text-sm">
                    <span>{it.name} <span className="text-zinc-400">× {it.qty}</span></span>
                    <span className="font-mono">₹{it.subtotal}</span>
                  </div>
                ))}
                {booking.extra_cost > 0 && (
                  <div className="flex justify-between py-2 text-sm">
                    <span>Heavy work</span>
                    <span className="font-mono">₹{booking.extra_cost}</span>
                  </div>
                )}
                <div className="border-t border-zinc-200 mt-3 pt-3 flex justify-between text-sm">
                  <span className="text-zinc-500">Subtotal</span>
                  <span className="font-mono">₹{booking.subtotal || booking.bill_amount}</span>
                </div>
                {booking.discount > 0 && (
                  <div className="flex justify-between text-sm text-emerald-600">
                    <span className="flex items-center gap-1"><Sparkles className="w-3 h-3" />{booking.loyalty_tier} loyalty discount ({booking.discount_pct}%)</span>
                    <span className="font-mono">−₹{booking.discount}</span>
                  </div>
                )}
              </div>
              <div className="bg-black text-white p-6 flex items-end justify-between">
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-widest text-zinc-400">Total payable</p>
                  <p className="font-display font-black text-5xl tracking-tighter mt-1 flex items-center"><IndianRupee className="w-9 h-9 text-orange-500" />{booking.bill_amount}</p>
                </div>
                <ShieldCheck className="w-10 h-10 text-orange-500" />
              </div>
            </div>

            {/* Pay button */}
            <button
              data-testid="checkout-pay-btn"
              onClick={payNow}
              disabled={busy}
              className="w-full mt-6 bg-orange-500 hover:bg-orange-400 disabled:opacity-50 text-black font-display font-black uppercase tracking-widest py-5 transition-colors flex items-center justify-center gap-2 text-lg border-b-4 border-orange-700 active:translate-y-1 active:border-b-0"
            >
              {busy ? "Processing..." : <>Pay ₹{booking.bill_amount} now <ExternalLink className="w-5 h-5" /></>}
            </button>

            <p className="mt-4 text-center font-mono text-[10px] uppercase tracking-widest text-zinc-500">Razorpay · UPI · Cards · Netbanking · Wallets</p>

            {/* Trust badges */}
            <div className="mt-8 grid grid-cols-3 gap-px bg-zinc-200 border border-zinc-200">
              <div className="bg-white p-4 text-center"><Lock className="w-4 h-4 mx-auto text-zinc-700" /><p className="font-mono text-[10px] uppercase tracking-widest text-zinc-500 mt-2">256-bit SSL</p></div>
              <div className="bg-white p-4 text-center"><ShieldCheck className="w-4 h-4 mx-auto text-zinc-700" /><p className="font-mono text-[10px] uppercase tracking-widest text-zinc-500 mt-2">PCI DSS</p></div>
              <div className="bg-white p-4 text-center"><Check className="w-4 h-4 mx-auto text-zinc-700" /><p className="font-mono text-[10px] uppercase tracking-widest text-zinc-500 mt-2">RBI Compliant</p></div>
            </div>

            <p className="mt-8 text-center text-xs text-zinc-400 font-mono">Powered by MacJit · Razorpay</p>
          </>
        )}
      </main>
    </div>
  );
}
