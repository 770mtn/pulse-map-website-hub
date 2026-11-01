import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { z } from "zod";
import { isValidIsraeliPhone, normalizePhone } from "./geo";

const GATEWAY = "https://connector-gateway.lovable.dev/google_maps";

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

function origin() {
  try {
    return new URL(getRequest().url).origin;
  } catch {
    return "";
  }
}

async function requireVerified(phone: string, token: string) {
  const db = await admin();
  const { data } = await db
    .from("phone_otps")
    .select("id, created_at")
    .eq("phone", normalizePhone(phone))
    .eq("verify_token", token)
    .eq("verified", true)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!data || Date.now() - new Date(data.created_at).getTime() > 2 * 3600_000)
    throw new Error("אימות הטלפון פג תוקף, נא לאמת שוב");
}

export const sendOtp = createServerFn({ method: "POST" })
  .inputValidator((d: { phone: string }) => z.object({ phone: z.string().min(9).max(20) }).parse(d))
  .handler(async ({ data }) => {
    if (!isValidIsraeliPhone(data.phone)) throw new Error("מספר טלפון לא תקין");
    const phone = normalizePhone(data.phone);
    const db = await admin();
    const since = new Date(Date.now() - 3600_000).toISOString();
    const { count } = await db.from("phone_otps").select("id", { count: "exact", head: true }).eq("phone", phone).gte("created_at", since);
    if ((count ?? 0) >= 4) throw new Error("נשלחו יותר מדי קודים. נסו שוב בעוד שעה");
    const code = String(Math.floor(100000 + Math.random() * 900000));
    await db.from("phone_otps").insert({ phone, code, expires_at: new Date(Date.now() + 10 * 60_000).toISOString() });
    const { sendTemplate, smsConfigured } = await import("./sms.server");
    await sendTemplate(db, "otp", phone, { code });
    // Until SMS is configured, return the code so the flow can be tested.
    return { ok: true, testCode: smsConfigured() ? null : code };
  });

export const verifyOtp = createServerFn({ method: "POST" })
  .inputValidator((d: { phone: string; code: string }) =>
    z.object({ phone: z.string().max(20), code: z.string().regex(/^\d{6}$/) }).parse(d),
  )
  .handler(async ({ data }) => {
    const phone = normalizePhone(data.phone);
    const db = await admin();
    const { data: otp } = await db
      .from("phone_otps")
      .select("*")
      .eq("phone", phone)
      .eq("verified", false)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!otp || new Date(otp.expires_at) < new Date()) throw new Error("הקוד פג תוקף, שלחו קוד חדש");
    if (otp.attempts >= 5) throw new Error("יותר מדי ניסיונות, שלחו קוד חדש");
    if (otp.code !== data.code) {
      await db.from("phone_otps").update({ attempts: otp.attempts + 1 }).eq("id", otp.id);
      throw new Error("קוד שגוי");
    }
    const token = crypto.randomUUID();
    await db.from("phone_otps").update({ verified: true, verify_token: token }).eq("id", otp.id);
    return { token };
  });

export const addressAutocomplete = createServerFn({ method: "POST" })
  .inputValidator((d: { phone: string; token: string; input: string; sessionToken: string }) =>
    z.object({ phone: z.string(), token: z.string().uuid(), input: z.string().min(2).max(120), sessionToken: z.string().uuid() }).parse(d),
  )
  .handler(async ({ data }) => {
    await requireVerified(data.phone, data.token);
    const res = await fetch(`${GATEWAY}/places/v1/places:autocomplete`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env["LOVABLE_API_KEY"]}`,
        "X-Connection-Api-Key": process.env["GOOGLE_MAPS_API_KEY"]!,
        "Content-Type": "application/json",
        "X-Goog-FieldMask": "suggestions.placePrediction.placeId,suggestions.placePrediction.text.text",
      },
      body: JSON.stringify({
        input: data.input,
        sessionToken: data.sessionToken,
        languageCode: "he",
        includedRegionCodes: ["il"],
        includedPrimaryTypes: ["street_address", "premise", "subpremise", "route"],
      }),
    });
    if (!res.ok) throw new Error(`שגיאת חיפוש כתובת [${res.status}]: ${(await res.text()).slice(0, 200)}`);
    const json = (await res.json()) as { suggestions?: { placePrediction?: { placeId: string; text: { text: string } } }[] };
    return (json.suggestions ?? [])
      .filter((s) => s.placePrediction)
      .map((s) => ({ placeId: s.placePrediction!.placeId, text: s.placePrediction!.text.text }));
  });

export type PlaceResult = {
  address: string;
  street: string;
  houseNumber: string;
  city: string;
  zip: string;
  lat: number;
  lng: number;
};

export async function fetchPlace(placeId: string, sessionToken?: string): Promise<PlaceResult> {
  const qs = sessionToken ? `?sessionToken=${sessionToken}&languageCode=he` : "?languageCode=he";
  const res = await fetch(`${GATEWAY}/places/v1/places/${encodeURIComponent(placeId)}${qs}`, {
    headers: {
      Authorization: `Bearer ${process.env["LOVABLE_API_KEY"]}`,
      "X-Connection-Api-Key": process.env["GOOGLE_MAPS_API_KEY"]!,
      "X-Goog-FieldMask": "formattedAddress,location,addressComponents",
    },
  });
  if (!res.ok) throw new Error(`שגיאת כתובת [${res.status}]: ${(await res.text()).slice(0, 200)}`);
  const p = (await res.json()) as {
    formattedAddress: string;
    location: { latitude: number; longitude: number };
    addressComponents?: { longText: string; types: string[] }[];
  };
  const comp = (t: string) => p.addressComponents?.find((c) => c.types.includes(t))?.longText ?? "";
  return {
    address: p.formattedAddress,
    street: comp("route"),
    houseNumber: comp("street_number"),
    city: comp("locality"),
    zip: comp("postal_code"),
    lat: p.location.latitude,
    lng: p.location.longitude,
  };
}

export const addressDetails = createServerFn({ method: "POST" })
  .inputValidator((d: { phone: string; token: string; placeId: string; sessionToken: string }) =>
    z.object({ phone: z.string(), token: z.string().uuid(), placeId: z.string().max(300), sessionToken: z.string().uuid() }).parse(d),
  )
  .handler(async ({ data }) => {
    await requireVerified(data.phone, data.token);
    return fetchPlace(data.placeId, data.sessionToken);
  });

const submitSchema = z.object({
  fullName: z.string().trim().min(2).max(100),
  phone: z.string().max(20),
  token: z.string().uuid(),
  placeId: z.string().max(300),
  wantsInstall: z.boolean(),
  notes: z.string().max(1000).optional().default(""),
  items: z.array(z.object({ productId: z.string().uuid(), quantity: z.number().int().min(1).max(50) })).min(1).max(20),
});

export const submitRequest = createServerFn({ method: "POST" })
  .inputValidator((d: z.input<typeof submitSchema>) => submitSchema.parse(d))
  .handler(async ({ data }) => {
    await requireVerified(data.phone, data.token);
    const phone = normalizePhone(data.phone);
    const db = await admin();
    const place = await fetchPlace(data.placeId);

    // Duplicate prevention: same phone + same address with an open request in the last 14 days
    const since = new Date(Date.now() - 14 * 86400_000).toISOString();
    const { data: dup } = await db
      .from("requests")
      .select("id, track_token")
      .eq("phone", phone)
      .eq("address", place.address)
      .not("status", "in", "(done,cancelled)")
      .gte("created_at", since)
      .limit(1)
      .maybeSingle();
    if (dup) return { duplicate: true, trackToken: dup.track_token };

    const { data: products } = await db.from("products").select("id, name, orderable, visible").in("id", data.items.map((i) => i.productId));
    const valid = data.items.filter((i) => products?.find((p) => p.id === i.productId && p.orderable && p.visible));
    if (valid.length === 0) throw new Error("לא נבחרו מוצרים זמינים");

    const { data: req, error } = await db
      .from("requests")
      .insert({
        full_name: data.fullName,
        phone,
        address: place.address,
        street: place.street,
        house_number: place.houseNumber,
        city: place.city,
        zip: place.zip,
        lat: place.lat,
        lng: place.lng,
        wants_install: data.wantsInstall,
        notes: data.notes,
      })
      .select("id, track_token")
      .single();
    if (error || !req) throw new Error("שמירת הבקשה נכשלה");
    await db.from("request_items").insert(
      valid.map((i) => ({ request_id: req.id, product_id: i.productId, product_name: products!.find((p) => p.id === i.productId)!.name, quantity: i.quantity })),
    );
    await db.from("request_events").insert({ request_id: req.id, event: "הבקשה התקבלה באתר" });

    const o = origin();
    const { dispatchRequest } = await import("./dispatch.server");
    await dispatchRequest(db, req.id, o);
    const { sendTemplate } = await import("./sms.server");
    await sendTemplate(db, "customer_confirm", phone, { name: data.fullName, link: `${o}/track/${req.track_token}` });
    return { duplicate: false, trackToken: req.track_token };
  });

export const getTracking = createServerFn({ method: "GET" })
  .inputValidator((d: { token: string }) => z.object({ token: z.string().regex(/^[a-f0-9]{24}$/) }).parse(d))
  .handler(async ({ data }) => {
    const db = await admin();
    const { data: r } = await db
      .from("requests")
      .select("id, full_name, address, status, wants_install, created_at, followup_sent_at, customer_response")
      .eq("track_token", data.token)
      .maybeSingle();
    if (!r) return null;
    const { data: items } = await db.from("request_items").select("product_name, quantity").eq("request_id", r.id);
    const { id: _id, ...rest } = r;
    return { ...rest, firstName: r.full_name.split(" ")[0], items: items ?? [] };
  });

export const respondTracking = createServerFn({ method: "POST" })
  .inputValidator((d: { token: string; answer: "done" | "not_yet" | "no_contact" }) =>
    z.object({ token: z.string().regex(/^[a-f0-9]{24}$/), answer: z.enum(["done", "not_yet", "no_contact"]) }).parse(d),
  )
  .handler(async ({ data }) => {
    const db = await admin();
    const { data: r } = await db.from("requests").select("*").eq("track_token", data.token).maybeSingle();
    if (!r) throw new Error("בקשה לא נמצאה");
    const map = {
      done: { status: "done", event: "המזמין אישר: ההזמנה בוצעה" },
      not_yet: { status: "contacted", event: "המזמין: נוצר קשר, עדיין לא בוצע" },
      no_contact: { status: "no_contact", event: "🚨 המזמין דיווח: לא נוצר קשר" },
    }[data.answer];
    await db
      .from("requests")
      .update({ status: map.status, customer_response: data.answer, urgent: data.answer === "no_contact" || r.urgent, updated_at: new Date().toISOString() })
      .eq("id", r.id);
    await db.from("request_events").insert({ request_id: r.id, event: map.event });
    if (data.answer === "no_contact") {
      const { data: s } = await db.from("settings").select("admin_phone").eq("id", 1).single();
      if (s?.admin_phone) {
        const { sendTemplate } = await import("./sms.server");
        await sendTemplate(db, "admin_alert", s.admin_phone, { name: r.full_name, phone: r.phone, address: r.address, reason: "המזמין דיווח שלא נוצר קשר" });
      }
    }
    return { ok: true };
  });

