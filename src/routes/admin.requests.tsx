import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { STATUSES } from "@/lib/statuses";
import { redispatchRequest } from "@/lib/admin.functions";

export const Route = createFileRoute("/admin/requests")({ component: Requests });

function Requests() {
  const qc = useQueryClient();
  const [status, setStatus] = useState("all");
  const [q, setQ] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const { data: reqs } = useQuery({
    queryKey: ["requests"],
    queryFn: async () => (await supabase.from("requests").select("*, request_items(product_name, quantity)").order("urgent", { ascending: false }).order("created_at", { ascending: false }).limit(1000)).data ?? [],
  });
  const list = (reqs ?? []).filter((r) => (status === "all" || r.status === status) && (!q || `${r.full_name} ${r.phone} ${r.address}`.includes(q)));
  const open = reqs?.find((r) => r.id === openId);

  return (
    <div>
      <h1 className="text-3xl text-primary">ניהול בקשות</h1>
      <div className="mt-4 flex flex-wrap gap-2">
        <Input placeholder="חיפוש שם / טלפון / כתובת" value={q} onChange={(e) => setQ(e.target.value)} className="max-w-xs" />
        <select value={status} onChange={(e) => setStatus(e.target.value)} className="rounded-md border bg-card px-3">
          <option value="all">כל הסטטוסים</option>
          {Object.entries(STATUSES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>
      <div className="mt-4 overflow-x-auto rounded-2xl border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted"><tr className="text-right">{["", "תאריך", "שם", "טלפון", "כתובת", "מוצרים", "התקנה", "סטטוס"].map((h) => <th key={h} className="p-2">{h}</th>)}</tr></thead>
          <tbody>
            {list.map((r) => (
              <tr key={r.id} onClick={() => setOpenId(r.id)} className="cursor-pointer border-t hover:bg-secondary/50">
                <td className="p-2">{r.urgent && "🚨"}</td>
                <td className="p-2 whitespace-nowrap">{new Date(r.created_at).toLocaleDateString("he-IL")}</td>
                <td className="p-2">{r.full_name}</td>
                <td className="p-2" dir="ltr">{r.phone}</td>
                <td className="p-2">{r.address}</td>
                <td className="p-2">{r.request_items.map((i) => `${i.product_name}×${i.quantity}`).join(", ")}</td>
                <td className="p-2">{r.wants_install ? "כן" : "לא"}</td>
                <td className="p-2 whitespace-nowrap">{STATUSES[r.status]}</td>
              </tr>
            ))}
            {list.length === 0 && <tr><td colSpan={8} className="p-6 text-center text-muted-foreground">אין בקשות</td></tr>}
          </tbody>
        </table>
      </div>
      <Dialog open={!!open} onOpenChange={(o) => !o && setOpenId(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          {open && <RequestDetail r={open} onSaved={() => qc.invalidateQueries({ queryKey: ["requests"] })} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function RequestDetail({ r, onSaved }: { r: any; onSaved: () => void }) {
  const [status, setStatus] = useState(r.status);
  const [urgent, setUrgent] = useState(r.urgent);
  const [notes, setNotes] = useState(r.admin_notes ?? "");
  const redispatch = useServerFn(redispatchRequest);
  const { data: events, refetch } = useQuery({
    queryKey: ["events", r.id],
    queryFn: async () => (await supabase.from("request_events").select("*").eq("request_id", r.id).order("created_at")).data ?? [],
  });
  const { data: acts } = useQuery({
    queryKey: ["req-acts", r.activist_ids],
    queryFn: async () => (r.activist_ids.length ? (await supabase.from("activists").select("name, phone").in("id", r.activist_ids)).data : []) ?? [],
  });
  async function save() {
    const { error } = await supabase.from("requests").update({ status, urgent, admin_notes: notes, updated_at: new Date().toISOString() }).eq("id", r.id);
    if (error) return toast.error(error.message);
    if (status !== r.status) await supabase.from("request_events").insert({ request_id: r.id, event: `סטטוס שונה ל: ${STATUSES[status]}` });
    toast.success("נשמר");
    onSaved(); refetch();
  }
  async function resend() {
    try {
      const res = await redispatch({ data: { id: r.id } });
      toast.success(`נשלח ל-${res.sentTo} פעילים`);
      onSaved(); refetch();
    } catch (e) { toast.error(e instanceof Error ? e.message : "שגיאה"); }
  }
  return (
    <div className="space-y-3">
      <DialogHeader><DialogTitle className="text-2xl">{r.full_name}</DialogTitle></DialogHeader>
      <p dir="ltr" className="text-right">{r.phone}</p>
      <p>{r.address}</p>
      <p><b>מוצרים:</b> {r.request_items.map((i: any) => `${i.product_name}×${i.quantity}`).join(", ")} · <b>התקנה:</b> {r.wants_install ? "כן" : "לא"}</p>
      {r.notes && <p><b>הערות המזמין:</b> {r.notes}</p>}
      <p><b>פעילים שקיבלו:</b> {acts?.map((a) => `${a.name} (${a.phone})`).join(", ") || "—"}</p>
      <div className="flex gap-2">
        <select value={status} onChange={(e) => setStatus(e.target.value)} className="flex-1 rounded-md border px-3 py-2">
          {Object.entries(STATUSES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <label className="flex items-center gap-1"><input type="checkbox" checked={urgent} onChange={(e) => setUrgent(e.target.checked)} /> דחופה</label>
      </div>
      <Textarea placeholder="הערות מנהל" value={notes} onChange={(e) => setNotes(e.target.value)} />
      <div className="flex gap-2">
        <Button onClick={save}>שמירה</Button>
        <Button variant="secondary" onClick={resend}>שליחה מחדש לפעילים</Button>
      </div>
      <div>
        <h3 className="mt-4 text-lg">היסטוריה</h3>
        <ul className="mt-2 space-y-1 text-sm">{events?.map((e) => <li key={e.id}><span className="text-muted-foreground">{new Date(e.created_at).toLocaleString("he-IL")}</span> – {e.event}</li>)}</ul>
      </div>
    </div>
  );
}
