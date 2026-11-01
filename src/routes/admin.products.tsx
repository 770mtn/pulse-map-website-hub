import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export const Route = createFileRoute("/admin/products")({ component: Products });

type P = { id?: string; name: string; description: string; image_url: string; price: number | null; special_price: number | null; available: boolean; orderable: boolean; installable: boolean; visible: boolean; sort_order: number };
const empty: P = { name: "", description: "", image_url: "", price: 0, special_price: null, available: true, orderable: true, installable: false, visible: true, sort_order: 0 };

function Products() {
  const qc = useQueryClient();
  const [f, setF] = useState<P | null>(null);
  const [uploading, setUploading] = useState(false);
  const { data } = useQuery({ queryKey: ["admin-products"], queryFn: async () => (await supabase.from("products").select("*").order("sort_order")).data ?? [] });

  async function upload(file: File) {
    setUploading(true);
    try {
      const bmp = await createImageBitmap(file);
      const scale = Math.min(1, 900 / Math.max(bmp.width, bmp.height));
      const c = document.createElement("canvas");
      c.width = Math.round(bmp.width * scale);
      c.height = Math.round(bmp.height * scale);
      c.getContext("2d")!.drawImage(bmp, 0, 0, c.width, c.height);
      const url = c.toDataURL("image/jpeg", 0.8);
      setF((x) => x && { ...x, image_url: url });
    } catch {
      toast.error("לא ניתן לטעון את התמונה");
    } finally {
      setUploading(false);
    }
  }
  async function save() {
    if (!f) return;
    const { id, ...row } = f;
    const { error } = id ? await supabase.from("products").update(row).eq("id", id) : await supabase.from("products").insert(row);
    if (error) return toast.error(error.message);
    toast.success("נשמר");
    setF(null);
    qc.invalidateQueries({ queryKey: ["admin-products"] });
    qc.invalidateQueries({ queryKey: ["public-products"] });
  }
  async function remove(id: string) {
    if (!confirm("למחוק את המוצר? (אפשר גם רק להסתיר)")) return;
    await supabase.from("products").delete().eq("id", id);
    setF(null);
    qc.invalidateQueries({ queryKey: ["admin-products"] });
  }
  const bool = (k: keyof P, label: string) => f && (
    <label className="flex items-center gap-2"><Switch checked={!!f[k]} onCheckedChange={(v) => setF({ ...f, [k]: v })} />{label}</label>
  );

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-3xl text-primary">ניהול מוצרים</h1>
        <Button onClick={() => setF(empty)}>+ מוצר חדש</Button>
      </div>
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {data?.map((p) => (
          <button key={p.id} onClick={() => setF({ ...p, description: p.description ?? "", image_url: p.image_url ?? "" })} className={`rounded-2xl border bg-card p-4 text-right shadow-sm hover:shadow-md ${!p.visible ? "opacity-50" : ""}`}>
            {p.image_url && <img src={p.image_url} alt="" className="mb-2 h-32 w-full rounded-lg object-cover" />}
            <div className="text-xl font-bold">{p.name}</div>
            <div className="text-sm text-muted-foreground">סדר: {p.sort_order} · {p.visible ? "מוצג" : "מוסתר"} · {p.available ? "זמין" : "לא זמין"}</div>
          </button>
        ))}
      </div>
      <Dialog open={!!f} onOpenChange={(o) => !o && setF(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{f?.id ? "עריכת מוצר" : "מוצר חדש"}</DialogTitle></DialogHeader>
          {f && (
            <div className="space-y-3">
              <div><Label>שם</Label><Input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></div>
              <div><Label>תיאור</Label><Textarea value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} /></div>
              <div><Label>תמונה</Label><Input type="file" accept="image/*" onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} disabled={uploading} />
                {f.image_url && <img src={f.image_url} alt="" className="mt-2 h-24 rounded" />}</div>
              <div className="grid grid-cols-3 gap-2">
                <div><Label>מחיר</Label><Input type="number" value={f.price ?? ""} onChange={(e) => setF({ ...f, price: e.target.value === "" ? null : Number(e.target.value) })} /></div>
                <div><Label>מחיר מיוחד</Label><Input type="number" value={f.special_price ?? ""} onChange={(e) => setF({ ...f, special_price: e.target.value === "" ? null : Number(e.target.value) })} /></div>
                <div><Label>סדר הופעה</Label><Input type="number" value={f.sort_order} onChange={(e) => setF({ ...f, sort_order: Number(e.target.value) })} /></div>
              </div>
              {bool("visible", "מוצג באתר")}
              {bool("available", "זמין במלאי")}
              {bool("orderable", "ניתן להזמין")}
              {bool("installable", "ניתן להזמין עם התקנה")}
              <div className="flex gap-2">
                <Button onClick={save}>שמירה</Button>
                {f.id && <Button variant="destructive" onClick={() => remove(f.id!)}>מחיקה</Button>}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
