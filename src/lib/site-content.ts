import { queryOptions, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

// Every editable site text: key -> [admin label, default value, group]
export const SITE_TEXTS = {
  site_name: ["שם האתר (בראש העמוד)", "הנה זה משיח בא", "כללי"],
  nav_how: ["כפתור 'איך זה עובד' בתפריט", "איך זה עובד?", "כללי"],
  nav_order: ["כפתור הזמנה בתפריט", "הגשת בקשה", "כללי"],
  footer_slogan: ["סלוגן בתחתית", "״הנה זה משיח בא – מגיע עד אליך לבית״", "כללי"],
  footer_note: ["שורה בתחתית", "מבצע הפצת דגלים ושלטים · פרטי המזמינים משמשים לטיפול בבקשה בלבד", "כללי"],
  hero_badge: ["תגית מעל הכותרת", "מבצע הפצה ארצי", "דף הבית – ראש העמוד"],
  hero_title: ["כותרת ראשית", "הנה זה משיח בא", "דף הבית – ראש העמוד"],
  hero_subtitle: ["כותרת משנה", "מגיע עד אליך לבית", "דף הבית – ראש העמוד"],
  hero_text: ["טקסט פתיחה", "מזמינים דגל או שלט – ופעיל מהאזור שלכם יתקשר ויביא עד הבית. פשוט, מהיר ובחינם.", "דף הבית – ראש העמוד"],
  hero_cta: ["כפתור ראשי", "אני רוצה להזמין", "דף הבית – ראש העמוד"],
  hero_cta2: ["כפתור משני", "איך זה עובד?", "דף הבית – ראש העמוד"],
  products_title: ["כותרת המוצרים", "המוצרים שלנו", "דף הבית – מוצרים"],
  products_cta: ["כפתור מתחת למוצרים", "הגשת בקשה", "דף הבית – מוצרים"],
  feat1_title: ["יתרון 1 – כותרת", "בוחרים מוצרים", "דף הבית – יתרונות"],
  feat1_text: ["יתרון 1 – טקסט", "דגלים, שלטים ועוד – בכמה קליקים", "דף הבית – יתרונות"],
  feat2_title: ["יתרון 2 – כותרת", "פעיל מתקשר", "דף הבית – יתרונות"],
  feat2_text: ["יתרון 2 – טקסט", "פעילים קרובים אליכם מקבלים הודעה", "דף הבית – יתרונות"],
  feat3_title: ["יתרון 3 – כותרת", "מגיע עד הבית", "דף הבית – יתרונות"],
  feat3_text: ["יתרון 3 – טקסט", "כולל התקנה אם תרצו", "דף הבית – יתרונות"],
  how_title: ["כותרת העמוד", "איך זה עובד?", "עמוד 'איך זה עובד'"],
  how_step1_title: ["שלב 1 – כותרת", "ממלאים בקשה", "עמוד 'איך זה עובד'"],
  how_step1_text: ["שלב 1 – טקסט", "בוחרים מוצרים, כמויות ואם רוצים התקנה.", "עמוד 'איך זה עובד'"],
  how_step2_title: ["שלב 2 – כותרת", "מאמתים טלפון", "עמוד 'איך זה עובד'"],
  how_step2_text: ["שלב 2 – טקסט", "מקבלים קוד ב-SMS ומזינים אותו – כדי שנוכל לחזור אליכם.", "עמוד 'איך זה עובד'"],
  how_step3_title: ["שלב 3 – כותרת", "בוחרים כתובת", "עמוד 'איך זה עובד'"],
  how_step3_text: ["שלב 3 – טקסט", "מקלידים את הכתובת ובוחרים מהרשימה.", "עמוד 'איך זה עובד'"],
  how_step4_title: ["שלב 4 – כותרת", "פעיל מהאזור מקבל הודעה", "עמוד 'איך זה עובד'"],
  how_step4_text: ["שלב 4 – טקסט", "שלושת הפעילים הקרובים אליכם מקבלים את פרטי הבקשה ב-SMS.", "עמוד 'איך זה עובד'"],
  how_step5_title: ["שלב 5 – כותרת", "הפעיל מתקשר ומגיע", "עמוד 'איך זה עובד'"],
  how_step5_text: ["שלב 5 – טקסט", "אחרי כמה ימים נשלח לכם הודעה לוודא שהכול הסתדר.", "עמוד 'איך זה עובד'"],
  how_cta: ["כפתור בתחתית", "אני רוצה להזמין", "עמוד 'איך זה עובד'"],
} as const satisfies Record<string, readonly [string, string, string]>;

export type SiteTextKey = keyof typeof SITE_TEXTS;
export type SiteContent = Record<SiteTextKey, string> & { hero_image: string };

export const siteContentQuery = queryOptions({
  queryKey: ["site-content"],
  queryFn: async (): Promise<Record<string, string>> => {
    const { data } = await supabase.from("site_content").select("key, value");
    return Object.fromEntries((data ?? []).map((r) => [r.key, r.value]));
  },
  staleTime: 60_000,
});

export function withDefaults(raw: Record<string, string> | undefined): SiteContent {
  const out: Record<string, string> = { hero_image: raw?.["hero_image"] ?? "" };
  for (const [k, [, def]] of Object.entries(SITE_TEXTS)) out[k] = raw?.[k]?.trim() ? raw[k] : def;
  return out as SiteContent;
}

export function useSiteContent(): SiteContent {
  const { data } = useQuery(siteContentQuery);
  return withDefaults(data);
}
