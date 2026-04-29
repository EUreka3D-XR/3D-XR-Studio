// src/components/RoutePlanner/RouteMapLayer.jsx
import React, { useMemo, useCallback } from "react";
import { Marker, Polyline, Tooltip, useMapEvents } from "react-leaflet";
import L from "leaflet";
import { useTourPlanner } from "../../context/TourPlannerContext";

const useNumberedIcon = () =>
  useCallback((n) => {
    return L.divIcon({
      className: "eureka-route-stop",
      html: `
        <div style="
          width:28px;height:28px;border-radius:50%;
          display:flex;align-items:center;justify-content:center;
          font-weight:700;font-size:13px;
          background:#ea580c;color:#fff;border:2px solid #fff;
          box-shadow:0 2px 6px rgba(0,0,0,.25)
        ">${n}</div>
      `,
      iconSize: [28, 28],
      iconAnchor: [14, 14],
      tooltipAnchor: [0, -14],
    });
  }, []);

const toRelativeMeters = (lat, lng, originLat, originLng) => {
  if (
    typeof originLat !== "number" ||
    typeof originLng !== "number" ||
    typeof lat !== "number" ||
    typeof lng !== "number"
  ) {
    return { relX: null, relY: null };
  }
  const dLat = (lat - originLat) * (Math.PI / 180);
  const dLng = (lng - originLng) * (Math.PI / 180);
  const meanLat = ((lat + originLat) / 2) * (Math.PI / 180);
  const R = 6371000; // raggio terrestre medio (m)
  // proiezione equirettangolare locale
  const relX = R * dLng * Math.cos(meanLat); // est-ovest
  const relY = R * dLat; // sud-nord (positivo verso nord)
  return { relX, relY };
};

const sortByOrder = (a, b) => {
  const ao = Number.isFinite(a.order) ? a.order : 0;
  const bo = Number.isFinite(b.order) ? b.order : 0;
  return ao - bo;
};

const RouteMapLayer = () => {
  const {
    isPlanning,            // boolean: modalità “percorso” attiva
    environment,           // { id, latitude, longitude, ... }
    activeRoute,           // { id, name, ... } o null
    stops,                 // array di tappe correnti [{id, order, label, latitude, longitude, ...}]
    addStop,               // ({latitude, longitude, rel_x, rel_y}) => Promise/void
    moveStop,              // (stopId, {latitude, longitude, rel_x, rel_y}) => Promise/void
    selectStop,            // (stopId) => void
    selectedStopId,        // number | null
  } = useTourPlanner();

  const numberedIcon = useNumberedIcon();

  useMapEvents({
    click(e) {
      if (!isPlanning || !activeRoute) return;
      const { lat, lng } = e.latlng;

      const { relX, relY } = toRelativeMeters(
        lat,
        lng,
        Number(environment?.latitude),
        Number(environment?.longitude)
      );

      // addStop si occupa di valorizzare route_id internamente (dal context)
      addStop({
        latitude: lat,
        longitude: lng,
        rel_x: relX,
        rel_y: relY,
      });
    },
  });

  // punti ordinati per la polyline
  const linePositions = useMemo(() => {
    if (!stops?.length) return [];
    return [...stops].sort(sortByOrder).map((s) => [s.latitude, s.longitude]);
  }, [stops]);

  if (!activeRoute) return null;

  return (
    <>
      {/* Polyline del percorso */}
      {linePositions.length >= 2 && (
        <Polyline positions={linePositions} weight={4} opacity={0.85} />
      )}

      {/* Marker delle tappe */}
      {[...(stops ?? [])].sort(sortByOrder).map((s, idx) => {
        const idx1 = (idx ?? 0) + 1;
        const icon = numberedIcon(idx1);

        const onDragEnd = (ev) => {
          const { lat, lng } = ev.target.getLatLng();
          const { relX, relY } = toRelativeMeters(
            lat,
            lng,
            Number(environment?.latitude),
            Number(environment?.longitude)
          );
          moveStop(s.id, {
            latitude: lat,
            longitude: lng,
            rel_x: relX,
            rel_y: relY,
          });
        };

        const isSelected = s.id === selectedStopId;

        return (
          <Marker
            key={s.id ?? idx}
            position={[s.latitude, s.longitude]}
            draggable={true}
            eventHandlers={{
              dragend: onDragEnd,
              click: () => selectStop?.(s.id),
            }}
            icon={icon}
            opacity={isSelected ? 1 : 0.95}
          >
            <Tooltip direction="top" offset={[0, -16]} permanent={false}>
              <div style={{ lineHeight: 1.2 }}>
                <div><strong>Tappa {idx1}</strong>{s.label ? ` — ${s.label}` : ""}</div>
                <div style={{ fontSize: 12 }}>
                  {Number(s.latitude).toFixed(6)}, {Number(s.longitude).toFixed(6)}
                </div>
              </div>
            </Tooltip>
          </Marker>
        );
      })}
    </>
  );
};

export default RouteMapLayer;
