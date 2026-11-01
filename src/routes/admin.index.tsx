import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AdminMap } from "@/components/AdminMap";
import { distanceKm } from "@/lib/geo";

export const Route = createFileRoute("/admin/")({ component: Dashboard });

function Dashboard() {
  const { data } = useQuery({
    queryKey: ["dashboard"],
    queryFn: async () => {
      const [{ data: reqs }, { data: acts }] = await Promise.all([
        supabase.from("requests").select("id, full_name, address, city, status, urgent, lat, lng, created_at").order("created_at", { ascending: false }).limit(1000),
        supabase.from("activists").select("id, name, city, active, lat, lng, service_radius_km"),
      ]);
      return { reqs: reqs ?? [], acts: acts ?? [] };
    },
  });
  if (!data) return <p>טוען...</p>;
  const { reqs, acts } = data;
  const today = new Date().toDateString();
  const count = (f: (r: (typeof reqs)[number]) => boolean) => reqs.filter(f).length;
  const stats = [
    ["בקשות היום", count((r) => new Date(r.created_at).toDateString() === today)],
    ["בקשות פתוחות", count((r) => ["new", "sent", "awaiting_followup"].includes(r.status))],
    ["בטיפול", count((r) => ["contacted", "in_progress"].includes(r.status))],
    ["הושלמו", count((r) => r.status === "done")],
    ["ללא מענה", count((r) => ["no_contact", "escalated"].includes(r.status))],
    ["פעילים", acts.length],
    ["פעילים זמינים", acts.filter((a) => a.active).length],
  ] as const;

  // City stats
  const byCity = new Map<string, { reqs: number; acts: number }>();
  reqs.forEach((r) => { const c = r.city || "לא ידוע"; const v = byCity.get(c) ?? { reqs: 0, acts: 0 }; v.reqs++; byCity.set(c, v); });
  acts.filter((a) => a.active).forEach((a) => { const c = a.city || "לא ידוע"; const v = byCity.get(c) ?? { reqs: 0, acts: 0 }; v.acts++; byCity.set(c, v); });
  const cities = [...byCity.entries()].sort((a, b) => b[1].reqs - a[1].reqs);

  // Recruitment recommendations: requests with no active activist in range
  const uncovered = reqs.filter((r) => r.lat != null && !acts.some((a) => a.active && a.lat != null && distanceKm({ lat: r.lat!, lng: r.lng! }, { lat: a.lat!, lng: a.lng! }) <= Number(a.service_radius_km)));
  const recCities = new Map<string, number>();
  uncovered.forEach((r) => recCities.set(r.city || "לא ידוע", (recCities.get(r.city || "לא ידוע") ?? 0) + 1));

  const points = [
    ...reqs.filter((r) => r.lat != null && !["done", "cancelled"].includes(r.status)).map((r) => ({ lat: r.lat!, lng: r.lng!, label: `${r.full_name} – ${r.address}`, kind: (r.urgent || ["no_contact", "escalated"].includes(r.status) ? "urgent" : "request") as "urgent" | "request" })),
    ...acts.filter((a) => a.lat != null && a.active).map((a) => ({ lat: a.lat!, lng: a.lng!, label: `פעיל: ${a.name}`, kind: "activist" as const })),
  ];

  return (
    <div className="space-y-8">
      <h1 className="text-3xl text-primary">לוח בקרה</h1>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
        {stats.map(([l, v]) => (
          <div key={l} className="rounded-2xl border bg-card p-4 text-center shadow-sm">
            <div className="font-display text-3xl text-primary">{v}</div>
            <div className="text-sm text-muted-foreground">{l}</div>
          </div>
        ))}
      </div>
      <AdminMap points={points} />
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border bg-card p-4">
          <h2 className="mb-3 text-xl">סטטיסטיקות לפי עיר</h2>
          <table className="w-full text-sm">
            <thead><tr className="text-muted-foreground"><th className="text-right">עיר</th><th>בקשות</th><th>פעילים</th></tr></thead>
            <tbody>{cities.slice(0, 20).map(([c, v]) => <tr key={c} className="border-t"><td className="py-1">{c}</td><td className="text-center">{v.reqs}</td><td className="text-center">{v.acts}</td></tr>)}</tbody>
          </table>
        </div>
        <div className="rounded-2xl border bg-card p-4">
          <h2 className="mb-3 text-xl">המלצות לגיוס פעילים</h2>
          {recCities.size === 0 ? <p className="text-muted-foreground">כל הבקשות מכוסות על ידי פעילים 🎉</p> : (
            <ul className="space-y-1">{[...recCities.entries()].sort((a, b) => b[1] - a[1]).map(([c, n]) => <li key={c}>• <b>{c}</b> – {n} בקשות ללא פעיל בטווח</li>)}</ul>
          )}
        </div>
      </div>
    </div>
  );
}
