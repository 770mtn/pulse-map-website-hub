import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { Flag, Phone, Truck, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { SiteLayout } from "@/components/SiteLayout";
import heroImg from "@/assets/hero-flags.jpg";
import { siteContentQuery, useSiteContent } from "@/lib/site-content";

export const productsQuery = queryOptions({
  queryKey: ["public-products"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("products")
      .select("id, name, description, image_url, price, special_price, available, orderable, installable")
      .eq("visible", true)
      .order("sort_order");
    if (error) throw error;
    return data;
  },
});

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "הנה זה משיח בא – הזמנת דגלים ושלטים עד הבית" },
      { name: "description", content: "הזמינו דגלים, שלטים ומוצרי הפצה עד לבית. פעילים מאזורכם יצרו קשר ויגיעו אליכם." },
      { property: "og:title", content: "הנה זה משיח בא – מגיע עד אליך לבית" },
      { property: "og:description", content: "הזמינו דגלים ושלטים עד הבית בקלות." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  loader: ({ context }) => Promise.all([context.queryClient.ensureQueryData(productsQuery), context.queryClient.ensureQueryData(siteContentQuery)]),
  component: Index,
});

function Index() {
  const { data: products } = useSuspenseQuery(productsQuery);
  const t = useSiteContent();
  return (
    <SiteLayout>
      <section className="relative overflow-hidden bg-hero text-primary-foreground">
        <img src={t.hero_image || heroImg} alt="דגלים על מרפסות" width={1600} height={900} className="absolute inset-0 h-full w-full object-cover opacity-35" />
        <div className="relative mx-auto max-w-5xl px-4 py-20 text-center sm:py-28">
          <p className="mb-4 inline-flex items-center gap-2 rounded-full bg-gold/20 px-4 py-1 text-sm font-semibold text-gold">
            <Sparkles className="h-4 w-4" /> {t.hero_badge}
          </p>
          <h1 className="text-5xl leading-tight drop-shadow sm:text-7xl">{t.hero_title}</h1>
          <p className="mt-3 font-display text-2xl text-gold sm:text-4xl">{t.hero_subtitle}</p>
          <p className="mx-auto mt-6 max-w-xl text-lg opacity-90">
            {t.hero_text}
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link to="/order" className="rounded-full bg-gold px-8 py-4 text-xl font-extrabold text-accent-foreground shadow-gold transition hover:scale-105">
              {t.hero_cta}
            </Link>
            <Link to="/how" className="rounded-full border-2 border-primary-foreground/60 px-6 py-4 text-lg font-bold hover:bg-primary-foreground/10">
              {t.hero_cta2}
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16">
        <h2 className="text-center text-4xl text-primary">{t.products_title}</h2>
        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((p) => (
            <article key={p.id} className="overflow-hidden rounded-2xl border bg-card shadow-sm transition hover:shadow-lg">
              <div className="flex aspect-[4/3] items-center justify-center bg-secondary">
                {p.image_url ? (
                  <img src={p.image_url} alt={p.name} loading="lazy" className="h-full w-full object-cover" />
                ) : (
                  <Flag className="h-20 w-20 text-primary/40" />
                )}
              </div>
              <div className="p-5">
                <h3 className="text-2xl">{p.name}</h3>
                <p className="mt-1 text-muted-foreground">{p.description}</p>
                <div className="mt-4 flex items-center justify-between">
                  <Price price={p.price} special={p.special_price} />
                  {!p.available && <span className="text-sm font-bold text-destructive">אזל זמנית</span>}
                  {p.installable && p.available && <span className="rounded-full bg-secondary px-3 py-1 text-xs font-bold text-secondary-foreground">אפשר עם התקנה</span>}
                </div>
              </div>
            </article>
          ))}
        </div>
        <div className="mt-10 text-center">
          <Link to="/order" className="rounded-full bg-primary px-8 py-4 text-lg font-bold text-primary-foreground hover:brightness-110">
            {t.products_cta}
          </Link>
        </div>
      </section>

      <section className="bg-secondary/60 py-16">
        <div className="mx-auto grid max-w-5xl gap-8 px-4 text-center sm:grid-cols-3">
          {[
            { icon: Flag, t: t.feat1_title, d: t.feat1_text },
            { icon: Phone, t: t.feat2_title, d: t.feat2_text },
            { icon: Truck, t: t.feat3_title, d: t.feat3_text },
          ].map(({ icon: I, t: title, d }) => (
            <div key={title}>
              <I className="mx-auto h-12 w-12 text-primary" />
              <h3 className="mt-3 text-2xl">{title}</h3>
              <p className="text-muted-foreground">{d}</p>
            </div>
          ))}
        </div>
      </section>
    </SiteLayout>
  );
}

function Price({ price, special }: { price: number | null; special: number | null }) {
  if (special != null) return (
    <span className="text-lg font-bold">
      <span className="text-primary">₪{special}</span> <s className="text-sm text-muted-foreground">₪{price}</s>
    </span>
  );
  if (!price) return <span className="text-lg font-bold text-success">חינם</span>;
  return <span className="text-lg font-bold text-primary">₪{price}</span>;
}
