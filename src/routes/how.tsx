import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteLayout } from "@/components/SiteLayout";

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
  component: How,
});

const steps = [
  ["ממלאים בקשה", "בוחרים מוצרים, כמויות ואם רוצים התקנה."],
  ["מאמתים טלפון", "מקבלים קוד ב-SMS ומזינים אותו – כדי שנוכל לחזור אליכם."],
  ["בוחרים כתובת", "מקלידים את הכתובת ובוחרים מהרשימה."],
  ["פעיל מהאזור מקבל הודעה", "שלושת הפעילים הקרובים אליכם מקבלים את פרטי הבקשה ב-SMS."],
  ["הפעיל מתקשר ומגיע", "אחרי כמה ימים נשלח לכם הודעה לוודא שהכול הסתדר."],
];

function How() {
  return (
    <SiteLayout>
      <div className="mx-auto max-w-3xl px-4 py-16">
        <h1 className="text-center text-5xl text-primary">איך זה עובד?</h1>
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
          <Link to="/order" className="rounded-full bg-primary px-8 py-4 text-lg font-bold text-primary-foreground">אני רוצה להזמין</Link>
        </div>
      </div>
    </SiteLayout>
  );
}
