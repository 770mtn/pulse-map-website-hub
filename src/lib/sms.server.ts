import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { renderTemplate } from "./geo";

function esc(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export function smsConfigured() {
  return Boolean(
    process.env["PULSEEM_FROM_NUMBER"] &&
      (process.env["PULSEEM_API_KEY"] || (process.env["PULSEEM_USER_ID"] && process.env["PULSEEM_PASSWORD"])),
  );
}

/** Sends one SMS through Pulseem and logs it. Prefers the REST API key. */
export async function sendSms(
  admin: SupabaseClient<Database>,
  to: string,
  body: string,
  kind: string,
): Promise<boolean> {
  const apiKey = process.env["PULSEEM_API_KEY"];
  const user = process.env["PULSEEM_USER_ID"];
  const pass = process.env["PULSEEM_PASSWORD"];
  const from = process.env["PULSEEM_FROM_NUMBER"];
  if (apiKey && from) {
    try {
      const res = await fetch("https://api.pulseem.com/api/v1/SmsApi/SendSms", {
        method: "POST",
        headers: { "Content-Type": "application/json", APIKey: apiKey },
        body: JSON.stringify({
          sendId: crypto.randomUUID(),
          isAsync: false,
          smsSendData: {
            fromNumber: from,
            toNumberList: [to],
            referenceList: [kind],
            textList: [body],
            isAutomaticUnsubscribeLink: false,
          },
        }),
      });
      const text = await res.text();
      let ok = res.ok;
      try {
        const j = JSON.parse(text);
        if (j && typeof j === "object" && "status" in j) ok = ok && /success/i.test(String(j.status));
        if (j && j.error) ok = false;
      } catch {
        /* non-JSON response */
      }
      await admin.from("sms_log").insert({
        to_phone: to,
        body,
        kind,
        status: ok ? "sent" : "failed",
        response: `[REST ${res.status}] ${text.slice(0, 500)}`,
      });
      return ok;
    } catch (e) {
      await admin.from("sms_log").insert({ to_phone: to, body, kind, status: "failed", response: String(e) });
      return false;
    }
  }
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
