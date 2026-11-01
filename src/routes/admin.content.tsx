import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SITE_TEXTS, siteContentQuery, withDefaults } from "@/lib/site-content";
import heroDefault from "@/assets/hero-flags.jpg";

export const Route = createFileRoute("/admin/content")({ component: ContentPage });

async function compressImage(file: File): Promise<string> {
  const img = await createImageBitmap(file);
  const scale = Math.min(1, 1800 / img.width);
  const c = document.createElement("canvas");
  c.width = Math.round(img.width * scale);
  c.height = Math.round(img.height * scale);
  c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
  return c.toDataURL("image/jpeg", 0.8);
}

function ContentPage() {
  const qc = useQueryClient();
  const { data } = useQuery(siteContentQuery);
  const [vals, setVals] = useState<Record<string, string> | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (data && !vals) setVals(withDefaults(data)); }, [data, vals]);
  if (!vals) return null;

  async function upsert(rows: { key: string; value: string }[]) {
    const { error } = await supabase.from("site_content").upsert(rows.map((r) => ({ ...r, updated_at: new Date().toISOString() })));
    if (error) throw error;
    await qc.invalidateQueries({ queryKey: ["site-content"] });
  }
  async function saveAll() {
    setBusy(true);
    try {
      await upsert(Object.keys(SITE_TEXTS).map((k) => ({ key: k, value: vals![k] ?? "" })));
      toast.success("הטקסטים נשמרו");
    } catch (e) { toast.error(e instanceof Error ? e.message : "שגיאה"); }
    finally { setBusy(false); }
  }
  async function onImage(file: File) {
    setBusy(true);
    try {
      const url = await compressImage(file);
      await upsert([{ key: "hero_image", value: url }]);
      setVals({ ...vals!, hero_image: url });
      toast.success("התמונה עודכנה");
    } catch (e) { toast.error(e instanceof Error ? e.message : "שגיאה"); }
    finally { setBusy(false); }
  }
  async function resetImage() {
    await upsert([{ key: "hero_image", value: "" }]);
    setVals({ ...vals!, hero_image: "" });
    toast.success("הוחזרה התמונה המקורית");
  }

  const groups: Record<string, string[]> = {};
  for (const [k, [, , g]] of Object.entries(SITE_TEXTS)) (groups[g] ??= []).push(k);

  return (
    <div className="space-y-8 pb-24">
      <h1 className="text-3xl text-primary">טקסטים ותמונות באתר</h1>

      <section className="rounded-2xl border bg-card p-5">
        <h2 className="mb-4 text-2xl">תמונה בראש האתר</h2>
        <img src={vals.hero_image || heroDefault} alt="תמונת ראש האתר" className="aspect-[16/7] w-full max-w-2xl rounded-xl object-cover" />
        <div className="mt-4 flex flex-wrap gap-2">
          <Button asChild variant="secondary" disabled={busy}>
            <label className="cursor-pointer">
              החלפת תמונה
              <input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) onImage(f); e.target.value = ""; }} />
            </label>
          </Button>
          {vals.hero_image && <Button variant="outline" onClick={resetImage} disabled={busy}>חזרה לתמונה המקורית</Button>}
        </div>
      </section>

      {Object.entries(groups).map(([g, keys]) => (
        <section key={g} className="rounded-2xl border bg-card p-5">
          <h2 className="mb-4 text-2xl">{g}</h2>
          <div className="grid gap-4 md:grid-cols-2">
            {keys.map((k) => (
              <div key={k}>
                <Label htmlFor={k}>{SITE_TEXTS[k as keyof typeof SITE_TEXTS][0]}</Label>
                <Textarea id={k} rows={2} value={vals[k]} onChange={(e) => setVals({ ...vals, [k]: e.target.value })} />
              </div>
            ))}
          </div>
        </section>
      ))}

      <div className="fixed bottom-4 left-4 z-30">
        <Button size="lg" onClick={saveAll} disabled={busy} className="shadow-xl">שמירת כל הטקסטים</Button>
      </div>
    </div>
  );
}
