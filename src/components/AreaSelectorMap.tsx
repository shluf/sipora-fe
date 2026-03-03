"use client";

import { MapContainer, TileLayer, GeoJSON, Marker, Popup, useMap, useMapEvents } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { useEffect, useRef, useMemo } from "react";

// Fix Leaflet marker icons in Next.js
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
    iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
    shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

// Red marker icon for custom point
const redIcon = new L.Icon({
    iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png",
    shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41],
});

function FitBounds({ geojson }: { geojson: any }) {
    const map = useMap();
    useEffect(() => {
        if (geojson) {
            try {
                const layer = L.geoJSON(geojson);
                map.fitBounds(layer.getBounds(), { padding: [10, 10] });
            } catch (e) {
                console.error("Failed to fit bounds", e);
            }
        }
    }, [geojson, map]);
    return null;
}

function MapClickHandler({ onMapClick }: { onMapClick: (lat: number, lon: number) => void }) {
    useMapEvents({
        click: (e) => {
            onMapClick(e.latlng.lat, e.latlng.lng);
        },
    });
    return null;
}

interface AreaSelectorMapProps {
    geojson: any;
    selectedArea: string;
    onAreaSelect: (area: string) => void;
    customPoint: { lat: number; lon: number } | null;
    onPointSelect: (lat: number, lon: number) => void;
    pointMode: boolean;
}

export default function AreaSelectorMap({ geojson, selectedArea, onAreaSelect, customPoint, onPointSelect, pointMode }: AreaSelectorMapProps) {
    const geoJsonRef = useRef<L.GeoJSON>(null);

    useEffect(() => {
        if (geoJsonRef.current) {
            geoJsonRef.current.setStyle((feature: any) => {
                const areaName = feature.properties?.name || feature.properties?.kabupaten;
                const isSelected = !pointMode && areaName === selectedArea;
                return {
                    fillColor: isSelected ? "#0055a4" : "#3388ff",
                    weight: isSelected ? 2 : 1,
                    opacity: 1,
                    color: isSelected ? "#000" : "white",
                    fillOpacity: isSelected ? 0.6 : 0.15
                };
            });
        }
    }, [selectedArea, pointMode]);

    const onEachFeature = (feature: any, layer: L.Layer) => {
        const areaName = feature.properties?.name || feature.properties?.kabupaten;
        layer.on({
            click: (e) => {
                if (pointMode) {
                    // In point mode, let MapClickHandler take over
                    return;
                }
                if (areaName) {
                    onAreaSelect(areaName);
                }
            },
            mouseover: (e) => {
                if (!pointMode) {
                    const l = e.target;
                    if (areaName !== selectedArea) {
                        l.setStyle({ fillOpacity: 0.4 });
                    }
                }
            },
            mouseout: (e) => {
                if (!pointMode && geoJsonRef.current) {
                    const l = e.target;
                    geoJsonRef.current.resetStyle(l);
                    if (areaName === selectedArea) {
                        l.setStyle({ fillColor: "#0055a4", weight: 2, opacity: 1, color: "#000", fillOpacity: 0.6 });
                    }
                }
            }
        });

        if (areaName) {
            layer.bindTooltip(areaName, { direction: "center", className: "area-tooltip", permanent: false });
        }
    };

    const style = (feature: any) => {
        const areaName = feature.properties?.name || feature.properties?.kabupaten;
        const isSelected = !pointMode && areaName === selectedArea;
        return {
            fillColor: isSelected ? "#0055a4" : "#3388ff",
            weight: isSelected ? 2 : 1,
            opacity: 1,
            color: isSelected ? "#000" : "white",
            fillOpacity: isSelected ? 0.6 : 0.15
        };
    };

    const handleMapClick = (lat: number, lon: number) => {
        if (pointMode) {
            onPointSelect(lat, lon);
        }
    };

    return (
        <div style={{ height: "220px", width: "100%", borderRadius: "var(--radius)", overflow: "hidden", border: "1px solid var(--border)", marginTop: "0.5rem", zIndex: 0 }}>
            <MapContainer
                center={[-7.8, 110.4]}
                zoom={8}
                style={{ height: "100%", width: "100%", zIndex: 0, cursor: pointMode ? "crosshair" : "grab" }}
                scrollWheelZoom={false}
                attributionControl={false}
            >
                <TileLayer url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png" />
                <MapClickHandler onMapClick={handleMapClick} />
                {geojson && (
                    <>
                        <FitBounds geojson={geojson} />
                        <GeoJSON
                            ref={geoJsonRef}
                            data={geojson}
                            style={style}
                            // @ts-ignore
                            onEachFeature={onEachFeature}
                        />
                    </>
                )}
                {customPoint && (
                    <Marker position={[customPoint.lat, customPoint.lon]} icon={redIcon}>
                        <Popup>
                            Titik Analisis<br />
                            Lat: {customPoint.lat.toFixed(5)}<br />
                            Lon: {customPoint.lon.toFixed(5)}
                        </Popup>
                    </Marker>
                )}
            </MapContainer>
        </div>
    );
}
