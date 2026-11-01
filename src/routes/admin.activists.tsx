import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { geocodeAddress } from "@/lib/admin.functions";
import { normalizePhone, isValidIsraeliPhone } from "@/lib/geo";

export const Route = createFileRoute("/admin/activists")({ component: Activists });

type Form = { id?: string; name: string; phone: string; address: string; city: string; lat: number | null; lng: number | null; service_radius_km: number; does_install: boolean; active: boolean; notes: string };
const empty: Form = { name: "", phone: "", address: "", city: "", lat: null, lng: null, service_radius_km: 10, does_install: false, active: true, notes: "" };

function Activists() {
  const qc = useQueryClient();
  const [form, setForm] = useState<Form | null>(null);
  const [q, setQ] = useState("");
  const geocode = useServerFn(geocodeAddress);
  const { data } = useQuery({ queryKey: ["activists"], queryFn: async () => (await supabase.from("activists").select("*").order("name")).data ?? [] });
  const list = (data ?? []).filter((a) => !q || `${a.name} ${a.phone} ${a.city}`.includes(q));

  async function save() {
    if (!form) return;
    if (!isValidIsraeliPhone(form.phone)) return toast.error("טלפון לא תקין");
    let f = { ...form, phone: normalizePhone(form.phone) };
    try {
      if (f.address && (f.lat == null || f.address !== data?.find((a) => a.id === f.id)?.address)) {
        const g = await geocode({ data: { address: f.address } });
        f = { ...f, address: g.address, lat: g.lat, lng: g.lng, city: f.city || g.city };
      }
    } catch (e) { return toast.error(e instanceof Error ? e.message : "שגיאת כתובת"); }
    const { id, ...row } = f;
    const { error } = id ? await supabase.from("activists").update(row).eq("id", id) : await supabase.from("activists").insert(row);
    if (error) return toast.error(error.message);
    toast.success("נשמר");
    setForm(null);
    qc.invalidateQueries({ queryKey: ["activists"] });
  }
  async function toggle(id: string, active: boolean) {
    await supabase.from("activists").update({ active }).eq("id", id);
    qc.invalidateQueries({ queryKey: ["activists"] });
  }
  async function remove(id: string) {
    if (!confirm("למחוק את הפעיל?")) return;
    await supabase.from("activists").delete().eq("id", id);
    setForm(null);
    qc.invalidateQueries({ queryKey: ["activists"] });
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-3xl text-primary">ניהול פעילים</h1>
        <Button onClick={() => setForm(empty)}>+ הוספת פעיל</Button>
      </div>
      <Input className="mt-4 max-w-xs" placeholder="חיפוש" value={q} onChange={(e) => setQ(e.target.value)} />
      <div className="mt-4 overflow-x-auto rounded-2xl border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted"><tr className="text-right">{["שם", "טלפון", "עיר", "רדיוס", "מתקין", "זמין"].map((h) => <th key={h} className="p-2">{h}</th>)}</tr></thead>
          <tbody>
            {list.map((a) => (
              <tr key={a.id} className="border-t hover:bg-secondary/50">
                <td className="cursor-pointer p-2 font-semibold text-primary underline" onClick={() => setForm({ ...a, address: a.address ?? "", city: a.city ?? "", notes: a.notes ?? "", service_radius_km: Number(a.service_radius_km) })}>{a.name}</td>
                <td className="p-2" dir="ltr">{a.phone}</td>
                <td className="p-2">{a.city}{a.lat == null && <span className="text-destructive"> (אין מיקום)</span>}</td>
                <td className="p-2">{a.service_radius_km} ק״מ</td>
                <td className="p-2">{a.does_install ? "✔" : ""}</td>
                <td className="p-2"><Switch checked={a.active} onCheckedChange={(v) => toggle(a.id, v)} /></td>
              </tr>
            ))}
            {list.length === 0 && <tr><td colSpan={6} className="p-6 text-center text-muted-foreground">אין פעילים עדיין</td></tr>}
          </tbody>
        </table>
      </div>
      <Dialog open={!!form} onOpenChange={(o) => !o && setForm(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{form?.id ? "עריכת פעיל" : "פעיל חדש"}</DialogTitle></DialogHeader>
          {form && (
            <div className="space-y-3">
              <div><Label>שם</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
              <div><Label>טלפון (יקבל SMS)</Label><Input dir="ltr" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
              <div><Label>כתובת / מרכז אזור השירות</Label><Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value, lat: null })} placeholder="רחוב, עיר" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>עיר</Label><Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} /></div>
                <div><Label>רדיוס שירות (ק״מ)</Label><Input type="number" min={1} max={200} value={form.service_radius_km} onChange={(e) => setForm({ ...form, service_radius_km: Number(e.target.value) })} /></div>
              </div>
              <label className="flex items-center gap-2"><Switch checked={form.does_install} onCheckedChange={(v) => setForm({ ...form, does_install: v })} /> מבצע התקנות</label>
              <label className="flex items-center gap-2"><Switch checked={form.active} onCheckedChange={(v) => setForm({ ...form, active: v })} /> זמין לקבל בקשות</label>
              <div><Label>הערות</Label><Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
              <div className="flex gap-2">
                <Button onClick={save}>שמירה</Button>
                {form.id && <Button variant="destructive" onClick={() => remove(form.id!)}>מחיקה</Button>}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
