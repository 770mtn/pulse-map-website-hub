export const STATUSES: Record<string, string> = {
  new: "חדשה",
  sent: "נשלחה לפעילים",
  awaiting_followup: "ממתינה למעקב",
  contacted: "נוצר קשר",
  in_progress: "ההזמנה בטיפול",
  done: "בוצעה",
  no_contact: "לא נוצר קשר",
  escalated: "הועברה למנהל",
  cancelled: "בוטלה",
};
export const OPEN_STATUSES = ["new", "sent", "awaiting_followup", "contacted", "in_progress", "no_contact", "escalated"];
