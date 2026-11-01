import { createFileRoute, Link, Outlet } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { toast } from "sonner";
import { LayoutDashboard, ListChecks, LogOut, Package, Settings, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/admin")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "מערכת ניהול | הנה זה משיח בא" },
      { name: "description", content: "ניהול בקשות, פעילים ומוצרים." },
      { property: "og:title", content: "מערכת ניהול" },
      { property: "og:description", content: "ניהול מבצע ההפצה." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminLayout,
});

function AdminLayout() {
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const [isStaff, setIsStaff] = useState<boolean | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => data.subscription.unsubscribe();
  }, []);
  useEffect(() => {
    if (!session) { setIsStaff(null); return; }
    supabase.rpc("is_staff", { _user_id: session.user.id }).then(({ data }) => setIsStaff(!!data));
  }, [session]);

  if (session === undefined) return null;
  if (!session) return <Login />;
  if (isStaff === null) return null;
  if (!isStaff)
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4">
        <p className="text-lg">אין לחשבון זה הרשאת צוות. בקשו ממנהל ראשי להוסיף אתכם.</p>
        <Button variant="outline" onClick={() => supabase.auth.signOut()}>יציאה</Button>
      </div>
    );

  const nav = [
    { to: "/admin", label: "לוח בקרה", icon: LayoutDashboard, exact: true },
    { to: "/admin/requests", label: "בקשות", icon: ListChecks },
    { to: "/admin/activists", label: "פעילים", icon: Users },
    { to: "/admin/products", label: "מוצרים", icon: Package },
    { to: "/admin/settings", label: "הגדרות והודעות", icon: Settings },
  ] as const;

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <aside className="bg-sidebar text-sidebar-foreground md:w-60 md:shrink-0">
        <div className="p-4 font-display text-xl text-gold">מערכת ניהול</div>
        <nav className="flex gap-1 overflow-x-auto px-2 pb-2 md:flex-col">
          {nav.map((n) => (
            <Link
              key={n.to}
              to={n.to}
              activeOptions={{ exact: "exact" in n }}
              className="flex items-center gap-2 whitespace-nowrap rounded-lg px-3 py-2 hover:bg-sidebar-accent"
              activeProps={{ className: "bg-sidebar-accent text-gold" }}
            >
              <n.icon className="h-4 w-4" />{n.label}
            </Link>
          ))}
          <button onClick={() => supabase.auth.signOut()} className="flex items-center gap-2 rounded-lg px-3 py-2 text-right hover:bg-sidebar-accent">
            <LogOut className="h-4 w-4" />יציאה
          </button>
        </nav>
      </aside>
      <main className="min-w-0 flex-1 p-4 md:p-8"><Outlet /></main>
    </div>
  );
}

function Login() {
  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const { data, error } =
      mode === "in"
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({ email, password, options: { emailRedirectTo: `${window.location.origin}/admin` } });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    if (mode === "up" && !data.session) toast.success("נשלח מייל אימות – אשרו אותו ואז התחברו");
  }
  return (
    <div className="flex min-h-screen items-center justify-center bg-hero px-4">
      <form onSubmit={submit} className="w-full max-w-sm space-y-4 rounded-2xl bg-card p-6 shadow-xl">
        <h1 className="text-center text-3xl text-primary">{mode === "in" ? "כניסת צוות" : "הרשמת צוות"}</h1>
        <div><Label htmlFor="email">אימייל</Label><Input id="email" type="email" dir="ltr" value={email} onChange={(e) => setEmail(e.target.value)} required /></div>
        <div><Label htmlFor="pw">סיסמה</Label><Input id="pw" type="password" dir="ltr" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} /></div>
        <Button className="w-full" disabled={busy}>{mode === "in" ? "כניסה" : "הרשמה"}</Button>
        <button type="button" className="w-full text-sm text-muted-foreground underline" onClick={() => setMode(mode === "in" ? "up" : "in")}>
          {mode === "in" ? "אין לך חשבון? הרשמה" : "יש לך חשבון? כניסה"}
        </button>
        <p className="text-center text-xs text-muted-foreground">החשבון הראשון שנרשם הופך אוטומטית למנהל ראשי.</p>
      </form>
    </div>
  );
}
