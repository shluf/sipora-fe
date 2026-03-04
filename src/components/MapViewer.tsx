"use client";

import { MapContainer, TileLayer, ImageOverlay, Marker, Popup, GeoJSON, useMapEvents } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import type { SpatialData } from "@/lib/api";
import L from "leaflet";
import { useMemo, useState, useEffect } from "react";

function useTheme() {
    const [isDark, setIsDark] = useState(false);
    useEffect(() => {
        const check = () => setIsDark(document.documentElement.getAttribute("data-theme") === "dark");
        check();
        const observer = new MutationObserver(check);
        observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
        return () => observer.disconnect();
    }, []);
    return isDark;
}

// Fix Leaflet marker icons in Next.js
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
    iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
    shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

const redIcon = new L.Icon({
    iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png",
    shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41],
});

function MapClickHandler({ onClick }: { onClick: (lat: number, lon: number) => void }) {
    useMapEvents({
        click: (e) => {
            onClick(e.latlng.lat, e.latlng.lng);
        },
    });
    return null;
}

export type PickerMode = "wilayah" | "titik" | null;

// Layer opacity config per type
const LAYER_OPACITY: Record<string, number> = {
    qpe: 0.85,
    dbz: 0.85,
    altitude: 0.70,
    slope: 0.65,
};
const LAYER_LABELS: Record<string, string> = {
    qpe: "QPE (mm/10min)",
    dbz: "Reflektifitas (dBZ)",
    altitude: "Ketinggian (m)",
    slope: "Kemiringan (°)",
};

interface MapViewerProps {
    imageData?: SpatialData | null;       // legacy single-layer
    imageLayers?: Array<{ layer: string; data: SpatialData }>;  // multi-layer
    geojson?: any;
    pickerMode: PickerMode;
    pickedPoint?: { lat: number; lon: number } | null;
    selectedAreaName?: string | null;
    onPointPick?: (lat: number, lon: number) => void;
    onAreaPick?: (areaName: string, kecamatan: string, kabupaten: string) => void;
    legendMinimized?: boolean;
    boundaryWeight?: number;
}

export default function MapViewer({ imageData, imageLayers, geojson, pickerMode, pickedPoint, selectedAreaName, onPointPick, onAreaPick, legendMinimized, boundaryWeight = 0.8 }: MapViewerProps) {
    const isDark = useTheme();

    // Support both single imageData (legacy) and imageLayers (multi)
    const layers = imageLayers && imageLayers.length > 0
        ? imageLayers
        : imageData ? [{ layer: "qpe", data: imageData }] : [];

    const primaryData = layers[0]?.data ?? null;
    const bounds: L.LatLngBoundsExpression = primaryData?.bounds || [
        [-8.60, 109.10],
        [-6.80, 111.90],
    ];

    const tileUrl = isDark
        ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        : "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png";

    // Style for boundary polygons
    const getStyle = useMemo(() => (feature: any) => {
        const kab = feature?.properties?.NAMA_KAB || "";
        const kec = feature?.properties?.NAMA_KEC || "";
        const name = `${kec}, ${kab}`;
        const isSelected = selectedAreaName === name;

        const borderColor = isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.35)";
        const borderColorHover = isDark ? "rgba(255,255,255,0.8)" : "rgba(0,0,0,0.6)";

        if (pickerMode === "wilayah") {
            return {
                color: isSelected ? "#22d3ee" : borderColor,
                weight: isSelected ? Math.max(2.5, boundaryWeight * 2) : boundaryWeight,
                fillColor: isSelected ? "rgba(34,211,238,0.2)" : "transparent",
                fillOpacity: isSelected ? 1 : 0,
                dashArray: isSelected ? "" : "3 3",
            };
        }
        return {
            color: borderColor,
            weight: boundaryWeight,
            fillColor: "transparent",
            fillOpacity: 0,
            dashArray: "3 3",
        };
    }, [pickerMode, selectedAreaName, isDark, boundaryWeight]);

    const onEachFeature = useMemo(() => (feature: any, layer: L.Layer) => {
        if (feature.properties) {
            const kec = feature.properties.NAMA_KEC || "";
            const kab = feature.properties.NAMA_KAB || "";
            (layer as any).bindTooltip(`${kec}, ${kab}`, {
                sticky: true,
                className: "boundary-tooltip",
                direction: "top",
                offset: [0, -8],
            });

            if (pickerMode === "wilayah" && onAreaPick) {
                layer.on("click", (e) => {
                    L.DomEvent.stopPropagation(e);
                    onAreaPick(`${kec}, ${kab}`, kec, kab);
                });
                layer.on("mouseover", () => {
                    (layer as any).setStyle({ fillColor: "rgba(34,211,238,0.15)", fillOpacity: 1, weight: 2 });
                });
                layer.on("mouseout", () => {
                    const name = `${kec}, ${kab}`;
                    if (name !== selectedAreaName) {
                        (layer as any).setStyle(getStyle(feature));
                    }
                });
            }
        }
    }, [pickerMode, onAreaPick, selectedAreaName, getStyle]);

    // Force GeoJSON re-render when pickerMode, selectedAreaName, or theme changes
    const geoKey = `${pickerMode}-${selectedAreaName || "none"}-${isDark ? "dark" : "light"}`;

    // Cursor based on mode
    const cursor = pickerMode === "titik" ? "crosshair" : pickerMode === "wilayah" ? "pointer" : "grab";

    return (
        <div style={{ height: "100%", width: "100%", borderRadius: 0, overflow: "hidden" }}>
            <MapContainer
                center={[-7.7316, 110.354]}
                zoom={9}
                style={{ height: "100%", width: "100%", zIndex: 0, cursor }}
                scrollWheelZoom={true}
            >
                <TileLayer
                    key={isDark ? "dark" : "light"}
                    url={tileUrl}
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> contributors'
                />

                <Marker position={[-7.7316, 110.354]}>
                    <Popup>Radar C-Band BMKG Mlati</Popup>
                </Marker>

                {/* DIY Boundary Polygons */}
                {geojson && (
                    <GeoJSON
                        key={geoKey}
                        data={geojson}
                        style={getStyle}
                        onEachFeature={onEachFeature}
                    />
                )}

                {/* Multi-layer image overlays */}
                {layers.map(({ layer, data }, idx) => (
                    <ImageOverlay
                        key={`${layer}-${data.timestamp}`}
                        url={`data:${data.content_type};base64,${data.image_base64}`}
                        bounds={data.bounds as L.LatLngBoundsExpression}
                        opacity={LAYER_OPACITY[layer] ?? 0.85}
                        zIndex={10 + idx}
                    />
                ))}

                {/* Click handler for point picking */}
                {pickerMode === "titik" && onPointPick && <MapClickHandler onClick={onPointPick} />}

                {/* Picked point marker */}
                {pickedPoint && (
                    <Marker position={[pickedPoint.lat, pickedPoint.lon]} icon={redIcon}>
                        <Popup>
                            Titik Koordinat<br />
                            Lat: {pickedPoint.lat.toFixed(5)}<br />
                            Lon: {pickedPoint.lon.toFixed(5)}
                        </Popup>
                    </Marker>
                )}

                {/* Legends per layer */}
                {layers.length > 0 && !legendMinimized && (
                    <div
                        className="leaflet-bottom leaflet-right"
                        style={{ pointerEvents: "auto", zIndex: 1000, padding: "10px", display: "flex", flexDirection: "column", gap: 8, alignItems: "flex-end" }}
                    >
                        {layers.map(({ layer, data }) => data.legend && (
                            <div key={layer} className="leaflet-control leaflet-bar" style={{ background: "var(--card)", padding: "8px 10px", borderRadius: "var(--radius)", boxShadow: "var(--shadow-md)", minWidth: 120 }}>
                                <h4 style={{ fontSize: "0.7rem", fontWeight: 700, marginBottom: "0.375rem", color: "var(--muted-foreground)" }}>
                                    {LAYER_LABELS[layer] || layer}
                                </h4>
                                <div style={{ display: "flex", flexDirection: "column", gap: "0.2rem", fontSize: "0.65rem", maxHeight: 200, overflowY: "auto" }}>
                                    {data.legend.colors.map((color, idx) => {
                                        if (color === "#00000000") return null;
                                        const val1 = data.legend.values[idx];
                                        const val2 = data.legend.values[idx + 1];
                                        const label = idx === data.legend.colors.length - 1
                                            ? `> ${val1}` : `${val1}–${val2 ?? ""}`;
                                        return (
                                            <div key={idx} style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                                                <span style={{ width: 10, height: 10, flexShrink: 0, background: color, border: "1px solid rgba(0,0,0,0.1)" }} />
                                                {label}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </MapContainer>
        </div>
    );
}
