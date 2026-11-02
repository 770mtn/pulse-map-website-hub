import {
  CircleMarker,
  LayersControl,
  MapContainer,
  Popup,
  TileLayer,
} from "react-leaflet";

type Pt = { lat: number; lng: number; label: string; kind: "request" | "urgent" | "activist" };

const COLORS = { request: "#2b4fbf", urgent: "#d93025", activist: "#e5a800" };

export default function AdminLeafletMap({ points }: { points: Pt[] }) {
  const requests = points.filter((point) => point.kind === "request");
  const urgent = points.filter((point) => point.kind === "urgent");
  const activists = points.filter((point) => point.kind === "activist");

  return (
    <MapContainer
      center={[31.8, 35]}
      zoom={8}
      scrollWheelZoom
      className="h-[min(460px,65vh)] min-h-[320px] w-full overflow-hidden rounded-2xl border bg-muted"
      aria-label="מפת בקשות ופעילים"
    >
      <LayersControl position="topright">
        <LayersControl.BaseLayer checked name="OpenStreetMap">
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
        </LayersControl.BaseLayer>
        <LayersControl.BaseLayer name="OpenStreetMap HOT">
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, style by <a href="https://www.hotosm.org/">Humanitarian OpenStreetMap Team</a>'
            url="https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png"
          />
        </LayersControl.BaseLayer>
        <LayersControl.Overlay checked name="בקשות פתוחות">
          <>
            {requests.map((point, index) => (
              <CircleMarker
                key={`request-${index}`}
                center={[point.lat, point.lng]}
                radius={9}
                pathOptions={{ color: "#fff", weight: 2, fillColor: COLORS.request, fillOpacity: 0.9 }}
              >
                <Popup>{point.label}</Popup>
              </CircleMarker>
            ))}
          </>
        </LayersControl.Overlay>
        <LayersControl.Overlay checked name="בקשות דחופות / ללא מענה">
          <>
            {urgent.map((point, index) => (
              <CircleMarker
                key={`urgent-${index}`}
                center={[point.lat, point.lng]}
                radius={9}
                pathOptions={{ color: "#fff", weight: 2, fillColor: COLORS.urgent, fillOpacity: 0.9 }}
              >
                <Popup>{point.label}</Popup>
              </CircleMarker>
            ))}
          </>
        </LayersControl.Overlay>
        <LayersControl.Overlay checked name="פעילים">
          <>
            {activists.map((point, index) => (
              <CircleMarker
                key={`activist-${index}`}
                center={[point.lat, point.lng]}
                radius={7}
                pathOptions={{ color: "#fff", weight: 2, fillColor: COLORS.activist, fillOpacity: 0.9 }}
              >
                <Popup>{point.label}</Popup>
              </CircleMarker>
            ))}
          </>
        </LayersControl.Overlay>
      </LayersControl>
    </MapContainer>
  );
}
