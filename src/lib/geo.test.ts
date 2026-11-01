import { describe, it, expect } from "vitest";
import { addBusinessDays, pickActivists, isValidIsraeliPhone, normalizePhone } from "./geo";

const base = { active: true, does_install: false, service_radius_km: 20 };
const point = { lat: 32.08, lng: 34.78 };

describe("pickActivists", () => {
  const list = [
    { id: "far", lat: 32.3, lng: 34.9, ...base },
    { id: "a", lat: 32.081, lng: 34.781, ...base },
    { id: "b", lat: 32.09, lng: 34.79, ...base },
    { id: "c", lat: 32.1, lng: 34.8, ...base },
    { id: "d", lat: 32.12, lng: 34.82, ...base },
    { id: "off", lat: 32.08, lng: 34.78, ...base, active: false },
  ];
  it("returns the 3 nearest active activists", () => {
    expect(pickActivists(list, point, 3, false).map((a) => a.id)).toEqual(["a", "b", "c"]);
  });
  it("prefers installers when installation is requested", () => {
    const l = list.map((a) => (a.id === "d" ? { ...a, does_install: true } : a));
    expect(pickActivists(l, point, 3, true)[0]?.id).toBe("d");
  });
  it("excludes activists outside their service radius", () => {
    expect(pickActivists(list, point, 10, false).map((a) => a.id)).not.toContain("far");
  });
});

describe("addBusinessDays", () => {
  it("skips Friday and Saturday", () => {
    // Thursday 2026-11-05 + 5 business days = Thursday 2026-11-12
    const r = addBusinessDays(new Date("2026-11-05T10:00:00Z"), 5);
    expect(r.toISOString().slice(0, 10)).toBe("2026-11-12");
  });
});

describe("phones", () => {
  it("normalizes and validates", () => {
    expect(normalizePhone("+972-52-123-4567")).toBe("0521234567");
    expect(isValidIsraeliPhone("052-1234567")).toBe(true);
    expect(isValidIsraeliPhone("12345")).toBe(false);
  });
});
