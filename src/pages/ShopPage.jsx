import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useGarageWS } from "../hooks/useWebSocket";
import api from "../lib/api";
import { NotificationBell } from "../components/NotificationBell";
import { StatCard } from "../components/StatCard";
import { LogOut, Wrench, Search, Plus, Minus, ShoppingCart, IndianRupee, X, Receipt } from "lucide-react";
import MacJitLogo from "../components/MacJitLogo";
import { toast } from "sonner";

export default function ShopPage() {
  const { user, token, logout } = useAuth();
  const [inventory, setInventory] = useState([]);
  const [search, setSearch] = useState("");
  const [cart, setCart] = useState([]); // [{id, name, sku, price, qty, stock}]
  const [customer, setCustomer] = useState({ name: "", phone: "" });
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [sales, setSales] = useState([]);
  const [stats, setStats] = useState({});
  const [tick, setTick] = useState(0);
  const [lastSale, setLastSale] = useState(null);

  const load = async () => {
    const [inv, sl, st] = await Promise.all([
      api.get("/inventory"), api.get("/shop/sales"), api.get("/shop/stats"),
    ]);
    setInventory(inv.data); setSales(sl.data); setStats(st.data);
  };
  useEffect(() => { load(); }, []);
  useGarageWS(token, (e) => { if (e.type === "SHOP_SALE") { load(); setTick((t) => t + 1); } });

  const filtered = inventory.filter((i) => i.stock > 0 && (i.name.toLowerCase().includes(search.toLowerCase()) || i.sku.toLowerCase().includes(search.toLowerCase())));
  const cartTotal = cart.reduce((s, c) => s + c.price * c.qty, 0);

  const addToCart = (it) => {
    setCart((prev) => {
      const found = prev.find((p) => p.id === it.id);
      if (found) {
        if (found.qty >= it.stock) { toast.error("No more stock"); return prev; }
        return prev.map((p) => p.id === it.id ? { ...p, qty: p.qty + 1 } : p);
      }
      return [...prev, { id: it.id, name: it.name, sku: it.sku, price: it.price, qty: 1, stock: it.stock }];
    });
  };
  const decQty = (id) => setCart((prev) => prev.flatMap((p) => p.id === id ? (p.qty > 1 ? [{ ...p, qty: p.qty - 1 }] : []) : [p]));
  const removeFromCart = (id) => setCart((prev) => prev.filter((p) => p.id !== id));

  const checkout = async () => {
    if (cart.length === 0) return toast.error("Cart is empty");
    try {
      const r = await api.post("/shop/sales", {
        customer_name: customer.name,
        customer_phone: customer.phone,
        items: cart.map((c) => ({ inventory_id: c.id, qty: c.qty })),
        payment_method: paymentMethod,
      });
      toast.success(`Sale ₹${r.data.total} ${paymentMethod === "cash" ? "received" : "link sent"}`);
      setLastSale(r.data);
      setCart([]); setCustomer({ name: "", phone: "" });
      load();
    } catch (e) { toast.error(e.response?.data?.detail || "Checkout failed"); }
  };

  return (
    <div className="dark min-h-screen bg-zinc-950 text-zinc-100">
      <header className="sticky top-0 z-20 bg-zinc-950/90 backdrop-blur-xl border-b border-zinc-800">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <MacJitLogo size={32} />
            <div>
              <p className="font-display font-black text-lg tracking-tighter">MACJIT <span className="text-orange-500">/ SHOP</span></p>
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

      <main className="max-w-7xl mx-auto px-6 py-6 space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-zinc-800">
          <StatCard testid="shop-stat-today" label="Today sales" value={stats.today_count || 0} accent />
          <StatCard testid="shop-stat-revenue" label="Today revenue" value={`₹${stats.today_revenue || 0}`} />
          <StatCard testid="shop-stat-pending" label="Unpaid" value={stats.pending_count || 0} sub="awaiting payment" />
          <StatCard testid="shop-stat-total" label="All-time" value={stats.total_sales || 0} sub="counter sales" />
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Catalog */}
          <div className="lg:col-span-2 border border-zinc-800 bg-zinc-900/40 p-6">
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
              <input data-testid="shop-search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search parts (SKU, name)..." className="w-full bg-zinc-950 border border-zinc-800 pl-10 pr-3 py-2.5 font-mono text-sm focus:border-orange-500 outline-none" />
            </div>
            <div className="grid sm:grid-cols-2 gap-2 max-h-[600px] overflow-y-auto">
              {filtered.map((i) => (
                <button key={i.id} data-testid={`shop-item-${i.id}`} onClick={() => addToCart(i)} className="text-left bg-zinc-950 border border-zinc-800 hover:border-orange-500 transition-colors p-3 flex items-center justify-between">
                  <div>
                    <p className="font-display font-bold text-sm">{i.name}</p>
                    <p className="font-mono text-[10px] text-zinc-500">{i.sku} · stock {i.stock}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-display font-black">₹{i.price}</span>
                    <span className="bg-orange-500 text-black p-1.5"><Plus className="w-3 h-3" /></span>
                  </div>
                </button>
              ))}
              {filtered.length === 0 && <p className="text-sm text-zinc-500 col-span-2">No matching items</p>}
            </div>
          </div>

          {/* Cart */}
          <aside className="border border-zinc-800 bg-zinc-900/40 p-6 sticky top-24 self-start">
            <div className="flex items-center gap-2 mb-3">
              <ShoppingCart className="w-4 h-4 text-orange-500" />
              <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-orange-500">Cart · {cart.length}</p>
            </div>
            {cart.length === 0 ? (
              <p className="text-sm text-zinc-500 mb-4">Click items to add</p>
            ) : (
              <div className="space-y-2 mb-4 max-h-72 overflow-y-auto">
                {cart.map((c) => (
                  <div key={c.id} data-testid={`cart-item-${c.id}`} className="bg-zinc-950 border border-zinc-800 px-3 py-2 flex items-center justify-between">
                    <div className="flex-1">
                      <p className="text-sm font-bold truncate">{c.name}</p>
                      <p className="font-mono text-[10px] text-zinc-500">₹{c.price} × {c.qty}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <button data-testid={`cart-dec-${c.id}`} onClick={() => decQty(c.id)} className="p-1 hover:bg-zinc-800"><Minus className="w-3 h-3" /></button>
                      <span className="font-mono text-sm w-5 text-center">{c.qty}</span>
                      <button data-testid={`cart-inc-${c.id}`} onClick={() => addToCart({ ...c, stock: c.stock })} className="p-1 hover:bg-zinc-800"><Plus className="w-3 h-3" /></button>
                      <button data-testid={`cart-remove-${c.id}`} onClick={() => removeFromCart(c.id)} className="p-1 hover:bg-red-500/10 text-red-400"><X className="w-3 h-3" /></button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="border-t border-zinc-800 pt-3 mb-3">
              <input data-testid="shop-customer-name" placeholder="Customer name (optional)" value={customer.name} onChange={(e) => setCustomer({ ...customer, name: e.target.value })} className="w-full bg-zinc-950 border border-zinc-800 px-3 py-2 font-mono text-sm mb-2" />
              <input data-testid="shop-customer-phone" placeholder="Phone (for SMS bill)" value={customer.phone} onChange={(e) => setCustomer({ ...customer, phone: e.target.value })} className="w-full bg-zinc-950 border border-zinc-800 px-3 py-2 font-mono text-sm" />
            </div>

            <div className="flex gap-2 mb-3">
              <button data-testid="pay-cash" onClick={() => setPaymentMethod("cash")} className={`flex-1 font-mono text-[10px] uppercase tracking-widest font-bold py-2 ${paymentMethod === "cash" ? "bg-orange-500 text-black" : "bg-zinc-950 border border-zinc-800 text-zinc-400"}`}>Cash</button>
              <button data-testid="pay-rzp" onClick={() => setPaymentMethod("razorpay")} className={`flex-1 font-mono text-[10px] uppercase tracking-widest font-bold py-2 ${paymentMethod === "razorpay" ? "bg-orange-500 text-black" : "bg-zinc-950 border border-zinc-800 text-zinc-400"}`}>Razorpay Link</button>
            </div>

            <div className="flex items-baseline justify-between mb-3">
              <span className="font-mono text-[10px] uppercase tracking-widest text-zinc-500">Total</span>
              <span className="font-display font-black text-3xl text-orange-500 flex items-center"><IndianRupee className="w-6 h-6" />{cartTotal}</span>
            </div>
            <button data-testid="checkout-btn" onClick={checkout} disabled={cart.length === 0} className="w-full bg-orange-500 hover:bg-orange-400 disabled:opacity-30 disabled:cursor-not-allowed text-black font-display font-black uppercase tracking-widest py-4 transition-colors">Checkout · {paymentMethod === "cash" ? "Collect Cash" : "Send Pay Link"}</button>

            {lastSale && (
              <div data-testid="last-sale" className="mt-4 bg-emerald-500/10 border border-emerald-500/30 p-3">
                <p className="font-mono text-[10px] uppercase tracking-widest text-emerald-400 flex items-center gap-1"><Receipt className="w-3 h-3" />Last Sale</p>
                <p className="font-display font-bold mt-1">#{lastSale.id.slice(0, 8)} · ₹{lastSale.total}</p>
                {lastSale.payment_link && <a href={lastSale.payment_link} target="_blank" rel="noreferrer" className="text-xs text-orange-500 underline">Open Razorpay link</a>}
              </div>
            )}
          </aside>
        </div>

        {/* Recent sales */}
        <div className="border border-zinc-800 bg-zinc-900/40 p-6">
          <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-zinc-500 mb-3">Recent counter sales</p>
          <div className="space-y-2">
            {sales.slice(0, 10).map((s) => (
              <div key={s.id} className="bg-zinc-950 border border-zinc-800 p-3 flex items-center justify-between">
                <div>
                  <p className="font-display font-bold">{s.customer_name} <span className="text-zinc-500 font-normal text-xs">· {s.items.length} item(s)</span></p>
                  <p className="font-mono text-[10px] text-zinc-500">{new Date(s.created_at).toLocaleString()} · {s.payment_method}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-display font-bold">₹{s.total}</span>
                  <span className={`font-mono text-[10px] uppercase tracking-widest px-2 py-0.5 ${s.paid ? "bg-emerald-500/10 border border-emerald-500/30 text-emerald-400" : "bg-orange-600/10 border border-orange-600/30 text-orange-500"}`}>{s.paid ? "Paid" : "Unpaid"}</span>
                  {!s.paid && <button data-testid={`mark-paid-${s.id}`} onClick={async () => { await api.post(`/shop/sales/${s.id}/pay`); load(); }} className="bg-emerald-500 hover:bg-emerald-400 text-black font-mono text-[10px] uppercase tracking-widest font-bold px-2 py-1">Mark Paid</button>}
                </div>
              </div>
            ))}
            {sales.length === 0 && <p className="text-sm text-zinc-500">No counter sales yet</p>}
          </div>
        </div>
      </main>
    </div>
  );
}
