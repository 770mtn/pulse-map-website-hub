import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { CheckCircle2, Loader2, MapPin, Minus, Plus } from "lucide-react";
import { SiteLayout } from "@/components/SiteLayout";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { productsQuery } from "./index";
import { addressAutocomplete, addressDetails, sendOtp, submitRequest, verifyOtp, type PlaceResult } from "@/lib/public.functions";

export const Route = createFileRoute("/order")({
  head: () => ({
    meta: [
      { title: "הגשת בקשה | הנה זה משיח בא" },
      { name: "description", content: "טופס הזמנת דגלים ושלטים עד הבית – אימות טלפון, כתובת ומוצרים." },
      { property: "og:title", content: "הגשת בקשה | הנה זה משיח בא" },
      { property: "og:description", content: "הזמינו דגל או שלט עד הבית." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(productsQuery),
  component: OrderPage,
});

function errMsg(e: unknown) {
  return e instanceof Error ? e.message : "אירעה שגיאה";
}

function OrderPage() {
  const { data: products } = useSuspenseQuery(productsQuery);
  const orderable = products.filter((p) => p.orderable && p.available);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [code, setCode] = useState("");
  const [testCode, setTestCode] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [place, setPlace] = useState<(PlaceResult & { placeId: string }) | null>(null);
  const [qty, setQty] = useState<Record<string, number>>({});
  const [install, setInstall] = useState<boolean | null>(null);
  const [notes, setNotes] = useState("");
  const [review, setReview] = useState(false);
  const [done, setDone] = useState<{ token: string; duplicate: boolean } | null>(null);

  const sendOtpFn = useServerFn(sendOtp);
  const verifyFn = useServerFn(verifyOtp);
  const submitFn = useServerFn(submitRequest);

  const items = orderable.filter((p) => (qty[p.id] ?? 0) > 0).map((p) => ({ productId: p.id, name: p.name, quantity: qty[p.id] ?? 0 }));
  const anyInstallable = items.some((i) => orderable.find((p) => p.id === i.productId)?.installable);
  const canReview = name.trim().length >= 2 && token && place && items.length > 0 && (!anyInstallable || install !== null);

  async function handleSendOtp() {
    setBusy(true);
    try {
      const r = await sendOtpFn({ data: { phone } });
      setOtpSent(true);
      setTestCode(r.testCode);
      toast.success("קוד נשלח ב-SMS");
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setBusy(false);
    }
  }
  async function handleVerify() {
    setBusy(true);
    try {
      const r = await verifyFn({ data: { phone, code } });
      setToken(r.token);
      toast.success("הטלפון אומת!");
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setBusy(false);
    }
  }
  async function handleSubmit() {
    if (!token || !place) return;
    setBusy(true);
    try {
      const r = await submitFn({
        data: { fullName: name, phone, token, placeId: place.placeId, wantsInstall: !!install, notes, items: items.map(({ productId, quantity }) => ({ productId, quantity })) },
      });
      setDone({ token: r.trackToken, duplicate: r.duplicate });
      window.scrollTo({ top: 0 });
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <SiteLayout>
        <div className="mx-auto max-w-xl px-4 py-20 text-center">
          <CheckCircle2 className="mx-auto h-20 w-20 text-success" />
          <h1 className="mt-4 text-4xl text-primary">{done.duplicate ? "כבר קיבלנו בקשה ממך" : "הבקשה התקבלה בהצלחה!"}</h1>
          <p className="mt-4 text-lg">תודה על הרצון להשתתף בהפצת בשורת הגאולה.</p>
          <p className="mt-2 text-muted-foreground">אנו מאתרים פעילים באזורך, ואחד מהם יצור איתך קשר בקרוב.</p>
          <Link to="/track/$token" params={{ token: done.token }} className="mt-8 inline-block rounded-full bg-primary px-6 py-3 font-bold text-primary-foreground">
            מעקב אחרי הבקשה
          </Link>
        </div>
      </SiteLayout>
    );
  }

  return (
    <SiteLayout>
      <div className="mx-auto max-w-2xl px-4 py-12">
        <h1 className="text-center text-4xl text-primary">הגשת בקשה</h1>
        {!review ? (
          <div className="mt-8 space-y-6">
            <Section n={1} title="פרטי המזמין">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="name">שם מלא *</Label>
                  <Input id="name" value={name} onChange={(e) => setName(e.target.value)} maxLength={100} />
                </div>
                <div>
                  <Label htmlFor="phone">מספר טלפון *</Label>
                  <div className="flex gap-2">
                    <Input id="phone" dir="ltr" inputMode="tel" value={phone} disabled={!!token} onChange={(e) => setPhone(e.target.value)} placeholder="050-0000000" />
                    {!token && (
                      <Button type="button" variant="secondary" onClick={handleSendOtp} disabled={busy || phone.length < 9}>
                        {otpSent ? "שליחה חוזרת" : "שלחו לי קוד"}
                      </Button>
                    )}
                  </div>
                </div>
                {otpSent && !token && (
                  <div>
                    <Label htmlFor="code">קוד אימות שקיבלת ב-SMS</Label>
                    <div className="flex gap-2">
                      <Input id="code" dir="ltr" inputMode="numeric" maxLength={6} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} />
                      <Button type="button" onClick={handleVerify} disabled={busy || code.length !== 6}>אימות</Button>
                    </div>
                    {testCode && <p className="mt-2 text-sm text-muted-foreground">מצב בדיקה (SMS עדיין לא מחובר): הקוד הוא <b dir="ltr">{testCode}</b></p>}
                  </div>
                )}
                {token && <p className="flex items-center gap-2 font-semibold text-success"><CheckCircle2 className="h-5 w-5" /> הטלפון אומת</p>}
              </div>
            </Section>

            <Section n={2} title="כתובת" disabled={!token}>
              {token ? <AddressPicker phone={phone} token={token} value={place} onChange={setPlace} /> : <p className="text-muted-foreground">יש לאמת טלפון קודם</p>}
            </Section>

            <Section n={3} title="בחירת מוצרים">
              <div className="space-y-3">
                {orderable.map((p) => (
                  <div key={p.id} className="flex items-center justify-between rounded-xl border p-3">
                    <span className="font-semibold">{p.name}</span>
                    <div className="flex items-center gap-2">
                      <Button size="icon" variant="outline" type="button" aria-label="הפחת" onClick={() => setQty((q) => ({ ...q, [p.id]: Math.max(0, (q[p.id] ?? 0) - 1) }))}><Minus className="h-4 w-4" /></Button>
                      <span className="w-8 text-center text-lg font-bold">{qty[p.id] ?? 0}</span>
                      <Button size="icon" variant="outline" type="button" aria-label="הוסף" onClick={() => setQty((q) => ({ ...q, [p.id]: Math.min(50, (q[p.id] ?? 0) + 1) }))}><Plus className="h-4 w-4" /></Button>
                    </div>
                  </div>
                ))}
              </div>
            </Section>

            {anyInstallable && (
              <Section n={4} title="האם אתה מעוניין בהתקנה?">
                <div className="grid grid-cols-2 gap-3">
                  {[true, false].map((v) => (
                    <button key={String(v)} type="button" onClick={() => setInstall(v)} className={`rounded-xl border-2 p-4 text-lg font-bold transition ${install === v ? "border-primary bg-secondary" : "border-border"}`}>
                      {v ? "כולל התקנה" : "ללא התקנה"}
                    </button>
                  ))}
                </div>
              </Section>
            )}

            <Section n={anyInstallable ? 5 : 4} title="הערות / פרטים נוספים">
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={1000} placeholder="קומה, מיקום ההתקנה, שעות נוחות ליצירת קשר..." />
            </Section>

            <Button size="lg" className="h-14 w-full text-xl" disabled={!canReview} onClick={() => setReview(true)}>להמשך – סיכום הבקשה</Button>
          </div>
        ) : (
          <div className="mt-8 rounded-2xl border bg-card p-6 shadow-sm">
            <h2 className="text-3xl">סיכום הבקשה</h2>
            <dl className="mt-4 grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-lg">
              <dt className="font-bold">שם</dt><dd>{name}</dd>
              <dt className="font-bold">טלפון</dt><dd dir="ltr" className="text-right">{phone}</dd>
              <dt className="font-bold">כתובת</dt><dd>{place?.address}</dd>
              <dt className="font-bold">מוצרים</dt><dd>{items.map((i) => `${i.name} – ${i.quantity}`).join(", ")}</dd>
              <dt className="font-bold">התקנה</dt><dd>{install ? "כולל התקנה" : "ללא התקנה"}</dd>
              <dt className="font-bold">הערות</dt><dd>{notes || "—"}</dd>
            </dl>
            <div className="mt-6 flex gap-3">
              <Button variant="outline" onClick={() => setReview(false)}>חזרה לעריכה</Button>
              <Button size="lg" className="flex-1 text-lg" onClick={handleSubmit} disabled={busy}>
                {busy && <Loader2 className="h-5 w-5 animate-spin" />} שליחת הבקשה
              </Button>
            </div>
          </div>
        )}
      </div>
    </SiteLayout>
  );
}

function Section({ n, title, children, disabled }: { n: number; title: string; children: React.ReactNode; disabled?: boolean }) {
  return (
    <section className={`rounded-2xl border bg-card p-5 shadow-sm ${disabled ? "opacity-60" : ""}`}>
      <h2 className="mb-4 flex items-center gap-3 text-2xl">
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gold text-lg text-accent-foreground">{n}</span>
        {title}
      </h2>
      {children}
    </section>
  );
}

function AddressPicker({ phone, token, value, onChange }: { phone: string; token: string; value: (PlaceResult & { placeId: string }) | null; onChange: (p: (PlaceResult & { placeId: string }) | null) => void }) {
  const [q, setQ] = useState("");
  const [sugs, setSugs] = useState<{ placeId: string; text: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const session = useRef(crypto.randomUUID());
  const reqId = useRef(0);
  const acFn = useServerFn(addressAutocomplete);
  const detFn = useServerFn(addressDetails);

  useEffect(() => {
    if (value || q.trim().length < 3) { setSugs([]); return; }
    const id = ++reqId.current;
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const r = await acFn({ data: { phone, token, input: q, sessionToken: session.current } });
        if (id === reqId.current) setSugs(r);
      } catch (e) {
        toast.error(errMsg(e));
      } finally {
        if (id === reqId.current) setLoading(false);
      }
    }, 350);
    return () => clearTimeout(t);
  }, [q, value, phone, token, acFn]);

  async function choose(s: { placeId: string; text: string }) {
    try {
      const d = await detFn({ data: { phone, token, placeId: s.placeId, sessionToken: session.current } });
      session.current = crypto.randomUUID();
      onChange({ ...d, placeId: s.placeId });
      setSugs([]);
    } catch (e) {
      toast.error(errMsg(e));
    }
  }

  if (value) {
    return (
      <div className="flex items-center justify-between rounded-xl border-2 border-primary bg-secondary p-3">
        <span className="flex items-center gap-2 font-semibold"><MapPin className="h-5 w-5 text-primary" />{value.address}</span>
        <Button variant="ghost" size="sm" onClick={() => { onChange(null); setQ(""); }}>שינוי</Button>
      </div>
    );
  }
  return (
    <div className="relative">
      <Label htmlFor="addr">התחילו להקליד כתובת ובחרו מהרשימה *</Label>
      <Input id="addr" value={q} onChange={(e) => setQ(e.target.value)} placeholder="רחוב, מספר, עיר" autoComplete="off" />
      {loading && <Loader2 className="absolute left-3 top-9 h-4 w-4 animate-spin text-muted-foreground" />}
      {sugs.length > 0 && (
        <ul className="absolute z-20 mt-1 w-full overflow-hidden rounded-xl border bg-popover shadow-lg">
          {sugs.map((s) => (
            <li key={s.placeId}>
              <button type="button" onClick={() => choose(s)} className="flex w-full items-center gap-2 px-3 py-2 text-right hover:bg-secondary">
                <MapPin className="h-4 w-4 shrink-0 text-primary" />{s.text}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
