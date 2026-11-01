import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function assertStaff(supabase: any, userId: string) {
  const { data } = await supabase.rpc("is_staff", { _user_id: userId });
  if (!data) throw new Error("אין הרשאה");
}

export const redispatchRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertStaff(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { dispatchRequest } = await import("./dispatch.server");
    return dispatchRequest(supabaseAdmin, data.id, new URL(getRequest().url).origin);
  });

export const geocodeAddress = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { address: string }) => z.object({ address: z.string().min(2).max(200) }).parse(d))
  .handler(async ({ data, context }) => {
    await assertStaff(context.supabase, context.userId);
    const res = await fetch(
      `https://connector-gateway.lovable.dev/google_maps/maps/api/geocode/json?region=il&language=he&address=${encodeURIComponent(data.address)}`,
      {
        headers: {
          Authorization: `Bearer ${process.env["LOVABLE_API_KEY"]}`,
          "X-Connection-Api-Key": process.env["GOOGLE_MAPS_API_KEY"]!,
        },
      },
    );
    if (!res.ok) throw new Error(`Geocoding failed [${res.status}]: ${(await res.text()).slice(0, 200)}`);
    const j = (await res.json()) as { results: { formatted_address: string; geometry: { location: { lat: number; lng: number } }; address_components: { long_name: string; types: string[] }[] }[] };
    const r = j.results[0];
    if (!r) throw new Error("הכתובת לא נמצאה");
    return {
      address: r.formatted_address,
      lat: r.geometry.location.lat,
      lng: r.geometry.location.lng,
      city: r.address_components.find((c) => c.types.includes("locality"))?.long_name ?? "",
    };
  });

export const sendTestSms = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { phone: string }) => z.object({ phone: z.string().min(9).max(20) }).parse(d))
  .handler(async ({ data, context }) => {
    await assertStaff(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { sendSms } = await import("./sms.server");
    return { ok: await sendSms(supabaseAdmin, data.phone, "הודעת בדיקה ממערכת ההפצה", "test") };
  });

export const listTeam = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    if (!isAdmin) throw new Error("רק מנהל ראשי");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: roles } = await supabaseAdmin.from("user_roles").select("user_id, role");
    const { data: users } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
    return (users?.users ?? []).map((u) => ({ id: u.id, email: u.email ?? "", roles: (roles ?? []).filter((r) => r.user_id === u.id).map((r) => r.role) }));
  });

export const setUserRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { userId: string; role: "admin" | "area_manager" | "staff" | "none" }) =>
    z.object({ userId: z.string().uuid(), role: z.enum(["admin", "area_manager", "staff", "none"]) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    if (!isAdmin) throw new Error("רק מנהל ראשי");
    if (data.userId === context.userId) throw new Error("לא ניתן לשנות את ההרשאה של עצמך");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("user_roles").delete().eq("user_id", data.userId);
    if (data.role !== "none") await supabaseAdmin.from("user_roles").insert({ user_id: data.userId, role: data.role });
    return { ok: true };
  });

const ADMIN_EMAIL = "admin@hineh-mashiach.local";

// Password-only admin entry: verifies the shared password server-side and
// makes sure the single admin account exists with the admin role.
export const adminPasswordLogin = createServerFn({ method: "POST" })
  .inputValidator((d: { password: string }) => z.object({ password: z.string().min(1).max(100) }).parse(d))
  .handler(async ({ data }) => {
    const expected = process.env["ADMIN_PASSWORD"] || "770755";
    const { createHash, timingSafeEqual } = await import("node:crypto");
    const h = (s: string) => createHash("sha256").update(s).digest();
    if (!timingSafeEqual(h(data.password), h(expected))) return { ok: false as const };
    // Auth rejects short passwords, so the account uses a strong password derived from the shared one.
    const accountPassword = "Hz!" + createHash("sha256").update("hineh-admin:" + expected).digest("hex").slice(0, 32);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: list } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
    let user = list?.users.find((u) => u.email === ADMIN_EMAIL);
    if (!user) {
      const { data: c, error } = await supabaseAdmin.auth.admin.createUser({ email: ADMIN_EMAIL, password: accountPassword, email_confirm: true });
      if (error) throw new Error(error.message);
      user = c.user!;
    } else {
      await supabaseAdmin.auth.admin.updateUserById(user.id, { password: accountPassword });
    }
    await supabaseAdmin.from("user_roles").upsert({ user_id: user.id, role: "admin" }, { onConflict: "user_id,role", ignoreDuplicates: true });
    return { ok: true as const, email: ADMIN_EMAIL, accountPassword };
  });
