import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { renderTemplate } from "./geo";

function esc(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export function smsConfigured() {
  return Boolean(
    process.env["PULSEEM_USER_ID"] && process.env["PULSEEM_PASSWORD"] && process.env["PULSEEM_FROM_NUMBER"],
  );
}

/** Sends one SMS through Pulseem (direct-send web service) and logs it. */
export async function sendSms(
  admin: SupabaseClient<Database>,
  to: string,
  body: string,
  kind: string,
): Promise<boolean> {
  const user = process.env["PULSEEM_USER_ID"];
  const pass = process.env["PULSEEM_PASSWORD"];
  const from = process.env["PULSEEM_FROM_NUMBER"];
  if (!user || !pass || !from) {
    await admin.from("sms_log").insert({ to_phone: to, body, kind, status: "not_configured" });
    return false;
  }
  const xml = `<?xml version="1.0" encoding="utf-8"?><soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/"><soap:Body><SendSingleSMS xmlns="http://tempuri.org/"><userID>${esc(user)}</userID><password>${esc(pass)}</password><fromNumber>${esc(from)}</fromNumber><toNumber>${esc(to)}</toNumber><reference>${kind}</reference><text>${esc(body)}</text><delayDeliveryMinutes>0</delayDeliveryMinutes></SendSingleSMS></soap:Body></soap:Envelope>`;
  try {
    const res = await fetch("https://www.pulseem.co.il/Pulseem/pulseemSendservices.asmx", {
      method: "POST",
      headers: { "Content-Type": "text/xml; charset=utf-8", SOAPAction: '"http://tempuri.org/SendSingleSMS"' },
      body: xml,
    });
    const text = await res.text();
    const ok = res.ok && /<SendSingleSMSResult>\s*Success/i.test(text);
    await admin.from("sms_log").insert({
      to_phone: to,
      body,
      kind,
      status: ok ? "sent" : "failed",
      response: `[${res.status}] ${text.slice(0, 500)}`,
    });
    return ok;
  } catch (e) {
    await admin.from("sms_log").insert({ to_phone: to, body, kind, status: "failed", response: String(e) });
    return false;
  }
}

export async function sendTemplate(
  admin: SupabaseClient<Database>,
  key: string,
  to: string,
  vars: Record<string, string>,
) {
  const { data } = await admin.from("sms_templates").select("body").eq("key", key).maybeSingle();
  const body = renderTemplate(data?.body ?? "", vars);
  return sendSms(admin, to, body, key);
}
