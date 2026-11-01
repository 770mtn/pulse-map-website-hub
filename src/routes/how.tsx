import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteLayout } from "@/components/SiteLayout";
import { siteContentQuery, useSiteContent } from "@/lib/site-content";

export const Route = createFileRoute("/how")({
  head: () => ({
    meta: [
      { title: "איך זה עובד? | הנה זה משיח בא" },
      { name: "description", content: "חמישה צעדים פשוטים: ממלאים בקשה, מאמתים טלפון, ופעיל מהאזור מתקשר ומגיע." },
      { property: "og:title", content: "איך זה עובד? | הנה זה משיח בא" },
      { property: "og:description", content: "כך מזמינים דגל או שלט עד הבית." },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(siteContentQuery),
  component: How,
});

function How() {
  const t = useSiteContent();
  const steps = ([1, 2, 3, 4, 5] as const).map((n) => [t[`how_step${n}_title`], t[`how_step${n}_text`]] as const);
  return (
    <SiteLayout>
      <div className="mx-auto max-w-3xl px-4 py-16">
        <h1 className="text-center text-5xl text-primary">{t.how_title}</h1>
        <ol className="mt-12 space-y-6">
          {steps.map(([t, d], i) => (
            <li key={t} className="flex gap-5 rounded-2xl border bg-card p-5 shadow-sm">
              <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-gold font-display text-2xl text-accent-foreground">{i + 1}</span>
              <div>
                <h2 className="text-2xl">{t}</h2>
                <p className="text-muted-foreground">{d}</p>
              </div>
            </li>
          ))}
        </ol>
        <div className="mt-12 text-center">
          <Link to="/order" className="rounded-full bg-primary px-8 py-4 text-lg font-bold text-primary-foreground">{t.how_cta}</Link>
        </div>
      </div>
    </SiteLayout>
  );
}
