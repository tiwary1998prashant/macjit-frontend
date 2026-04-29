import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useGarageWS } from "../hooks/useWebSocket";
import api from "../lib/api";
import { StatusPill } from "../components/StatusPill";
import { StatCard } from "../components/StatCard";
import { NotificationBell } from "../components/NotificationBell";
import { LogOut, Wrench, AlertTriangle, PackageX, Clock, Plus, Trash, Upload, FileSpreadsheet, Mail } from "lucide-react";
import MacJitLogo from "../components/MacJitLogo";
import { toast } from "sonner";
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, CartesianGrid, Tooltip } from "recharts";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "../components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../components/ui/tabs";

export default function AdminPage() {
  const { user, token, logout } = useAuth();
  const [stats, setStats] = useState({});
  const [bookings, setBookings] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [alerts, setAlerts] = useState({ low_stock: [], out_of_stock: [], fifo: [] });
  const [tick, setTick] = useState(0);

  const load = async () => {
    const [s, b, inv, a] = await Promise.all([
      api.get("/admin/stats"), api.get("/bookings"), api.get("/inventory"), api.get("/inventory/alerts"),
    ]);
    setStats(s.data); setBookings(b.data); setInventory(inv.data); setAlerts(a.data);
  };
  useEffect(() => { load(); }, []);
  useGarageWS(token, (e) => { if (e.type !== "connected") { load(); setTick((t) => t + 1); } });

  return (
    <div className="dark min-h-screen bg-zinc-950 text-zinc-100">
      <header className="sticky top-0 z-20 bg-zinc-950/90 backdrop-blur-xl border-b border-zinc-800">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <MacJitLogo size={32} />
            <div>
              <p className="font-display font-black text-lg tracking-tighter">MACJIT <span className="text-orange-500">/ ADMIN</span></p>
              <p className="font-mono text-[10px] uppercase tracking-widest text-zinc-500">{user?.name}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <NotificationBell refreshKey={tick} />
            <button data-testid="logout-btn" onClick={logout} className="p-2 hover:bg-zinc-800 rounded-full"><LogOut className="w-4 h-4" /></button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8 space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-px bg-zinc-800">
          <StatCard testid="admin-stat-serviced" label="Today serviced" value={stats.today_serviced || 0} accent />
          <StatCard testid="admin-stat-revenue" label="Today revenue" value={`₹${stats.today_revenue || 0}`} sub="paid bills" />
          <StatCard testid="admin-stat-active" label="Active bays" value={stats.active_bays || 0} sub="in service" />
          <StatCard testid="admin-stat-low" label="Low + Out stock" value={(stats.low_stock_count || 0) + (stats.out_of_stock_count || 0)} sub="needs attention" />
        </div>

        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="bg-zinc-900 border border-zinc-800 rounded-none p-0 flex-wrap h-auto">
            <TabsTrigger data-testid="tab-overview" value="overview" className="rounded-none data-[state=active]:bg-orange-500 data-[state=active]:text-black font-mono text-xs uppercase tracking-widest">Overview</TabsTrigger>
            <TabsTrigger data-testid="tab-inventory" value="inventory" className="rounded-none data-[state=active]:bg-orange-500 data-[state=active]:text-black font-mono text-xs uppercase tracking-widest">Inventory</TabsTrigger>
            <TabsTrigger data-testid="tab-bookings" value="bookings" className="rounded-none data-[state=active]:bg-orange-500 data-[state=active]:text-black font-mono text-xs uppercase tracking-widest">Bookings</TabsTrigger>
            <TabsTrigger data-testid="tab-pricing" value="pricing" className="rounded-none data-[state=active]:bg-orange-500 data-[state=active]:text-black font-mono text-xs uppercase tracking-widest">Pricing</TabsTrigger>
            <TabsTrigger data-testid="tab-customers" value="customers" className="rounded-none data-[state=active]:bg-orange-500 data-[state=active]:text-black font-mono text-xs uppercase tracking-widest">Customers</TabsTrigger>
            <TabsTrigger data-testid="tab-staff" value="staff" className="rounded-none data-[state=active]:bg-orange-500 data-[state=active]:text-black font-mono text-xs uppercase tracking-widest">Staff</TabsTrigger>
            <TabsTrigger data-testid="tab-enquiries" value="enquiries" className="rounded-none data-[state=active]:bg-orange-500 data-[state=active]:text-black font-mono text-xs uppercase tracking-widest">Enquiries</TabsTrigger>
            <TabsTrigger data-testid="tab-hr" value="hr" className="rounded-none data-[state=active]:bg-orange-500 data-[state=active]:text-black font-mono text-xs uppercase tracking-widest">HR</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-6 grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 border border-zinc-800 bg-zinc-900/40 p-6">
              <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-zinc-500 mb-4">7-day revenue & service velocity</p>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={stats.last_7_days || []}>
                    <CartesianGrid stroke="#27272a" strokeDasharray="3 3" />
                    <XAxis dataKey="date" stroke="#71717a" fontSize={11} tickFormatter={(d) => d?.slice(5)} />
                    <YAxis stroke="#71717a" fontSize={11} />
                    <Tooltip contentStyle={{ background: "#09090b", border: "1px solid #27272a" }} />
                    <Line type="monotone" dataKey="revenue" stroke="#facc15" strokeWidth={2} dot={{ fill: "#facc15" }} />
                    <Line type="monotone" dataKey="serviced" stroke="#22c55e" strokeWidth={2} dot={{ fill: "#22c55e" }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="border border-zinc-800 bg-zinc-900/40 p-6 space-y-4" data-testid="inventory-alert-list">
              <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-zinc-500">Inventory alerts</p>
              {alerts.fifo?.length > 0 && (
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-widest text-blue-400 mb-2 flex items-center gap-1"><Clock className="w-3 h-3" />FIFO · use first</p>
                  {alerts.fifo.map((f) => (
                    <div key={f.id} className="text-xs bg-blue-500/5 border border-blue-500/20 p-2 mb-1">
                      <p className="font-bold">{f.use_first}</p>
                      <p className="font-mono text-[10px] text-zinc-500">stocked {new Date(f.stocked_at).toLocaleDateString()}</p>
                    </div>
                  ))}
                </div>
              )}
              {alerts.out_of_stock?.length > 0 && (
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-widest text-red-400 mb-2 flex items-center gap-1"><PackageX className="w-3 h-3" />Out of stock</p>
                  {alerts.out_of_stock.map((i) => (
                    <div key={i.id} className="text-xs bg-red-500/5 border border-red-500/20 p-2 mb-1">
                      <p className="font-bold">{i.name}</p>
                      <p className="font-mono text-[10px] text-zinc-500">{i.sku}</p>
                    </div>
                  ))}
                </div>
              )}
              {alerts.low_stock?.length > 0 && (
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-widest text-orange-500 mb-2 flex items-center gap-1"><AlertTriangle className="w-3 h-3" />Low stock</p>
                  {alerts.low_stock.map((i) => (
                    <div key={i.id} className="text-xs bg-orange-600/5 border border-orange-600/20 p-2 mb-1">
                      <p className="font-bold">{i.name}</p>
                      <p className="font-mono text-[10px] text-zinc-500">{i.stock} left · threshold {i.low_stock_threshold}</p>
                    </div>
                  ))}
                </div>
              )}
              {!alerts.fifo?.length && !alerts.out_of_stock?.length && !alerts.low_stock?.length && (
                <p className="text-sm text-zinc-500">All inventory healthy ✓</p>
              )}
            </div>
          </TabsContent>

          <TabsContent value="inventory" className="mt-6">
            <InventoryTab inventory={inventory} onChange={load} />
          </TabsContent>

          <TabsContent value="bookings" className="mt-6">
            <div className="border border-zinc-800 bg-zinc-900/40 p-6 space-y-2">
              {bookings.map((b) => (
                <div key={b.id} className="flex items-center justify-between border-b border-zinc-800 py-3 last:border-0">
                  <div>
                    <p className="font-display font-bold">{b.plate_number} <span className="text-zinc-500 text-sm font-normal">· {b.customer_name}</span></p>
                    <p className="font-mono text-xs text-zinc-500">{b.car_make} {b.car_model} · {b.service_type}{b.bay_name ? ` · ${b.bay_name}` : ""}{b.mechanic_name ? ` · ${b.mechanic_name}` : ""}{b.bill_amount ? ` · ₹${b.bill_amount}` : ""}</p>
                  </div>
                  <StatusPill status={b.status} />
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="pricing" className="mt-6"><PricingTab /></TabsContent>
          <TabsContent value="customers" className="mt-6"><CustomersTab /></TabsContent>
          <TabsContent value="staff" className="mt-6"><StaffTab /></TabsContent>
          <TabsContent value="enquiries" className="mt-6"><EnquiriesTab /></TabsContent>
          <TabsContent value="hr" className="mt-6"><HRAdminTab /></TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

const InventoryTab = ({ inventory, onChange }) => {
  return (
    <div className="border border-zinc-800 bg-zinc-900/40 p-6">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-zinc-500">Stock · {inventory.length} items</p>
        <div className="flex items-center gap-2">
          <BulkUploadInventory onDone={onChange} />
          <AddInventoryDialog onDone={onChange} />
        </div>
      </div>
      <div className="space-y-2">
        {inventory.map((i) => {
          const isOut = i.stock <= 0;
          const isLow = !isOut && i.stock <= (i.low_stock_threshold || 5);
          return (
            <div key={i.id} data-testid={`inv-row-${i.id}`} className="flex items-center justify-between bg-zinc-950 border border-zinc-800 px-4 py-3">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="font-bold">{i.name}</p>
                  {isOut && <span className="bg-red-500/10 border border-red-500/30 text-red-400 font-mono text-[10px] uppercase tracking-widest px-2 py-0.5">Out</span>}
                  {isLow && <span className="bg-orange-600/10 border border-orange-600/30 text-orange-500 font-mono text-[10px] uppercase tracking-widest px-2 py-0.5">Low</span>}
                </div>
                <p className="font-mono text-[10px] text-zinc-500">{i.sku} · {i.category} · ₹{i.price} · stocked {i.stocked_at ? new Date(i.stocked_at).toLocaleDateString() : "—"}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-mono font-bold">{i.stock}</span>
                <button data-testid={`inv-del-${i.id}`} onClick={async () => { await api.delete(`/inventory/${i.id}`); toast.success("Removed"); onChange(); }} className="p-2 hover:bg-red-500/10 text-red-400"><Trash className="w-4 h-4" /></button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const BulkUploadInventory = ({ onDone }) => {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);

  const downloadTemplate = () => {
    const csv = "name,sku,category,price,stock,low_stock_threshold\nEngine Oil 5W-30 4L,OIL-NEW-4L,Lubricants,2400,10,5\nBrake Pad Front (Bosch),BRK-PAD-FRT-NEW,Brakes,1850,6,3\n";
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "macjit-inventory-template.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  const upload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true); setResult(null);
    const fd = new FormData();
    fd.append("file", file);
    try {
      const r = await api.post("/inventory/bulk-upload", fd, { headers: { "Content-Type": "multipart/form-data" } });
      setResult(r.data);
      toast.success(`Added ${r.data.added}, updated ${r.data.updated}`);
      onDone();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Upload failed");
    } finally {
      setBusy(false);
      e.target.value = "";
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setResult(null); }}>
      <DialogTrigger asChild>
        <button data-testid="bulk-upload-btn" className="border border-orange-500 text-orange-500 hover:bg-orange-500/10 font-mono text-xs uppercase tracking-widest font-bold px-3 py-1.5 flex items-center gap-1 transition-colors">
          <Upload className="w-3 h-3" /> Bulk Upload
        </button>
      </DialogTrigger>
      <DialogContent className="bg-zinc-950 border-zinc-800 max-w-lg">
        <DialogHeader><DialogTitle className="font-display uppercase">Bulk inventory upload</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <p className="font-mono text-xs text-zinc-400">
            Upload a <span className="text-orange-500">.csv</span> or <span className="text-orange-500">.xlsx</span> file with these columns:
          </p>
          <div className="bg-zinc-900 border border-zinc-800 p-3 font-mono text-[11px] text-zinc-300">
            name, sku, category, price, stock, low_stock_threshold
          </div>
          <p className="font-mono text-[10px] text-zinc-500">
            If a SKU already exists, its stock will be <span className="text-orange-500">incremented</span> and details updated.
          </p>

          <button data-testid="dl-template-btn" onClick={downloadTemplate} className="w-full border border-zinc-700 hover:border-orange-500 text-zinc-300 hover:text-orange-500 font-mono text-xs uppercase tracking-widest py-2.5 flex items-center justify-center gap-2">
            <FileSpreadsheet className="w-3.5 h-3.5" /> Download CSV template
          </button>

          <label data-testid="file-pick-label" className="block border-2 border-dashed border-zinc-700 hover:border-orange-500 p-8 text-center cursor-pointer transition-colors">
            <Upload className="w-8 h-8 text-zinc-500 mx-auto mb-2" />
            <p className="font-mono text-xs text-zinc-300">{busy ? "Uploading..." : "Click to choose .csv or .xlsx"}</p>
            <input data-testid="bulk-file-input" type="file" accept=".csv,.xlsx,.xls" onChange={upload} disabled={busy} className="hidden" />
          </label>

          {result && (
            <div data-testid="bulk-result" className="bg-zinc-900 border border-zinc-800 p-4 space-y-1 font-mono text-xs">
              <p className="text-emerald-400">✓ Added: {result.added}</p>
              <p className="text-orange-400">↻ Updated (existing SKU): {result.updated}</p>
              <p className="text-zinc-400">Total rows: {result.total_rows}</p>
              {result.errors?.length > 0 && (
                <div className="mt-2 pt-2 border-t border-zinc-800">
                  <p className="text-red-400 mb-1">Errors ({result.errors.length}):</p>
                  {result.errors.slice(0, 5).map((er, i) => (
                    <p key={i} className="text-[10px] text-red-300">Row {er.row}: {er.error}</p>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};


const AddInventoryDialog = ({ onDone }) => {
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ name: "", sku: "", category: "", price: "", stock: "", low_stock_threshold: "5" });
  const u = (k, v) => setF({ ...f, [k]: v });
  const submit = async () => {
    try {
      await api.post("/inventory", { ...f, price: parseFloat(f.price), stock: parseInt(f.stock), low_stock_threshold: parseInt(f.low_stock_threshold) });
      toast.success("Item added"); onDone(); setOpen(false);
      setF({ name: "", sku: "", category: "", price: "", stock: "", low_stock_threshold: "5" });
    } catch (e) { toast.error("Failed"); }
  };
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button data-testid="add-inventory-btn" className="bg-orange-500 hover:bg-orange-400 text-black font-mono text-xs uppercase tracking-widest font-bold px-3 py-1.5 flex items-center gap-1 transition-colors">
          <Plus className="w-3 h-3" /> Add Item
        </button>
      </DialogTrigger>
      <DialogContent className="bg-zinc-950 border-zinc-800">
        <DialogHeader><DialogTitle className="font-display uppercase">Add inventory item</DialogTitle></DialogHeader>
        <div className="space-y-2">
          {[["name", "Name"], ["sku", "SKU"], ["category", "Category"], ["price", "Price (₹)"], ["stock", "Stock qty"], ["low_stock_threshold", "Low stock threshold"]].map(([k, lbl]) => (
            <input key={k} data-testid={`inv-input-${k}`} placeholder={lbl} value={f[k]} onChange={(e) => u(k, e.target.value)} className="w-full bg-zinc-900 border border-zinc-800 px-3 py-2 font-mono text-sm" />
          ))}
          <button data-testid="inv-submit" onClick={submit} className="w-full bg-orange-500 hover:bg-orange-400 text-black font-display font-black uppercase tracking-widest py-3">Add</button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

const PricingTab = () => {
  const [items, setItems] = useState([]);
  const load = () => api.get("/pricing").then((r) => setItems(r.data));
  useEffect(() => { load(); }, []);
  const save = async (st, val) => {
    await api.post("/pricing", { service_type: st, base_price: parseFloat(val) || 0 });
    toast.success("Saved"); load();
  };
  return (
    <div className="border border-zinc-800 bg-zinc-900/40 p-6">
      <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-zinc-500 mb-4">Service base prices · charged before parts & extras</p>
      <div className="space-y-2">
        {items.map((p) => (
          <div key={p.service_type} data-testid={`price-row-${p.service_type}`} className="flex items-center justify-between bg-zinc-950 border border-zinc-800 px-4 py-3">
            <div>
              <p className="font-display font-bold uppercase">{p.service_type.replace("-", " ")}</p>
              {p.default && <p className="font-mono text-[10px] text-zinc-500">default · not yet customised</p>}
            </div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-zinc-500">₹</span>
              <input data-testid={`price-input-${p.service_type}`} type="number" defaultValue={p.base_price} onBlur={(e) => save(p.service_type, e.target.value)} className="w-24 bg-zinc-900 border border-zinc-800 px-3 py-2 font-mono text-right" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const CustomersTab = () => {
  const [list, setList] = useState([]);
  const [sel, setSel] = useState(null);
  const [hist, setHist] = useState(null);
  useEffect(() => { api.get("/customers").then((r) => setList(r.data)); }, []);
  const open = async (c) => {
    setSel(c);
    const r = await api.get(`/customers/${c.id}/history`);
    setHist(r.data);
  };
  const tierColor = (t) => ({ GOLD: "bg-orange-600 text-black", SILVER: "bg-zinc-300 text-black", BRONZE: "bg-orange-700 text-white" }[t] || "bg-zinc-700 text-white");
  return (
    <div className="grid lg:grid-cols-2 gap-6">
      <div className="border border-zinc-800 bg-zinc-900/40 p-6">
        <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-zinc-500 mb-4">All customers · {list.length}</p>
        <div className="space-y-2 max-h-[600px] overflow-y-auto">
          {list.map((c) => (
            <button key={c.id} data-testid={`customer-${c.id}`} onClick={() => open(c)} className={`w-full text-left border ${sel?.id === c.id ? "border-orange-500" : "border-zinc-800"} bg-zinc-950 hover:border-zinc-600 px-4 py-3 transition-colors`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-display font-bold">{c.name}</p>
                  <p className="font-mono text-[10px] text-zinc-500">{c.phone || c.username}</p>
                </div>
                <span className={`font-mono text-[10px] uppercase tracking-widest px-2 py-0.5 ${tierColor(c.loyalty_tier || "BRONZE")}`}>{c.loyalty_tier || "BRONZE"}</span>
              </div>
            </button>
          ))}
        </div>
      </div>
      <div className="border border-zinc-800 bg-zinc-900/40 p-6">
        {!hist ? (
          <p className="text-sm text-zinc-500">Select a customer to view history</p>
        ) : (
          <>
            <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-zinc-500">Customer</p>
            <h3 className="font-display font-black text-2xl">{hist.customer.name}</h3>
            <p className="font-mono text-xs text-zinc-400">{hist.customer.phone}</p>
            <div className="grid grid-cols-3 gap-px bg-zinc-800 mt-4 mb-4">
              <div className="bg-zinc-950 p-3"><p className="font-mono text-[10px] text-zinc-500 uppercase tracking-widest">Total spent</p><p className="font-display font-black text-xl text-orange-500">₹{hist.total_spent}</p></div>
              <div className="bg-zinc-950 p-3"><p className="font-mono text-[10px] text-zinc-500 uppercase tracking-widest">Tier</p><p className="font-display font-black text-xl">{hist.loyalty_tier}</p></div>
              <div className="bg-zinc-950 p-3"><p className="font-mono text-[10px] text-zinc-500 uppercase tracking-widest">Discount</p><p className="font-display font-black text-xl text-emerald-400">{hist.discount_pct}%</p></div>
            </div>
            <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-zinc-500 mb-2">Bookings · {hist.bookings.length}</p>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {hist.bookings.map((b) => (
                <div key={b.id} className="bg-zinc-950 border border-zinc-800 px-3 py-2 flex items-center justify-between">
                  <div>
                    <p className="font-display font-bold text-sm">{b.plate_number} <span className="font-normal text-zinc-500">· {b.service_type}</span></p>
                    <p className="font-mono text-[10px] text-zinc-500">{new Date(b.created_at).toLocaleDateString()}{b.bill_amount ? ` · ₹${b.bill_amount}` : ""}</p>
                  </div>
                  <StatusPill status={b.status} />
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

const EnquiriesTab = () => {
  const [list, setList] = useState([]);
  const load = () => api.get("/enquiries").then((r) => setList(r.data)).catch(() => {});
  useEffect(() => { load(); }, []);

  const setStatus = async (id, status) => {
    try { await api.patch(`/enquiries/${id}`, { status }); toast.success("Updated"); load(); }
    catch (e) { toast.error("Failed"); }
  };

  return (
    <div className="border border-zinc-800 bg-zinc-900/40 p-6">
      <div className="flex items-center justify-between mb-4">
        <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-zinc-500">Enquiries · {list.length} total</p>
        <Mail className="w-4 h-4 text-orange-500" />
      </div>
      {list.length === 0 ? (
        <p className="font-mono text-xs text-zinc-500 text-center py-8">No enquiries yet. They'll appear here when customers fill the landing-page form.</p>
      ) : (
        <div className="space-y-2">
          {list.map((e) => (
            <div key={e.id} data-testid={`enq-row-${e.id}`} className="bg-zinc-950 border border-zinc-800 p-4">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div>
                  <p className="font-display font-bold">{e.name} <span className="text-zinc-500 font-mono text-xs ml-2">{e.phone}</span></p>
                  {e.email && <p className="font-mono text-[11px] text-zinc-500">{e.email}</p>}
                  <p className="font-mono text-xs text-zinc-300 mt-1">
                    {(e.car_make || "—") + " " + (e.car_model || "")}
                    {e.service_interest && <span className="text-orange-500"> · {e.service_interest}</span>}
                  </p>
                  {e.message && <p className="text-sm text-zinc-400 mt-2 italic">"{e.message}"</p>}
                </div>
                <div className="flex flex-col items-end gap-2">
                  <span className={`font-mono text-[10px] uppercase tracking-widest px-2 py-0.5 border ${e.status === "new" ? "bg-orange-500/10 border-orange-500/40 text-orange-500" : e.status === "contacted" ? "bg-blue-500/10 border-blue-500/40 text-blue-400" : "bg-zinc-700/30 border-zinc-700 text-zinc-400"}`}>{e.status}</span>
                  <p className="font-mono text-[10px] text-zinc-500">{e.created_at ? new Date(e.created_at).toLocaleString() : ""}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 mt-3 pt-3 border-t border-zinc-800">
                <a href={`tel:${e.phone}`} className="font-mono text-[10px] uppercase tracking-widest text-orange-500 hover:text-orange-400">→ Call</a>
                <span className="text-zinc-700">·</span>
                <a href={`https://wa.me/${(e.phone || "").replace(/[^0-9]/g, "")}`} target="_blank" rel="noopener noreferrer" className="font-mono text-[10px] uppercase tracking-widest text-emerald-500 hover:text-emerald-400">→ WhatsApp</a>
                <span className="flex-1" />
                {e.status !== "contacted" && <button data-testid={`enq-contacted-${e.id}`} onClick={() => setStatus(e.id, "contacted")} className="font-mono text-[10px] uppercase tracking-widest text-blue-400 hover:text-blue-300">Mark contacted</button>}
                {e.status !== "closed" && <button data-testid={`enq-close-${e.id}`} onClick={() => setStatus(e.id, "closed")} className="font-mono text-[10px] uppercase tracking-widest text-zinc-500 hover:text-zinc-300">Close</button>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};


const StaffTab = () => {
  const { user: me } = useAuth();
  const [list, setList] = useState([]);
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ name: "", phone: "", role: "mechanic", password: "" });
  const load = () => api.get("/admin/staff").then((r) => setList(r.data));
  useEffect(() => { load(); }, []);

  const create = async () => {
    if (!f.name || !f.phone) return toast.error("Name + phone required");
    if (f.password && f.password.length < 6) return toast.error("Password must be at least 6 characters");
    try {
      const r = await api.post("/admin/staff", f);
      toast.success(`Created ${f.name} — initial password: ${r.data.initial_password}`);
      load(); setOpen(false); setF({ name: "", phone: "", role: "mechanic", password: "" });
    } catch (e) { toast.error(e.response?.data?.detail || "Failed"); }
  };

  const remove = async (s) => {
    if (s.id === me?.id) return toast.error("You can't remove your own account");
    if (!window.confirm(`Remove ${s.name} (${s.role})? This cannot be undone.`)) return;
    try {
      await api.delete(`/admin/staff/${s.id}`);
      toast.success(`Removed ${s.name}`);
      load();
    } catch (e) { toast.error(e.response?.data?.detail || "Failed"); }
  };

  const resetPwd = async (s) => {
    if (!window.confirm(`Reset password for ${s.name}? They will be forced to set a new one on next login.`)) return;
    try {
      const r = await api.post(`/admin/staff/${s.id}/reset-password`);
      toast.success(`New temp password for ${s.name}: ${r.data.initial_password}`);
      load();
    } catch (e) { toast.error(e.response?.data?.detail || "Failed"); }
  };

  return (
    <div className="border border-zinc-800 bg-zinc-900/40 p-6">
      <div className="flex items-center justify-between mb-4">
        <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-zinc-500">Employees · {list.length}</p>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <button data-testid="add-staff-btn" className="bg-orange-500 hover:bg-orange-400 text-black font-mono text-xs uppercase tracking-widest font-bold px-3 py-1.5 flex items-center gap-1"><Plus className="w-3 h-3" />Add Employee</button>
          </DialogTrigger>
          <DialogContent className="bg-zinc-950 border-zinc-800 space-y-2">
            <DialogHeader><DialogTitle className="font-display uppercase">Onboard new employee</DialogTitle></DialogHeader>
            <input data-testid="staff-name" placeholder="Full name" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} className="w-full bg-zinc-900 border border-zinc-800 px-3 py-2 font-mono text-sm" />
            <input data-testid="staff-phone" placeholder="Phone (e.g. 9876543210)" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} className="w-full bg-zinc-900 border border-zinc-800 px-3 py-2 font-mono text-sm" />
            <select data-testid="staff-role" value={f.role} onChange={(e) => setF({ ...f, role: e.target.value })} className="w-full bg-zinc-900 border border-zinc-800 px-3 py-2 font-mono text-sm">
              <option value="mechanic">Mechanic</option>
              <option value="reception">Reception</option>
              <option value="tester">Tester</option>
              <option value="shopkeeper">Shopkeeper</option>
              <option value="admin">Admin</option>
            </select>
            <input data-testid="staff-password" placeholder="Initial password (leave blank to auto-generate)"
              value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })}
              className="w-full bg-zinc-900 border border-zinc-800 px-3 py-2 font-mono text-sm" />
            <p className="font-mono text-[10px] text-zinc-500">
              The employee signs in with their phone + this password. They will be forced to set a new password on first login.
              The initial password stays visible to you here until they change it. We also text it to them automatically.
            </p>
            <button data-testid="staff-submit" onClick={create} className="w-full bg-orange-500 hover:bg-orange-400 text-black font-display font-black uppercase tracking-widest py-3">Create employee</button>
          </DialogContent>
        </Dialog>
      </div>
      <div className="space-y-2">
        {list.map((s) => (
          <div key={s.id} data-testid={`staff-row-${s.id}`} className="bg-zinc-950 border border-zinc-800 px-4 py-3 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="font-display font-bold truncate">{s.name} {s.id === me?.id && <span className="font-mono text-[10px] text-orange-500 ml-1">(you)</span>}</p>
              <p className="font-mono text-[10px] text-zinc-500 truncate">{s.phone || s.username} · {s.role}</p>
              {s.must_reset_password && s.initial_password && (
                <p className="font-mono text-[10px] text-orange-400 mt-1">
                  Initial password (share with employee): <span className="text-white font-bold">{s.initial_password}</span>
                </p>
              )}
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <span className={`font-mono text-[10px] uppercase tracking-widest px-2 py-0.5 border ${s.active === false ? "border-red-500/40 text-red-400" : "border-emerald-500/40 text-emerald-400"}`}>
                {s.active === false ? "Inactive" : "Active"}
              </span>
              <button
                data-testid={`reset-pwd-${s.id}`}
                onClick={() => resetPwd(s)}
                title="Reset password"
                className="text-zinc-500 hover:text-orange-500 font-mono text-[10px] uppercase tracking-widest border border-zinc-800 hover:border-orange-500 px-2 py-1"
              >Reset pwd</button>
              {s.id !== me?.id && (
                <button
                  data-testid={`remove-staff-${s.id}`}
                  onClick={() => remove(s)}
                  title={`Remove ${s.name}`}
                  className="text-red-400 hover:text-red-300 p-1.5 border border-zinc-800 hover:border-red-500"
                ><Trash className="w-3.5 h-3.5" /></button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};


const HRAdminTab = () => {
  const [pending, setPending] = useState([]);
  const [holidays, setHolidays] = useState([]);
  const [staff, setStaff] = useState([]);
  const [holForm, setHolForm] = useState({ date: "", name: "", type: "public" });
  const [bonusOpen, setBonusOpen] = useState(false);
  const [bonusForm, setBonusForm] = useState({ user_id: "", amount: "", reason: "", event_type: "bonus" });
  const [profOpen, setProfOpen] = useState(false);
  const [profForm, setProfForm] = useState({ user_id: "", monthly_salary: "", designation: "" });

  const load = async () => {
    const [l, h, s] = await Promise.all([
      api.get("/hr/leaves?status=pending"), api.get("/hr/holidays"), api.get("/admin/staff")
    ]);
    setPending(l.data); setHolidays(h.data); setStaff(s.data);
  };
  useEffect(() => { load(); }, []);

  const decide = async (id, decision) => {
    await api.patch(`/hr/leaves/${id}`, { decision, note: "" });
    toast.success(decision); load();
  };
  const addHol = async () => {
    if (!holForm.date || !holForm.name) return toast.error("Date + name");
    await api.post("/hr/holidays", holForm); toast.success("Holiday added");
    setHolForm({ date: "", name: "", type: "public" }); load();
  };
  const delHol = async (id) => { await api.delete(`/hr/holidays/${id}`); load(); };
  const submitBonus = async () => {
    if (!bonusForm.user_id || !bonusForm.amount) return toast.error("Pick employee + amount");
    await api.post("/hr/payroll/event", { ...bonusForm, amount: parseFloat(bonusForm.amount) });
    toast.success("Posted"); setBonusOpen(false);
    setBonusForm({ user_id: "", amount: "", reason: "", event_type: "bonus" });
  };
  const saveProf = async () => {
    if (!profForm.user_id) return;
    await api.patch(`/hr/profile/${profForm.user_id}`, {
      monthly_salary: parseFloat(profForm.monthly_salary) || 0,
      designation: profForm.designation,
      leave_balance: { casual: 12, earned: 15, sick: 8 }
    });
    toast.success("Profile saved"); setProfOpen(false);
    setProfForm({ user_id: "", monthly_salary: "", designation: "" });
  };

  return (
    <div className="space-y-6">
      <div className="grid lg:grid-cols-2 gap-6">
        <div className="border border-zinc-800 bg-zinc-900/40 p-6">
          <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-orange-500 mb-4">Pending leave approvals · {pending.length}</p>
          {pending.length === 0 && <p className="text-sm text-zinc-500">All caught up ✓</p>}
          <div className="space-y-2">
            {pending.map((l) => (
              <div key={l.id} data-testid={`pending-leave-${l.id}`} className="bg-zinc-950 border border-zinc-800 p-3">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="font-display font-bold">{l.user_name} <span className="text-zinc-500 font-normal text-xs">· {l.user_role}</span></p>
                    <p className="font-mono text-xs text-zinc-400 capitalize">{l.leave_type} · {l.start_date} → {l.end_date}</p>
                    <p className="text-xs text-zinc-500 mt-1">{l.reason}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button data-testid={`approve-${l.id}`} onClick={() => decide(l.id, "approved")} className="bg-emerald-500 hover:bg-emerald-400 text-black font-mono text-[10px] uppercase tracking-widest font-bold px-3 py-1.5">Approve</button>
                  <button data-testid={`reject-${l.id}`} onClick={() => decide(l.id, "rejected")} className="bg-red-500 hover:bg-red-400 text-white font-mono text-[10px] uppercase tracking-widest font-bold px-3 py-1.5">Reject</button>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="border border-zinc-800 bg-zinc-900/40 p-6">
          <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-orange-500 mb-4">Holidays</p>
          <div className="grid grid-cols-3 gap-2 mb-3">
            <input data-testid="hol-date" type="date" value={holForm.date} onChange={(e) => setHolForm({ ...holForm, date: e.target.value })} className="bg-zinc-900 border border-zinc-800 px-2 py-2 font-mono text-xs" />
            <input data-testid="hol-name" placeholder="Name" value={holForm.name} onChange={(e) => setHolForm({ ...holForm, name: e.target.value })} className="bg-zinc-900 border border-zinc-800 px-2 py-2 font-mono text-xs" />
            <button data-testid="hol-add" onClick={addHol} className="bg-orange-500 hover:bg-orange-400 text-black font-mono text-[10px] uppercase tracking-widest font-bold">Add</button>
          </div>
          <div className="space-y-1">
            {holidays.map((h) => (
              <div key={h.id} className="bg-zinc-950 border border-zinc-800 p-2 flex items-center justify-between text-sm">
                <span><span className="font-mono text-xs text-orange-500">{h.date}</span> · {h.name}</span>
                <button onClick={() => delHol(h.id)} className="text-red-400 hover:text-red-300 font-mono text-[10px] uppercase">delete</button>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="border border-zinc-800 bg-zinc-900/40 p-6">
        <div className="flex items-center justify-between mb-4">
          <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-orange-500">Salary & bonus actions</p>
          <div className="flex gap-2">
            <Dialog open={profOpen} onOpenChange={setProfOpen}>
              <DialogTrigger asChild><button data-testid="set-salary-btn" className="border border-zinc-700 hover:border-orange-500 hover:text-orange-500 text-zinc-300 font-mono text-[10px] uppercase tracking-widest px-3 py-1.5">Set Salary</button></DialogTrigger>
              <DialogContent className="bg-zinc-950 border-zinc-800">
                <DialogHeader><DialogTitle className="font-display uppercase">Edit employee profile</DialogTitle></DialogHeader>
                <select value={profForm.user_id} onChange={(e) => setProfForm({ ...profForm, user_id: e.target.value })} className="w-full bg-zinc-900 border border-zinc-800 px-3 py-2 font-mono text-sm">
                  <option value="">Select employee</option>
                  {staff.filter((s) => s.role !== "admin").map((s) => <option key={s.id} value={s.id}>{s.name} · {s.role}</option>)}
                </select>
                <input placeholder="Monthly salary (₹)" type="number" value={profForm.monthly_salary} onChange={(e) => setProfForm({ ...profForm, monthly_salary: e.target.value })} className="w-full bg-zinc-900 border border-zinc-800 px-3 py-2 font-mono text-sm" />
                <input placeholder="Designation" value={profForm.designation} onChange={(e) => setProfForm({ ...profForm, designation: e.target.value })} className="w-full bg-zinc-900 border border-zinc-800 px-3 py-2 font-mono text-sm" />
                <button onClick={saveProf} className="w-full bg-orange-500 hover:bg-orange-400 text-black font-display font-black uppercase tracking-widest py-3">Save</button>
              </DialogContent>
            </Dialog>
            <Dialog open={bonusOpen} onOpenChange={setBonusOpen}>
              <DialogTrigger asChild><button data-testid="award-bonus-btn" className="bg-emerald-500 hover:bg-emerald-400 text-black font-mono text-[10px] uppercase tracking-widest font-bold px-3 py-1.5">+ Bonus / Payroll</button></DialogTrigger>
              <DialogContent className="bg-zinc-950 border-zinc-800">
                <DialogHeader><DialogTitle className="font-display uppercase">Post payroll event</DialogTitle></DialogHeader>
                <select data-testid="bonus-user" value={bonusForm.user_id} onChange={(e) => setBonusForm({ ...bonusForm, user_id: e.target.value })} className="w-full bg-zinc-900 border border-zinc-800 px-3 py-2 font-mono text-sm">
                  <option value="">Select employee</option>
                  {staff.filter((s) => s.role !== "admin").map((s) => <option key={s.id} value={s.id}>{s.name} · {s.role}</option>)}
                </select>
                <select data-testid="bonus-type" value={bonusForm.event_type} onChange={(e) => setBonusForm({ ...bonusForm, event_type: e.target.value })} className="w-full bg-zinc-900 border border-zinc-800 px-3 py-2 font-mono text-sm">
                  <option value="bonus">Bonus</option>
                  <option value="extra_work">Extra Work</option>
                  <option value="salary_credited">Salary Credited</option>
                </select>
                <input data-testid="bonus-amount" type="number" placeholder="Amount (₹)" value={bonusForm.amount} onChange={(e) => setBonusForm({ ...bonusForm, amount: e.target.value })} className="w-full bg-zinc-900 border border-zinc-800 px-3 py-2 font-mono text-sm" />
                <input data-testid="bonus-reason" placeholder="Reason / note" value={bonusForm.reason} onChange={(e) => setBonusForm({ ...bonusForm, reason: e.target.value })} className="w-full bg-zinc-900 border border-zinc-800 px-3 py-2 font-mono text-sm" />
                <button data-testid="bonus-submit" onClick={submitBonus} className="w-full bg-orange-500 hover:bg-orange-400 text-black font-display font-black uppercase tracking-widest py-3">Post Event</button>
              </DialogContent>
            </Dialog>
          </div>
        </div>
        <p className="text-xs text-zinc-500">Use these actions to set monthly salary, post bonus, mark extra-work, or record salary credited. Employee gets an in-app notification + WebSocket push.</p>
      </div>
    </div>
  );
};

