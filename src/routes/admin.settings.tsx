import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { listTeam, sendTestSms, setUserRole } from "@/lib/admin.functions";

export const Route = createFileRoute("/admin/settings")({ component: SettingsPage });

const ROLE_LABELS: Record<string, string> = { admin: "מנהל ראשי", area_manager: "מנהל אזור", staff: "עובד מערכת", none: "ללא הרשאה" };

function SettingsPage() {
  return (
    <div className="space-y-10">
      <h1 className="text-3xl text-primary">הגדרות והודעות</h1>
      <GeneralSettings />
      <Templates />
      <Team />
      <SmsLog />
    </div>
  );
}

function GeneralSettings() {
  const { data } = useQuery({ queryKey: ["settings"], queryFn: async () => (await supabase.from("settings").select("*").eq("id", 1).single()).data });
  const [s, setS] = useState<any>(null);
  const [testPhone, setTestPhone] = useState("");
  const test = useServerFn(sendTestSms);
  useEffect(() => { if (data) setS(data); }, [data]);
  if (!s) return null;
  async function save() {
    const { error } = await supabase.from("settings").update({
      activists_per_request: s.activists_per_request, followup_business_days: s.followup_business_days,
      show_public_map: s.show_public_map, admin_phone: s.admin_phone,
    }).eq("id", 1);
    error ? toast.error("רק מנהל ראשי יכול לשנות הגדרות") : toast.success("נשמר");
  }
  return (
    <section className="rounded-2xl border bg-card p-5">
      <h2 className="mb-4 text-2xl">הגדרות כלליות</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        <div><Label>מספר פעילים לכל בקשה</Label><Input type="number" min={1} max={10} value={s.activists_per_request} onChange={(e) => setS({ ...s, activists_per_request: Number(e.target.value) })} /></div>
        <div><Label>ימי עסקים עד SMS מעקב</Label><Input type="number" min={1} max={30} value={s.followup_business_days} onChange={(e) => setS({ ...s, followup_business_days: Number(e.target.value) })} /></div>
        <div><Label>טלפון מנהל להתראות</Label><Input dir="ltr" value={s.admin_phone ?? ""} onChange={(e) => setS({ ...s, admin_phone: e.target.value })} /></div>
      </div>
      <Button className="mt-4" onClick={save}>שמירה</Button>
      <div className="mt-6 flex max-w-md gap-2">
        <Input dir="ltr" placeholder="מספר לבדיקת SMS" value={testPhone} onChange={(e) => setTestPhone(e.target.value)} />
        <Button variant="secondary" onClick={async () => { try { const r = await test({ data: { phone: testPhone } }); r.ok ? toast.success("נשלח") : toast.error("השליחה נכשלה – בדקו את יומן ההודעות"); } catch (e) { toast.error(String(e)); } }}>שליחת בדיקה</Button>
      </div>
    </section>
  );
}

function Templates() {
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["templates"], queryFn: async () => (await supabase.from("sms_templates").select("*").order("key")).data ?? [] });
  const [edits, setEdits] = useState<Record<string, string>>({});
  async function save(key: string) {
    const { error } = await supabase.from("sms_templates").update({ body: edits[key] ?? "" }).eq("key", key);
    if (error) { toast.error(error.message); return; }
    toast.success("נשמר");
    qc.invalidateQueries({ queryKey: ["templates"] });
  }
  return (
    <section className="rounded-2xl border bg-card p-5">
      <h2 className="text-2xl">נוסחי הודעות SMS</h2>
      <p className="mb-4 text-sm text-muted-foreground">משתנים זמינים: {"{name} {phone} {address} {items} {install} {notes} {link} {code} {reason}"}</p>
      <div className="space-y-4">
        {data?.map((t) => (
          <div key={t.key}>
            <Label>{t.label}</Label>
            <Textarea rows={4} value={edits[t.key] ?? t.body} onChange={(e) => setEdits({ ...edits, [t.key]: e.target.value })} />
            {edits[t.key] !== undefined && edits[t.key] !== t.body && <Button size="sm" className="mt-1" onClick={() => save(t.key)}>שמירה</Button>}
          </div>
        ))}
      </div>
    </section>
  );
}

function Team() {
  const list = useServerFn(listTeam);
  const setRole = useServerFn(setUserRole);
  const { data, refetch, error } = useQuery({ queryKey: ["team"], queryFn: () => list(), retry: false });
  if (error) return null;
  return (
    <section className="rounded-2xl border bg-card p-5">
      <h2 className="text-2xl">צוות והרשאות</h2>
      <p className="mb-4 text-sm text-muted-foreground">משתמשים חדשים נרשמים בעמוד כניסת הצוות, ואז מקבלים כאן הרשאה.</p>
      <table className="w-full text-sm">
        <tbody>
          {data?.map((u) => (
            <tr key={u.id} className="border-t">
              <td className="py-2" dir="ltr">{u.email}</td>
              <td>
                <select className="rounded border px-2 py-1" value={u.roles[0] ?? "none"} onChange={async (e) => {
                  try { await setRole({ data: { userId: u.id, role: e.target.value as any } }); toast.success("עודכן"); refetch(); } catch (err) { toast.error(err instanceof Error ? err.message : "שגיאה"); }
                }}>
                  {Object.entries(ROLE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

function SmsLog() {
  const { data } = useQuery({ queryKey: ["smslog"], queryFn: async () => (await supabase.from("sms_log").select("*").order("created_at", { ascending: false }).limit(100)).data ?? [] });
  const st: Record<string, string> = { sent: "✅ נשלח", failed: "❌ נכשל", not_configured: "⚠️ SMS לא מחובר" };
  return (
    <section className="rounded-2xl border bg-card p-5">
      <h2 className="mb-4 text-2xl">יומן הודעות SMS</h2>
      <div className="max-h-96 overflow-y-auto">
        <table className="w-full text-sm">
          <tbody>
            {data?.map((m) => (
              <tr key={m.id} className="border-t align-top">
                <td className="whitespace-nowrap p-1 text-muted-foreground">{new Date(m.created_at).toLocaleString("he-IL")}</td>
                <td className="p-1" dir="ltr">{m.to_phone}</td>
                <td className="p-1">{m.kind === "otp" ? "קוד אימות" : m.body.slice(0, 80)}</td>
                <td className="whitespace-nowrap p-1">{st[m.status] ?? m.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
