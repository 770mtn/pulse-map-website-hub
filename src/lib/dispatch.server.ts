import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { addBusinessDays, pickActivists } from "./geo";
import { sendTemplate } from "./sms.server";

type Admin = SupabaseClient<Database>;

export async function dispatchRequest(admin: Admin, requestId: string, origin: string) {
  const { data: req } = await admin.from("requests").select("*").eq("id", requestId).single();
  if (!req) throw new Error("Request not found");
  const { data: items } = await admin.from("request_items").select("product_name, quantity").eq("request_id", requestId);
  const { data: settings } = await admin.from("settings").select("*").eq("id", 1).single();
  const { data: activists } = await admin.from("activists").select("*");
  const count = settings?.activists_per_request ?? 3;
  const chosen =
    req.lat != null && req.lng != null
      ? pickActivists(activists ?? [], { lat: req.lat, lng: req.lng }, count, req.wants_install)
      : [];

  const vars = {
    name: req.full_name,
    phone: req.phone,
    address: req.address,
    items: (items ?? []).map((i) => `${i.product_name} x${i.quantity}`).join(", "),
    install: req.wants_install ? "כולל התקנה" : "ללא התקנה",
    notes: req.notes ?? "",
    link: `${origin}/track/${req.track_token}`,
  };

  if (chosen.length === 0) {
    await admin.from("requests").update({ status: "escalated", urgent: true, updated_at: new Date().toISOString() }).eq("id", requestId);
    await admin.from("request_events").insert({ request_id: requestId, event: "לא נמצאו פעילים באזור – הועבר למנהל" });
    if (settings?.admin_phone)
      await sendTemplate(admin, "admin_alert", settings.admin_phone, { ...vars, reason: "אין פעילים באזור" });
    return { sentTo: 0 };
  }

  for (const a of chosen) await sendTemplate(admin, "activist", a.phone, vars);
  const now = new Date();
  await admin
    .from("requests")
    .update({
      status: "sent",
      activist_ids: chosen.map((a) => a.id),
      sent_to_activists_at: now.toISOString(),
      followup_due_at: addBusinessDays(now, settings?.followup_business_days ?? 5).toISOString(),
      urgent: chosen.length < count,
      updated_at: now.toISOString(),
    })
    .eq("id", requestId);
  await admin.from("request_events").insert({
    request_id: requestId,
    event: `נשלח SMS ל-${chosen.length} פעילים: ${chosen.map((a) => a.name).join(", ")}`,
  });
  return { sentTo: chosen.length };
}
