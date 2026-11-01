import { useEffect, useRef, useState } from "react";

type Pt = { lat: number; lng: number; label: string; kind: "request" | "urgent" | "activist" };

declare global {
  interface Window {
    __gmapsReady?: () => void;
    google?: any;
  }
}

let loader: Promise<void> | null = null;
function loadMaps(): Promise<void> {
  if (window.google?.maps) return Promise.resolve();
  if (loader) return loader;
  loader = new Promise((resolve) => {
    window.__gmapsReady = () => resolve();
    const key = import.meta.env["VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_BROWSER_KEY"];
    const ch = import.meta.env["VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_TRACKING_ID"];
    const s = document.createElement("script");
    s.src = `https://maps.googleapis.com/maps/api/js?key=${key}&loading=async&callback=__gmapsReady&language=he&region=IL&channel=${ch}`;
    s.async = true;
    document.head.appendChild(s);
  });
  return loader;
}

const COLORS = { request: "#2b4fbf", urgent: "#d93025", activist: "#e5a800" };

export function AdminMap({ points }: { points: Pt[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const map = useRef<any>(null);
  const markers = useRef<any[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    loadMaps().then(() => {
      if (!ref.current || map.current) return;
      map.current = new window.google.maps.Map(ref.current, { center: { lat: 31.8, lng: 35 }, zoom: 8, clickableIcons: false });
      setReady(true);
    });
  }, []);

  useEffect(() => {
    if (!ready) return;
    const g = window.google.maps;
    markers.current.forEach((m) => m.setMap(null));
    const info = new g.InfoWindow();
    markers.current = points.map((p) => {
      const m = new g.Marker({
        position: { lat: p.lat, lng: p.lng },
        map: map.current,
        title: p.label,
        icon: { path: g.SymbolPath.CIRCLE, scale: p.kind === "activist" ? 7 : 9, fillColor: COLORS[p.kind], fillOpacity: 0.9, strokeColor: "#fff", strokeWeight: 2 },
      });
      m.addListener("click", () => { info.setContent(p.label); info.open({ map: map.current, anchor: m }); });
      return m;
    });
  }, [ready, points]);

  return (
    <div>
      <div ref={ref} className="h-[460px] w-full overflow-hidden rounded-2xl border bg-muted" />
      <div className="mt-2 flex gap-4 text-sm">
        <span>🔵 בקשה פתוחה</span><span>🔴 דחופה / ללא מענה</span><span>🟡 פעיל</span>
      </div>
    </div>
  );
}
