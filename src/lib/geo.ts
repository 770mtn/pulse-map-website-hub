export type LatLng = { lat: number; lng: number };

export function distanceKm(a: LatLng, b: LatLng): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export type ActivistLite = {
  id: string;
  lat: number | null;
  lng: number | null;
  active: boolean;
  does_install: boolean;
  service_radius_km: number;
};

/**
 * Picks the N nearest active activists within their service radius.
 * When installation is requested, activists who install are preferred,
 * then the list is filled with the nearest others.
 */
export function pickActivists<T extends ActivistLite>(
  activists: T[],
  point: LatLng,
  count: number,
  wantsInstall: boolean,
): (T & { distance: number })[] {
  const candidates = activists
    .filter((a) => a.active && a.lat != null && a.lng != null)
    .map((a) => ({ ...a, distance: distanceKm(point, { lat: a.lat!, lng: a.lng! }) }))
    .filter((a) => a.distance <= Number(a.service_radius_km))
    .sort((x, y) => x.distance - y.distance);
  if (!wantsInstall) return candidates.slice(0, count);
  const installers = candidates.filter((a) => a.does_install);
  const others = candidates.filter((a) => !a.does_install);
  return [...installers, ...others].slice(0, count);
}

/** Adds business days (Sun–Thu are workdays in Israel; Fri/Sat skipped). */
export function addBusinessDays(from: Date, days: number): Date {
  const d = new Date(from);
  let added = 0;
  while (added < days) {
    d.setUTCDate(d.getUTCDate() + 1);
    const wd = d.getUTCDay();
    if (wd !== 5 && wd !== 6) added++;
  }
  return d;
}

export function normalizePhone(p: string): string {
  let s = p.replace(/[^\d+]/g, "");
  if (s.startsWith("+972")) s = "0" + s.slice(4);
  else if (s.startsWith("972")) s = "0" + s.slice(3);
  return s;
}

export function isValidIsraeliPhone(p: string): boolean {
  return /^0(5\d{8}|[2-9]\d{7})$/.test(normalizePhone(p));
}

export function renderTemplate(body: string, vars: Record<string, string>): string {
  return body.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? "");
}
