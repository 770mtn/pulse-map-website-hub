import { createFileRoute, notFound, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { SiteLayout } from "@/components/SiteLayout";
import { Button } from "@/components/ui/button";
import { getTracking, respondTracking } from "@/lib/public.functions";
import { STATUSES } from "@/lib/statuses";

export const Route = createFileRoute("/track/$token")({
  loader: async ({ params }) => {
    if (!/^[a-f0-9]{24}$/.test(params.token)) throw notFound();
    const r = await getTracking({ data: { token: params.token } });
    if (!r) throw notFound();
    return r;
  },
  head: () => ({
    meta: [
      { title: "מעקב בקשה | הנה זה משיח בא" },
      { name: "description", content: "מעקב אחרי סטטוס בקשת הדגלים והשלטים שלך." },
      { property: "og:title", content: "מעקב בקשה | הנה זה משיח בא" },
      { property: "og:description", content: "מעקב אחרי סטטוס הבקשה." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  notFoundComponent: () => (
    <SiteLayout><p className="py-20 text-center text-xl">הבקשה לא נמצאה</p></SiteLayout>
  ),
  component: Track,
});

function Track() {
  const r = Route.useLoaderData();
  const { token } = Route.useParams();
  const router = useRouter();
  const respond = useServerFn(respondTracking);
  const [busy, setBusy] = useState(false);
  const answered = ["done", "cancelled"].includes(r.status) || r.customer_response === "no_contact";

  async function answer(a: "done" | "not_yet" | "no_contact") {
    setBusy(true);
    try {
      await respond({ data: { token, answer: a } });
      toast.success("תודה על העדכון!");
      router.invalidate();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "שגיאה");
    } finally {
      setBusy(false);
    }
  }

  return (
    <SiteLayout>
      <div className="mx-auto max-w-xl px-4 py-14">
        <h1 className="text-center text-4xl text-primary">שלום {r.firstName}</h1>
        <div className="mt-8 rounded-2xl border bg-card p-6 shadow-sm">
          <p className="text-muted-foreground">סטטוס הבקשה</p>
          <p className="font-display text-3xl text-primary">{STATUSES[r.status] ?? r.status}</p>
          <p className="mt-4"><b>כתובת:</b> {r.address}</p>
          <p><b>מוצרים:</b> {r.items.map((i) => `${i.product_name} – ${i.quantity}`).join(", ")}</p>
          <p><b>התקנה:</b> {r.wants_install ? "כולל התקנה" : "ללא התקנה"}</p>
        </div>
        {!answered && (
          <div className="mt-8 rounded-2xl border-2 border-gold bg-card p-6">
            <h2 className="text-2xl">האם פעיל יצר איתך קשר?</h2>
            <div className="mt-4 grid gap-3">
              <Button size="lg" disabled={busy} onClick={() => answer("done")}>כן, ההזמנה בוצעה</Button>
              <Button size="lg" variant="secondary" disabled={busy} onClick={() => answer("not_yet")}>נוצר קשר, עדיין לא בוצע</Button>
              <Button size="lg" variant="outline" disabled={busy} onClick={() => answer("no_contact")}>לא, אף אחד לא התקשר</Button>
            </div>
          </div>
        )}
      </div>
    </SiteLayout>
  );
}
