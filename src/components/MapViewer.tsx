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

interface MapViewerProps {
    imageData: SpatialData | null;
    geojson?: any;
    pickerMode: PickerMode;
    pickedPoint?: { lat: number; lon: number } | null;
    selectedAreaName?: string | null;
    onPointPick?: (lat: number, lon: number) => void;
    onAreaPick?: (areaName: string, kecamatan: string, kabupaten: string) => void;
    legendMinimized?: boolean;
    boundaryWeight?: number;
}

export default function MapViewer({ imageData, geojson, pickerMode, pickedPoint, selectedAreaName, onPointPick, onAreaPick, legendMinimized, boundaryWeight = 0.8 }: MapViewerProps) {
    const isDark = useTheme();
    const bounds: L.LatLngBoundsExpression = imageData?.bounds || [
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

                {imageData && (
                    <ImageOverlay
                        url={`data:${imageData.content_type};base64,${imageData.image_base64}`}
                        bounds={bounds}
                        opacity={0.85}
                        zIndex={10}
                    />
                )}

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

                {/* Custom Legend */}
                {imageData && imageData.legend && !legendMinimized && (
                    <div
                        className="leaflet-bottom leaflet-right"
                        style={{ pointerEvents: "auto", zIndex: 1000, padding: "10px" }}
                    >
                        <div className="leaflet-control leaflet-bar" style={{ background: "var(--card)", padding: "10px", borderRadius: "var(--radius)", boxShadow: "var(--shadow-md)" }}>
                            <h4 style={{ fontSize: "0.75rem", fontWeight: "bold", marginBottom: "0.5rem" }}>
                                Legenda {imageData.image_base64.length > 0 && imageData.legend.values[0] === 5 ? "(dBZ)" : "(mm/10min)"}
                            </h4>
                            <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem", fontSize: "0.7rem", maxHeight: "250px", overflowY: "auto", paddingRight: "5px" }}>
                                {imageData.legend.colors.map((color, idx) => {
                                    const val1 = imageData.legend.values[idx];
                                    const val2 = imageData.legend.values[idx + 1];
                                    let label = "";
                                    if (idx === 0) {
                                        label = `0.0`;
                                    } else if (idx === imageData.legend.colors.length - 1) {
                                        label = `> ${val1}`;
                                    } else {
                                        label = `${val1} - ${val2 || ""}`;
                                    }
                                    return (
                                        <div key={idx} style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                                            <span style={{
                                                width: 12, height: 12,
                                                background: color,
                                                border: color === "#00000000" ? "1px solid #ccc" : "1px solid rgba(0,0,0,0.1)"
                                            }}></span>
                                            {label}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                )}
            </MapContainer>
        </div>
    );
}
