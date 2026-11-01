import { createFileRoute } from "@tanstack/react-router";
import { authenticateCronRequest } from "@/integrations/supabase/cron-auth";

export const Route = createFileRoute("/api/public/jobs/followup")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const authFailure = await authenticateCronRequest(request);
        if (authFailure) return authFailure;
        const { supabaseAdmin: db } = await import("@/integrations/supabase/client.server");
        const { sendTemplate } = await import("@/lib/sms.server");
        const origin = new URL(request.url).origin;
        const now = new Date().toISOString();

        // 1. Follow-up SMS to customers whose waiting period ended
        const { data: due } = await db
          .from("requests")
          .select("id, full_name, phone, track_token")
          .eq("status", "sent")
          .is("followup_sent_at", null)
          .lte("followup_due_at", now)
          .limit(200);
        for (const r of due ?? []) {
          await sendTemplate(db, "customer_followup", r.phone, { name: r.full_name, link: `${origin}/track/${r.track_token}` });
          await db.from("requests").update({ status: "awaiting_followup", followup_sent_at: now, updated_at: now }).eq("id", r.id);
          await db.from("request_events").insert({ request_id: r.id, event: "נשלח SMS מעקב למזמין" });
        }

        // 2. Escalate requests with no customer answer 2 days after follow-up
        const twoDaysAgo = new Date(Date.now() - 2 * 86400_000).toISOString();
        const { data: stale } = await db
          .from("requests")
          .select("id, full_name, phone, address")
          .eq("status", "awaiting_followup")
          .lte("followup_sent_at", twoDaysAgo)
          .limit(200);
        const { data: s } = await db.from("settings").select("admin_phone").eq("id", 1).single();
        for (const r of stale ?? []) {
          await db.from("requests").update({ status: "escalated", urgent: true, updated_at: now }).eq("id", r.id);
          await db.from("request_events").insert({ request_id: r.id, event: "אין תשובה מהמזמין – הועבר למנהל" });
          if (s?.admin_phone)
            await sendTemplate(db, "admin_alert", s.admin_phone, { name: r.full_name, phone: r.phone, address: r.address, reason: "אין תשובה למעקב" });
        }
        return Response.json({ followups: due?.length ?? 0, escalated: stale?.length ?? 0 });
      },
    },
  },
});
