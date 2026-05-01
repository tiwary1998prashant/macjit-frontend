import { useEffect, useState } from "react";
import api from "../lib/api";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog";
import { CreditCard, Plus, RefreshCw, Bell, ChevronDown, ChevronUp, Check, AlertTriangle } from "lucide-react";

const fmt = (iso) => iso ? new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—";
const pct = (n) => `${Number(n || 0).toFixed(0)}%`;

const statusColor = { active: "text-emerald-400", exhausted: "text-zinc-500", expired: "text-red-400", cancelled: "text-red-500" };

export function DigitalCardsPanel({ isAdmin = false }) {
  const [cards, setCards] = useState([]);
  const [plans, setPlans] = useState([]);
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState("cards");
  const [expanded, setExpanded] = useState(null);
  const [editCard, setEditCard] = useState(null);
  const [reminderCustom, setReminderCustom] = useState({ phone: "", message: "" });
  const [showCustomReminder, setShowCustomReminder] = useState(false);

  const load = async () => {
    try {
      const [c, p] = await Promise.all([api.get("/service-cards"), api.get("/service-card-plans")]);
      setCards(c.data); setPlans(p.data);
    } catch { toast.error("Could not load service cards"); }
  };

  useEffect(() => { load(); }, []);

  const sendReminders = async () => {
    setBusy(true);
    try {
      const r = await api.post("/service-cards/send-reminders");
      toast.success(`Reminders sent: ${r.data.reminders_sent}`);
    } catch (e) { toast.error(e.response?.data?.detail || "Failed"); }
    finally { setBusy(false); }
  };

  const sendCustomReminder = async () => {
    if (!reminderCustom.phone || !reminderCustom.message) return toast.error("Phone and message required");
    setBusy(true);
    try {
      await api.post("/service-cards/remind-custom", reminderCustom);
      toast.success("SMS sent");
      setReminderCustom({ phone: "", message: "" });
      setShowCustomReminder(false);
    } catch (e) { toast.error(e.response?.data?.detail || "Failed"); }
    finally { setBusy(false); }
  };

  const applySlot = async (cardId) => {
    const km = prompt("Enter current KM reading (0 if unknown):", "0");
    if (km === null) return;
    setBusy(true);
    try {
      await api.post(`/service-cards/${cardId}/use-slot`, { current_km: parseInt(km) || 0 });
      toast.success("Service slot marked as used");
      load();
    } catch (e) { toast.error(e.response?.data?.detail || "Failed"); }
    finally { setBusy(false); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex gap-1">
          {["cards", isAdmin ? "plans" : null, "remind"].filter(Boolean).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`font-mono text-[10px] uppercase tracking-widest px-4 py-2 border transition-colors ${tab === t ? "bg-orange-500 text-black border-orange-500" : "border-zinc-700 text-zinc-400 hover:border-orange-500"}`}>
              {t === "cards" ? "All Cards" : t === "plans" ? "Manage Plans" : "Reminders"}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <button onClick={sendReminders} disabled={busy}
            className="flex items-center gap-1 border border-zinc-700 hover:border-orange-500 text-zinc-300 font-mono text-[10px] uppercase tracking-widest px-3 py-2 transition-colors disabled:opacity-50">
            <Bell className="w-3 h-3" /> Send Due Reminders
          </button>
          <IssueCardDialog plans={plans} onCreated={load} />
        </div>
      </div>

      {tab === "cards" && (
        <div className="space-y-2 max-h-[640px] overflow-y-auto">
          {cards.length === 0 && <p className="text-sm text-zinc-500 py-4">No service cards issued yet.</p>}
          {cards.map(c => (
            <div key={c.id} className="border border-zinc-800 bg-zinc-900/40">
              <button onClick={() => setExpanded(expanded === c.id ? null : c.id)}
                className="w-full flex items-center justify-between px-4 py-3 hover:bg-zinc-800/30 transition-colors">
                <div className="flex items-center gap-3 text-left">
                  <CreditCard className="w-4 h-4 text-orange-500 flex-shrink-0" />
                  <div>
                    <p className="font-display font-bold text-sm">
                      {c.customer_name}
                      {c.plate_number && <span className="ml-2 text-zinc-500 font-mono text-xs">{c.plate_number}</span>}
                    </p>
                    <p className="font-mono text-[10px] text-zinc-500">{c.plan_name} · {c.slots_used}/{c.slots_total} slots · {pct(c.discount_pct)} off</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`font-mono text-[10px] uppercase ${statusColor[c.status] || "text-zinc-400"}`}>{c.status}</span>
                  {expanded === c.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </div>
              </button>
              {expanded === c.id && (
                <div className="px-4 pb-4 border-t border-zinc-800 mt-1 pt-3 space-y-3">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs font-mono">
                    <div><p className="text-zinc-500 uppercase text-[10px]">Phone</p><p>{c.customer_phone}</p></div>
                    <div><p className="text-zinc-500 uppercase text-[10px]">Valid From</p><p>{fmt(c.start_date)}</p></div>
                    <div><p className="text-zinc-500 uppercase text-[10px]">Valid Until</p><p>{fmt(c.end_date)}</p></div>
                    <div><p className="text-zinc-500 uppercase text-[10px]">Last Service</p><p>{fmt(c.last_service_date)}</p></div>
                    <div><p className="text-zinc-500 uppercase text-[10px]">Current KM</p><p>{c.current_km || 0}</p></div>
                    <div><p className="text-zinc-500 uppercase text-[10px]">KM Interval</p><p>{c.interval_km || "—"}</p></div>
                    <div><p className="text-zinc-500 uppercase text-[10px]">Month Interval</p><p>{c.interval_months}</p></div>
                    <div><p className="text-zinc-500 uppercase text-[10px]">Price Paid</p><p>₹{c.price_paid}</p></div>
                  </div>
                  {c.offer_note && <p className="text-xs text-orange-400">Offer: {c.offer_note}</p>}
                  {c.notes && <p className="text-xs text-zinc-500">Notes: {c.notes}</p>}
                  <div className="flex flex-wrap gap-2 pt-1">
                    {c.status === "active" && (
                      <button onClick={() => applySlot(c.id)} disabled={busy}
                        className="bg-orange-500 hover:bg-orange-400 text-black font-mono text-[10px] uppercase tracking-widest px-3 py-1.5 transition-colors disabled:opacity-50">
                        ✓ Use Slot
                      </button>
                    )}
                    <EditCardDialog card={c} isAdmin={isAdmin} onSaved={load} />
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {tab === "plans" && isAdmin && <PlansTab plans={plans} onChanged={load} />}

      {tab === "remind" && (
        <div className="space-y-4">
          <div className="border border-zinc-800 bg-zinc-900/40 p-4">
            <p className="font-mono text-xs text-zinc-400 mb-3">Send SMS reminders to all card holders whose service interval is due (based on KM or time).</p>
            <button onClick={sendReminders} disabled={busy}
              className="bg-orange-500 hover:bg-orange-400 disabled:opacity-50 text-black font-mono text-[10px] uppercase tracking-widest px-4 py-2">
              <Bell className="inline w-3 h-3 mr-1" /> Send All Due Reminders
            </button>
          </div>
          <div className="border border-zinc-800 bg-zinc-900/40 p-4">
            <p className="font-mono text-[10px] uppercase tracking-widest text-zinc-500 mb-3">Custom SMS — any customer (with or without card)</p>
            <div className="space-y-2">
              <input placeholder="+91 phone number" value={reminderCustom.phone}
                onChange={e => setReminderCustom(r => ({ ...r, phone: e.target.value }))}
                className="w-full bg-zinc-950 border border-zinc-800 px-3 py-2 font-mono text-sm focus:border-orange-500 outline-none" />
              <textarea placeholder="SMS message (max 300 chars)" maxLength={300} rows={3}
                value={reminderCustom.message}
                onChange={e => setReminderCustom(r => ({ ...r, message: e.target.value }))}
                className="w-full bg-zinc-950 border border-zinc-800 px-3 py-2 font-mono text-sm focus:border-orange-500 outline-none resize-none" />
              <button onClick={sendCustomReminder} disabled={busy}
                className="border border-zinc-700 hover:border-orange-500 text-zinc-300 font-mono text-[10px] uppercase tracking-widest px-4 py-2 transition-colors disabled:opacity-50">
                Send SMS
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function IssueCardDialog({ plans, onCreated }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ plan_id: "", customer_name: "", customer_phone: "", plate_number: "", car_make: "", car_model: "", current_km: "0", notes: "", discount_override: "" });
  const [offerInfo, setOfferInfo] = useState(null);
  const upd = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const checkCustomer = async () => {
    if (!form.customer_phone || form.customer_phone.length < 8) return;
    try {
      const r = await api.get(`/service-cards/check-customer/${encodeURIComponent(form.customer_phone)}`);
      setOfferInfo(r.data);
    } catch { setOfferInfo(null); }
  };

  const submit = async (e) => {
    e.preventDefault(); setBusy(true);
    try {
      const payload = { ...form, current_km: parseInt(form.current_km) || 0 };
      if (payload.discount_override === "") delete payload.discount_override;
      else payload.discount_override = parseFloat(payload.discount_override);
      await api.post("/service-cards", payload);
      toast.success("Service card issued & confirmation SMS sent");
      setOpen(false);
      setForm({ plan_id: "", customer_name: "", customer_phone: "", plate_number: "", car_make: "", car_model: "", current_km: "0", notes: "", discount_override: "" });
      setOfferInfo(null);
      onCreated();
    } catch (err) { toast.error(err.response?.data?.detail || "Failed"); }
    finally { setBusy(false); }
  };

  const activePlans = plans.filter(p => p.active);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button className="flex items-center gap-1 bg-orange-500 hover:bg-orange-400 text-black font-mono text-[10px] uppercase tracking-widest px-3 py-2 transition-colors">
          <Plus className="w-3 h-3" /> Issue Card
        </button>
      </DialogTrigger>
      <DialogContent className="bg-zinc-950 border-zinc-800 text-zinc-100 max-w-lg">
        <DialogHeader><DialogTitle className="font-display font-black uppercase">Issue Digital Service Card</DialogTitle></DialogHeader>
        {activePlans.length === 0 && (
          <div className="flex items-center gap-2 bg-yellow-500/10 border border-yellow-500/30 p-3 text-yellow-400 text-xs font-mono">
            <AlertTriangle className="w-4 h-4" /> No active plans. Admin must create a plan first.
          </div>
        )}
        {offerInfo?.has_active_card && (
          <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 p-3 text-red-400 text-xs font-mono">
            <AlertTriangle className="w-4 h-4" /> Customer already has an active {offerInfo.card?.plan_name} card.
          </div>
        )}
        {offerInfo?.eligible_for_offer && !offerInfo.has_active_card && (
          <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/30 p-3 text-emerald-400 text-xs font-mono">
            <Check className="w-4 h-4" /> Returning customer ({offerInfo.paid_bookings_count} visit{offerInfo.paid_bookings_count !== 1 ? "s" : ""}) — eligible for loyalty offer.
          </div>
        )}
        <form onSubmit={submit} className="space-y-2.5 mt-2">
          <select required value={form.plan_id} onChange={e => upd("plan_id", e.target.value)}
            className="w-full bg-zinc-900 border border-zinc-800 px-3 py-2 font-mono text-sm focus:border-orange-500 outline-none">
            <option value="">Select plan *</option>
            {activePlans.map(p => (
              <option key={p.id} value={p.id}>{p.name} · ₹{p.price} · {p.services_per_year * p.duration_years} services · {p.discount_pct}% off</option>
            ))}
          </select>
          <input required placeholder="Customer name *" value={form.customer_name} onChange={e => upd("customer_name", e.target.value)}
            className="w-full bg-zinc-900 border border-zinc-800 px-3 py-2 font-mono text-sm focus:border-orange-500 outline-none" />
          <input required placeholder="+91 phone * (SMS sent on issue)" value={form.customer_phone}
            onChange={e => upd("customer_phone", e.target.value)} onBlur={checkCustomer}
            className="w-full bg-zinc-900 border border-zinc-800 px-3 py-2 font-mono text-sm focus:border-orange-500 outline-none" />
          <div className="grid grid-cols-2 gap-2">
            <input placeholder="Car make (Hyundai)" value={form.car_make} onChange={e => upd("car_make", e.target.value)}
              className="bg-zinc-900 border border-zinc-800 px-3 py-2 font-mono text-sm focus:border-orange-500 outline-none" />
            <input placeholder="Model (i20)" value={form.car_model} onChange={e => upd("car_model", e.target.value)}
              className="bg-zinc-900 border border-zinc-800 px-3 py-2 font-mono text-sm focus:border-orange-500 outline-none" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <input placeholder="Plate number" value={form.plate_number} onChange={e => upd("plate_number", e.target.value.toUpperCase())}
              className="bg-zinc-900 border border-zinc-800 px-3 py-2 font-mono text-sm focus:border-orange-500 outline-none" />
            <input type="number" min={0} placeholder="Current KM" value={form.current_km} onChange={e => upd("current_km", e.target.value)}
              className="bg-zinc-900 border border-zinc-800 px-3 py-2 font-mono text-sm focus:border-orange-500 outline-none" />
          </div>
          <input type="number" min={0} max={100} step={0.5} placeholder="Discount override % (leave blank = plan default)"
            value={form.discount_override} onChange={e => upd("discount_override", e.target.value)}
            className="w-full bg-zinc-900 border border-zinc-800 px-3 py-2 font-mono text-sm focus:border-orange-500 outline-none" />
          <textarea placeholder="Notes" rows={2} value={form.notes} onChange={e => upd("notes", e.target.value)}
            className="w-full bg-zinc-900 border border-zinc-800 px-3 py-2 font-mono text-sm resize-none focus:border-orange-500 outline-none" />
          <button type="submit" disabled={busy || activePlans.length === 0}
            className="w-full bg-orange-500 hover:bg-orange-400 disabled:opacity-50 text-black font-display font-black uppercase tracking-widest py-2.5">
            {busy ? "Issuing..." : "Issue Card + Send SMS"}
          </button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function EditCardDialog({ card, isAdmin, onSaved }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    discount_pct: String(card.discount_pct || 0),
    offer_note: card.offer_note || "",
    notes: card.notes || "",
    end_date: card.end_date ? card.end_date.slice(0, 10) : "",
    interval_months: String(card.interval_months || 4),
    interval_km: String(card.interval_km || 0),
    status: card.status || "active",
  });
  const upd = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const save = async () => {
    setBusy(true);
    try {
      const payload = {
        discount_pct: parseFloat(form.discount_pct) || 0,
        offer_note: form.offer_note,
        notes: form.notes,
        interval_months: parseInt(form.interval_months) || 4,
        interval_km: parseInt(form.interval_km) || 0,
        status: form.status,
      };
      if (form.end_date) payload.end_date = new Date(form.end_date).toISOString();
      await api.put(`/service-cards/${card.id}`, payload);
      toast.success("Card updated");
      setOpen(false);
      onSaved();
    } catch (e) { toast.error(e.response?.data?.detail || "Failed"); }
    finally { setBusy(false); }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button className="border border-zinc-700 hover:border-orange-500 text-zinc-300 font-mono text-[10px] uppercase tracking-widest px-3 py-1.5 transition-colors">Edit / Extend</button>
      </DialogTrigger>
      <DialogContent className="bg-zinc-950 border-zinc-800 text-zinc-100 max-w-md">
        <DialogHeader><DialogTitle className="font-display font-black uppercase">Edit Card — {card.customer_name}</DialogTitle></DialogHeader>
        <div className="space-y-2.5 mt-2">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="font-mono text-[10px] uppercase text-zinc-500">Discount %</label>
              <input type="number" min={0} max={100} step={0.5} value={form.discount_pct} onChange={e => upd("discount_pct", e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 px-3 py-2 font-mono text-sm focus:border-orange-500 outline-none" />
            </div>
            <div>
              <label className="font-mono text-[10px] uppercase text-zinc-500">Extend Until</label>
              <input type="date" value={form.end_date} onChange={e => upd("end_date", e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 px-3 py-2 font-mono text-sm focus:border-orange-500 outline-none" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="font-mono text-[10px] uppercase text-zinc-500">Month Interval</label>
              <input type="number" min={1} value={form.interval_months} onChange={e => upd("interval_months", e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 px-3 py-2 font-mono text-sm focus:border-orange-500 outline-none" />
            </div>
            <div>
              <label className="font-mono text-[10px] uppercase text-zinc-500">KM Interval</label>
              <input type="number" min={0} value={form.interval_km} onChange={e => upd("interval_km", e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 px-3 py-2 font-mono text-sm focus:border-orange-500 outline-none" />
            </div>
          </div>
          {isAdmin && (
            <div>
              <label className="font-mono text-[10px] uppercase text-zinc-500">Status</label>
              <select value={form.status} onChange={e => upd("status", e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 px-3 py-2 font-mono text-sm focus:border-orange-500 outline-none">
                <option value="active">Active</option>
                <option value="exhausted">Exhausted</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          )}
          <input placeholder="Offer note" value={form.offer_note} onChange={e => upd("offer_note", e.target.value)}
            className="w-full bg-zinc-900 border border-zinc-800 px-3 py-2 font-mono text-sm focus:border-orange-500 outline-none" />
          <textarea placeholder="Internal notes" rows={2} value={form.notes} onChange={e => upd("notes", e.target.value)}
            className="w-full bg-zinc-900 border border-zinc-800 px-3 py-2 font-mono text-sm resize-none focus:border-orange-500 outline-none" />
          <button onClick={save} disabled={busy}
            className="w-full bg-orange-500 hover:bg-orange-400 disabled:opacity-50 text-black font-display font-black uppercase tracking-widest py-2.5">
            {busy ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function PlansTab({ plans, onChanged }) {
  const [editPlan, setEditPlan] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: "", price: "", services_per_year: "3", duration_years: "1", interval_months: "4", interval_km: "0", discount_pct: "0", offer_note: "", active: true });
  const [busy, setBusy] = useState(false);
  const upd = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const createPlan = async (e) => {
    e.preventDefault(); setBusy(true);
    try {
      await api.post("/service-card-plans", {
        ...form, price: parseFloat(form.price), services_per_year: parseInt(form.services_per_year),
        duration_years: parseInt(form.duration_years), interval_months: parseInt(form.interval_months),
        interval_km: parseInt(form.interval_km), discount_pct: parseFloat(form.discount_pct),
      });
      toast.success("Plan created");
      setShowCreate(false);
      setForm({ name: "", price: "", services_per_year: "3", duration_years: "1", interval_months: "4", interval_km: "0", discount_pct: "0", offer_note: "", active: true });
      onChanged();
    } catch (e) { toast.error(e.response?.data?.detail || "Failed"); }
    finally { setBusy(false); }
  };

  const savePlan = async (planId, data) => {
    setBusy(true);
    try {
      await api.put(`/service-card-plans/${planId}`, data);
      toast.success("Plan updated"); setEditPlan(null); onChanged();
    } catch (e) { toast.error(e.response?.data?.detail || "Failed"); }
    finally { setBusy(false); }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button onClick={() => setShowCreate(!showCreate)}
          className="flex items-center gap-1 bg-orange-500 hover:bg-orange-400 text-black font-mono text-[10px] uppercase tracking-widest px-3 py-2">
          <Plus className="w-3 h-3" /> New Plan
        </button>
      </div>
      {showCreate && (
        <form onSubmit={createPlan} className="border border-zinc-800 bg-zinc-900/40 p-4 space-y-3">
          <p className="font-mono text-[10px] uppercase tracking-widest text-orange-500">Create New Plan</p>
          <div className="grid grid-cols-2 gap-2">
            <input required placeholder="Plan name *" value={form.name} onChange={e => upd("name", e.target.value)}
              className="col-span-2 bg-zinc-950 border border-zinc-800 px-3 py-2 font-mono text-sm focus:border-orange-500 outline-none" />
            <input required type="number" min={0} placeholder="Price (₹) *" value={form.price} onChange={e => upd("price", e.target.value)}
              className="bg-zinc-950 border border-zinc-800 px-3 py-2 font-mono text-sm focus:border-orange-500 outline-none" />
            <input type="number" min={1} max={12} placeholder="Services/year" value={form.services_per_year} onChange={e => upd("services_per_year", e.target.value)}
              className="bg-zinc-950 border border-zinc-800 px-3 py-2 font-mono text-sm focus:border-orange-500 outline-none" />
            <select value={form.duration_years} onChange={e => upd("duration_years", e.target.value)}
              className="bg-zinc-950 border border-zinc-800 px-3 py-2 font-mono text-sm focus:border-orange-500 outline-none">
              <option value="1">1 Year</option>
              <option value="2">2 Years</option>
            </select>
            <input type="number" min={1} placeholder="Remind every N months" value={form.interval_months} onChange={e => upd("interval_months", e.target.value)}
              className="bg-zinc-950 border border-zinc-800 px-3 py-2 font-mono text-sm focus:border-orange-500 outline-none" />
            <input type="number" min={0} placeholder="Remind every N km (0=off)" value={form.interval_km} onChange={e => upd("interval_km", e.target.value)}
              className="bg-zinc-950 border border-zinc-800 px-3 py-2 font-mono text-sm focus:border-orange-500 outline-none" />
            <input type="number" min={0} max={100} step={0.5} placeholder="Discount %" value={form.discount_pct} onChange={e => upd("discount_pct", e.target.value)}
              className="bg-zinc-950 border border-zinc-800 px-3 py-2 font-mono text-sm focus:border-orange-500 outline-none" />
            <input placeholder="Offer/benefit note" value={form.offer_note} onChange={e => upd("offer_note", e.target.value)}
              className="col-span-2 bg-zinc-950 border border-zinc-800 px-3 py-2 font-mono text-sm focus:border-orange-500 outline-none" />
          </div>
          <button type="submit" disabled={busy}
            className="bg-orange-500 hover:bg-orange-400 disabled:opacity-50 text-black font-mono text-[10px] uppercase tracking-widest px-4 py-2">
            Create Plan
          </button>
        </form>
      )}
      <div className="space-y-2">
        {plans.length === 0 && <p className="text-sm text-zinc-500">No plans created yet.</p>}
        {plans.map(p => (
          <div key={p.id} className="border border-zinc-800 bg-zinc-900/40 p-4">
            {editPlan === p.id ? (
              <PlanEditForm plan={p} onSave={(d) => savePlan(p.id, d)} onCancel={() => setEditPlan(null)} busy={busy} />
            ) : (
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-display font-bold">{p.name}
                    <span className={`ml-2 font-mono text-[10px] uppercase ${p.active ? "text-emerald-400" : "text-zinc-500"}`}>{p.active ? "Active" : "Inactive"}</span>
                  </p>
                  <p className="font-mono text-xs text-zinc-400 mt-0.5">
                    ₹{p.price} · {p.services_per_year * p.duration_years} services over {p.duration_years}yr · {p.discount_pct}% off · remind every {p.interval_months}mo{p.interval_km ? ` / ${p.interval_km}km` : ""}
                  </p>
                  {p.offer_note && <p className="text-xs text-orange-400 mt-0.5">{p.offer_note}</p>}
                </div>
                <button onClick={() => setEditPlan(p.id)}
                  className="border border-zinc-700 hover:border-orange-500 text-zinc-300 font-mono text-[10px] uppercase tracking-widest px-3 py-1.5 transition-colors flex-shrink-0">Edit</button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function PlanEditForm({ plan, onSave, onCancel, busy }) {
  const [f, setF] = useState({
    name: plan.name, price: String(plan.price), services_per_year: String(plan.services_per_year),
    duration_years: String(plan.duration_years), interval_months: String(plan.interval_months),
    interval_km: String(plan.interval_km || 0), discount_pct: String(plan.discount_pct),
    offer_note: plan.offer_note || "", active: plan.active,
  });
  const upd = (k, v) => setF(p => ({ ...p, [k]: v }));
  const save = () => onSave({
    name: f.name, price: parseFloat(f.price), services_per_year: parseInt(f.services_per_year),
    duration_years: parseInt(f.duration_years), interval_months: parseInt(f.interval_months),
    interval_km: parseInt(f.interval_km), discount_pct: parseFloat(f.discount_pct),
    offer_note: f.offer_note, active: f.active,
  });
  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-2">
        <input value={f.name} onChange={e => upd("name", e.target.value)} placeholder="Plan name"
          className="col-span-2 bg-zinc-950 border border-zinc-800 px-3 py-1.5 font-mono text-sm focus:border-orange-500 outline-none" />
        <input type="number" value={f.price} onChange={e => upd("price", e.target.value)} placeholder="Price ₹"
          className="bg-zinc-950 border border-zinc-800 px-3 py-1.5 font-mono text-sm focus:border-orange-500 outline-none" />
        <input type="number" value={f.discount_pct} onChange={e => upd("discount_pct", e.target.value)} placeholder="Discount %"
          className="bg-zinc-950 border border-zinc-800 px-3 py-1.5 font-mono text-sm focus:border-orange-500 outline-none" />
        <input type="number" value={f.services_per_year} onChange={e => upd("services_per_year", e.target.value)} placeholder="Services/yr"
          className="bg-zinc-950 border border-zinc-800 px-3 py-1.5 font-mono text-sm focus:border-orange-500 outline-none" />
        <select value={f.duration_years} onChange={e => upd("duration_years", e.target.value)}
          className="bg-zinc-950 border border-zinc-800 px-3 py-1.5 font-mono text-sm focus:border-orange-500 outline-none">
          <option value="1">1 Year</option><option value="2">2 Years</option>
        </select>
        <input type="number" value={f.interval_months} onChange={e => upd("interval_months", e.target.value)} placeholder="Month interval"
          className="bg-zinc-950 border border-zinc-800 px-3 py-1.5 font-mono text-sm focus:border-orange-500 outline-none" />
        <input type="number" value={f.interval_km} onChange={e => upd("interval_km", e.target.value)} placeholder="KM interval"
          className="bg-zinc-950 border border-zinc-800 px-3 py-1.5 font-mono text-sm focus:border-orange-500 outline-none" />
        <input value={f.offer_note} onChange={e => upd("offer_note", e.target.value)} placeholder="Offer note"
          className="col-span-2 bg-zinc-950 border border-zinc-800 px-3 py-1.5 font-mono text-sm focus:border-orange-500 outline-none" />
      </div>
      <label className="flex items-center gap-2 font-mono text-xs cursor-pointer">
        <input type="checkbox" checked={f.active} onChange={e => upd("active", e.target.checked)} />
        Active (visible for issuing)
      </label>
      <div className="flex gap-2">
        <button onClick={save} disabled={busy} className="bg-orange-500 hover:bg-orange-400 disabled:opacity-50 text-black font-mono text-[10px] uppercase tracking-widest px-3 py-1.5">Save</button>
        <button onClick={onCancel} className="border border-zinc-700 text-zinc-400 font-mono text-[10px] uppercase tracking-widest px-3 py-1.5">Cancel</button>
      </div>
    </div>
  );
}
