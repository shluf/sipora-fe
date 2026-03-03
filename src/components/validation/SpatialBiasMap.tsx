"use client";

import { useEffect, useRef, useState } from "react";
import { api, type ValidationStation, type RadarConfig, type SpatialData } from "@/lib/api";

interface Props {
    stations: ValidationStation[];
    radar: RadarConfig;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type LeafletMap = any;

export default function SpatialBiasMap({ stations, radar }: Props) {
    const mapRef = useRef<HTMLDivElement>(null);
    const mapInstanceRef = useRef<LeafletMap>(null);
    const overlayLayerRef = useRef<LeafletMap>(null);

    const [showOverlay, setShowOverlay] = useState(false);
    const [overlayData, setOverlayData] = useState<SpatialData | null>(null);
    const [loadingOverlay, setLoadingOverlay] = useState(false);

    // Fetch overlay data for the first station's timestamp
    useEffect(() => {
        if (showOverlay && !overlayData && stations.length > 0) {
            setLoadingOverlay(true);
            const ts = stations[0].timestamp;
            api.getSpatial(ts, "qpe", "daily")
                .then(data => setOverlayData(data))
                .catch(err => console.error("Gagal mengambil data QPE harian:", err))
                .finally(() => setLoadingOverlay(false));
        }
    }, [showOverlay, overlayData, stations]);

    // Handle overlay layer on map
    useEffect(() => {
        if (typeof window === "undefined" || !mapInstanceRef.current) return;
        const L = (window as any).L;
        if (!L) return;

        if (showOverlay && overlayData) {
            if (!overlayLayerRef.current) {
                const bounds = L.latLngBounds(overlayData.bounds);
                overlayLayerRef.current = L.imageOverlay(
                    `data:${overlayData.content_type};base64,${overlayData.image_base64}`,
                    bounds,
                    { opacity: 0.65 }
                ).addTo(mapInstanceRef.current);
            }
        } else {
            if (overlayLayerRef.current) {
                mapInstanceRef.current.removeLayer(overlayLayerRef.current);
                overlayLayerRef.current = null;
            }
        }
    }, [showOverlay, overlayData]);

    useEffect(() => {
        if (!mapRef.current || typeof window === "undefined") return;

        // Dynamic Leaflet import
        const initMap = async () => {
            const L = (await import("leaflet")).default;

            // Cleanup previous map
            if (mapInstanceRef.current) {
                mapInstanceRef.current.remove();
                mapInstanceRef.current = null;
            }

            const map = L.map(mapRef.current!, { zoomControl: true }).setView([radar.lat, radar.lon], 9);
            mapInstanceRef.current = map;

            const osmLayer = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
                attribution: "© OpenStreetMap",
            }).addTo(map);

            // Light basemap layer
            const lightLayer = L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", {
                attribution: "© CartoDB",
            });
            L.control.layers(
                { OpenStreetMap: osmLayer, Light: lightLayer } as Record<string, L.TileLayer>,
                {},
                { position: "topright" }
            ).addTo(map);

            // Radar marker
            const radarIcon = L.divIcon({
                html: `<div style="font-size:1.5rem;text-align:center;filter:drop-shadow(1px 1px 2px rgba(0,0,0,0.5))">📡</div>`,
                iconSize: [30, 30],
                iconAnchor: [15, 15],
                className: "",
            });
            L.marker([radar.lat, radar.lon], { icon: radarIcon })
                .bindPopup(`<b>${radar.name}</b><br>Lat: ${radar.lat.toFixed(5)}<br>Lon: ${radar.lon.toFixed(5)}`)
                .bindTooltip("Lokasi Radar", { direction: "top" })
                .addTo(map);

            // Radar range circle
            L.circle([radar.lat, radar.lon], {
                radius: radar.max_range_km * 1000,
                color: "#ef4444",
                fill: false,
                dashArray: "10,6",
                weight: 2,
                opacity: 0.6,
            })
                .bindTooltip(`Jangkauan ${radar.max_range_km} km`, { direction: "bottom" })
                .addTo(map);

            // Station markers colored by bias
            stations.forEach((station) => {
                if (isNaN(station.latitude) || isNaN(station.longitude)) return;

                const bias = station.error ?? (station.qpe_accumulation_mm - station.aws_rainfall_mm);
                let color = "#10b981"; // green = OK
                if (bias < -5) color = "#3b82f6"; // blue = underestimate
                if (bias > 5) color = "#ef4444"; // red = overestimate

                const radius = Math.min(Math.abs(station.aws_rainfall_mm) * 0.3 + 5, 15);

                L.circleMarker([station.latitude, station.longitude], {
                    radius,
                    color,
                    fillColor: color,
                    fillOpacity: 0.7,
                    weight: 1.5,
                })
                    .bindPopup(
                        `<div style="font-size:0.8rem;line-height:1.6">
              <b>${station.station_name}</b><br>
              Obs: ${station.aws_rainfall_mm.toFixed(1)} mm<br>
              QPE: ${station.qpe_accumulation_mm.toFixed(1)} mm<br>
              Bias: <span style="color:${color};font-weight:700">${bias >= 0 ? "+" : ""}${bias.toFixed(1)} mm</span><br>
              Jarak: ${station.distance_km.toFixed(1)} km
              ${station.is_outlier ? "<br>⚠️ <b>Outlier</b>" : ""}
            </div>`
                    )
                    .bindTooltip(station.station_name, { direction: "top" })
                    .addTo(map);
            });

            // Legend
            const LegendControl = L.Control.extend({
                onAdd: function () {
                    const div = L.DomUtil.create("div", "");
                    div.style.cssText = "background:rgba(255,255,255,0.92);padding:8px 12px;border-radius:6px;font-size:0.7rem;border:1px solid #e2e8f0;line-height:1.8";
                    div.innerHTML = `
              <b>Bias QPE</b><br>
              <span style="color:#3b82f6">●</span> Underestimate (&lt;-5mm)<br>
              <span style="color:#10b981">●</span> OK (±5mm)<br>
              <span style="color:#ef4444">●</span> Overestimate (&gt;5mm)
            `;
                    return div;
                },
            });
            new LegendControl({ position: "bottomright" }).addTo(map);

            // Fit bounds to include all stations
            if (stations.length > 0) {
                const bounds = L.latLngBounds(stations.map((s) => [s.latitude, s.longitude]));
                bounds.extend([radar.lat, radar.lon]);
                map.fitBounds(bounds, { padding: [30, 30] });
            }
        };

        initMap();

        return () => {
            if (mapInstanceRef.current) {
                mapInstanceRef.current.remove();
                mapInstanceRef.current = null;
            }
        };
    }, [stations, radar]);

    return (
        <div style={{ position: "relative", width: "100%", height: "500px" }}>
            <div
                ref={mapRef}
                style={{
                    width: "100%",
                    height: "100%",
                    borderRadius: "var(--radius)",
                    border: "1px solid var(--border)",
                    overflow: "hidden",
                }}
            />
            {/* Toggle Overlay */}
            <div style={{
                position: "absolute", bottom: 24, left: 16, zIndex: 1000,
                background: "var(--card)", padding: "8px 12px", borderRadius: "var(--radius)",
                boxShadow: "var(--shadow-md)", border: "1px solid var(--border)",
                display: "flex", alignItems: "center", gap: "8px", fontSize: "0.8125rem", fontWeight: 600
            }}>
                <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", margin: 0, color: "var(--foreground)" }}>
                    <input type="checkbox" checked={showOverlay} onChange={(e) => setShowOverlay(e.target.checked)} style={{ cursor: "pointer", accentColor: "var(--primary)" }} />
                    Overlay QPE Harian
                </label>
                {loadingOverlay && <div className="spinner" style={{ width: 12, height: 12, borderWidth: 2 }} />}
            </div>
        </div>
    );
}
