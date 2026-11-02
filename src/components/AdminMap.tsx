import { useEffect, useState, type ComponentType } from "react";
import "leaflet/dist/leaflet.css";

type Pt = { lat: number; lng: number; label: string; kind: "request" | "urgent" | "activist" };
type MapProps = { points: Pt[] };

/**
 * Load Leaflet only in the browser: Leaflet accesses the DOM during module
 * initialization, while this dashboard is also rendered on the server.
 */
export function AdminMap({ points }: MapProps) {
  const [LeafletMap, setLeafletMap] = useState<ComponentType<MapProps> | null>(null);

  useEffect(() => {
    let mounted = true;
    import("./AdminLeafletMap").then(({ default: Map }) => {
      if (mounted) setLeafletMap(() => Map);
    });
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div>
      {LeafletMap ? (
        <LeafletMap points={points} />
      ) : (
        <div className="h-[min(460px,65vh)] min-h-[320px] w-full animate-pulse rounded-2xl border bg-muted" aria-label="טוען מפה" />
      )}
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm">
        <span>🔵 בקשה פתוחה</span>
        <span>🔴 דחופה / ללא מענה</span>
        <span>🟡 פעיל</span>
      </div>
    </div>
  );
}
