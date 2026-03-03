"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { Minus, Maximize2, Layers, ChevronLeft, ChevronRight, MapPin, Map, Edit3, Check, X, Calendar as CalendarIcon, SlidersHorizontal, Fullscreen, Shrink, ChevronDown } from "lucide-react";
import { api, type SpatialData, type AccumulationMode } from "@/lib/api";
import dynamic from "next/dynamic";
import CustomDatePicker from "./CustomDatePicker";
import type { PickerMode } from "./MapViewer";

const MapViewer = dynamic(() => import("./MapViewer"), {
    ssr: false,
    loading: () => (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", background: "var(--muted)" }}>
            <div className="spinner" style={{ width: "1.5rem", height: "1.5rem", borderWidth: 2 }} />
        </div>
    )
});

interface SpatialMapProps {
    timestamps: string[];
    defaultTimestamp?: string;
    startDate: string;
    endDate: string;
    onAreaSelect?: (areaName: string, kecamatan: string, kabupaten: string) => void;
    onPointSelect?: (lat: number, lon: number) => void;
    panelOpen?: boolean;
    accumulationMode?: AccumulationMode;
    onAccumulationModeChange?: (mode: AccumulationMode) => void;
    backendApi?: any;
    enableTopography?: boolean;
}

const MODE_LABELS: Record<AccumulationMode, string> = { "10min": "10 Menit", hourly: "Per Jam", daily: "Harian" };

export default function SpatialMap({ timestamps, defaultTimestamp, startDate, endDate, onAreaSelect, onPointSelect, panelOpen, accumulationMode = "10min", onAccumulationModeChange, backendApi = api, enableTopography = false }: SpatialMapProps) {
    const [selectedTs, setSelectedTs] = useState(defaultTimestamp || timestamps[timestamps.length - 1] || "");
    const [activeLayer, setActiveLayer] = useState("qpe");
    const [imageData, setImageData] = useState<SpatialData | null>(null);
    const [loading, setLoading] = useState(false);
    const [minimized, setMinimized] = useState(false);
    const [panelHeight, setPanelHeight] = useState(520);
    const [isResizing, setIsResizing] = useState(false);
    const panelRef = useRef<HTMLDivElement>(null);
    const abortRef = useRef<AbortController | null>(null);
    const panelHeightRef = useRef(520);
    const [geojson, setGeojson] = useState<any>(null);
    const [pickerMode, setPickerMode] = useState<PickerMode>(null);
    const [pickedPoint, setPickedPoint] = useState<{ lat: number; lon: number } | null>(null);
    const [selectedAreaName, setSelectedAreaName] = useState<string | null>(null);

    // Edit states
    const [isEditingPoint, setIsEditingPoint] = useState(false);
    const [isEditingArea, setIsEditingArea] = useState(false);
    const [editLat, setEditLat] = useState("");
    const [editLon, setEditLon] = useState("");
    const [editKab, setEditKab] = useState("");
    const [editKec, setEditKec] = useState("");
    const [isEditingDate, setIsEditingDate] = useState(false);
    const [isMobileSettingsOpen, setIsMobileSettingsOpen] = useState(false);
    const [legendMinimized, setLegendMinimized] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [boundaryWeight, setBoundaryWeight] = useState(0.8);
    // Compute effective (grouped) timestamps based on mode
    const effectiveTimestamps = useMemo(() => {
        if (accumulationMode === "10min") return timestamps;

        const seen = new Set<string>();
        const result: string[] = [];
        for (const ts of timestamps) {
            const d = new Date(ts);
            let key: string;
            if (accumulationMode === "hourly") {
                key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}-${d.getHours()}`;
            } else {
                // daily
                key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
            }
            if (!seen.has(key)) {
                seen.add(key);
                result.push(ts);
            }
        }
        return result;
    }, [timestamps, accumulationMode]);

    const tsIndex = effectiveTimestamps.indexOf(selectedTs);
    // If selectedTs is not in the effective list (e.g. after mode change), snap to nearest
    const effectiveTsIndex = tsIndex >= 0 ? tsIndex : (() => {
        const selTime = new Date(selectedTs).getTime();
        let best = 0;
        let bestDiff = Infinity;
        for (let i = 0; i < effectiveTimestamps.length; i++) {
            const diff = Math.abs(new Date(effectiveTimestamps[i]).getTime() - selTime);
            if (diff < bestDiff) { bestDiff = diff; best = i; }
        }
        return best;
    })();

    // Extract geo options
    const features = geojson?.features || [];
    const kabupatens = Array.from(new Set(features.map((f: any) => f.properties?.NAMA_KAB).filter(Boolean))).sort() as string[];
    const kecamatans = Array.from(new Set(features.filter((f: any) => f.properties?.NAMA_KAB === editKab).map((f: any) => f.properties?.NAMA_KEC).filter(Boolean))).sort() as string[];

    // Edit handlers
    const startEditPoint = () => {
        setIsEditingPoint(true);
        if (pickedPoint) {
            setEditLat(pickedPoint.lat.toFixed(4));
            setEditLon(pickedPoint.lon.toFixed(4));
        } else {
            setEditLat("-7.7316");
            setEditLon("110.3540");
        }
    };

    const saveEditPoint = () => {
        setIsEditingPoint(false);
        const lat = parseFloat(editLat);
        const lon = parseFloat(editLon);
        if (!isNaN(lat) && !isNaN(lon)) {
            setPickedPoint({ lat, lon });
            onPointSelect?.(lat, lon);
        }
    };

    const startEditArea = () => {
        setIsEditingArea(true);
        if (selectedAreaName) {
            const parts = selectedAreaName.split(", ");
            if (parts.length === 2) {
                setEditKec(parts[0]);
                setEditKab(parts[1]);
            }
        }
    };

    const saveEditArea = () => {
        setIsEditingArea(false);
        if (editKec && editKab) {
            const areaName = `${editKec}, ${editKab}`;
            setSelectedAreaName(areaName);
            onAreaSelect?.(areaName, editKec, editKab);
        }
    };

    const handleCustomDateSelect = (date: Date) => {
        const targetTime = date.getTime();
        if (isNaN(targetTime)) {
            setIsEditingDate(false);
            return;
        }

        let closestTs = timestamps[0];
        let minDiff = Infinity;

        for (const ts of timestamps) {
            const diff = Math.abs(new Date(ts).getTime() - targetTime);
            if (diff < minDiff) {
                minDiff = diff;
                closestTs = ts;
            }
        }

        if (closestTs) setSelectedTs(closestTs);
        setIsEditingDate(false);
    };

    // Auto-load spatial data
    const loadMap = useCallback(async (ts: string, layer: string, mode: AccumulationMode) => {
        if (!ts) return;
        if (abortRef.current) abortRef.current.abort();
        const controller = new AbortController();
        abortRef.current = controller;

        setLoading(true);
        try {
            const data = await backendApi.getSpatial(ts, layer, mode);
            if (!controller.signal.aborted) {
                setImageData(data);
            }
        } catch (e: any) {
            if (e?.name !== "AbortError") {
                console.error("Failed to load spatial data", e);
            }
        } finally {
            if (!controller.signal.aborted) {
                setLoading(false);
            }
        }
    }, []);

    useEffect(() => {
        if (selectedTs) loadMap(selectedTs, activeLayer, accumulationMode);
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    // Load GeoJSON boundaries
    useEffect(() => {
        fetch("/diy_boundaries.json")
            .then(r => r.json())
            .then(data => setGeojson(data))
            .catch(e => console.error("Failed to load boundaries", e));
    }, []);

    // Auto-render on change (debounced)
    useEffect(() => {
        const timer = setTimeout(() => {
            if (selectedTs) loadMap(selectedTs, activeLayer, accumulationMode);
        }, 300);
        return () => clearTimeout(timer);
    }, [selectedTs, activeLayer, accumulationMode, loadMap]);

    const handleSlider = (e: React.ChangeEvent<HTMLInputElement>) => {
        const idx = parseInt(e.target.value);
        if (effectiveTimestamps[idx]) setSelectedTs(effectiveTimestamps[idx]);
    };

    const stepTimestamp = (dir: -1 | 1) => {
        const curIdx = tsIndex >= 0 ? tsIndex : effectiveTsIndex;
        const newIdx = curIdx + dir;
        if (newIdx >= 0 && newIdx < effectiveTimestamps.length) setSelectedTs(effectiveTimestamps[newIdx]);
    };

    // Snap selectedTs when mode changes
    useEffect(() => {
        if (tsIndex < 0 && effectiveTimestamps.length > 0) {
            setSelectedTs(effectiveTimestamps[effectiveTsIndex]);
        }
    }, [accumulationMode]); // eslint-disable-line react-hooks/exhaustive-deps

    const formatTs = (ts: string) => {
        try {
            if (accumulationMode === "daily") {
                return new Date(ts).toLocaleString("id-ID", {
                    day: "2-digit", month: "short", year: "numeric",
                });
            }
            return new Date(ts).toLocaleString("id-ID", {
                day: "2-digit", month: "short", year: "numeric",
                hour: "2-digit", minute: "2-digit",
            });
        } catch { return ts; }
    };

    const formatShortTs = (ts: string) => {
        try {
            if (accumulationMode === "daily") {
                return new Date(ts).toLocaleString("id-ID", { day: "2-digit", month: "short" });
            }
            if (accumulationMode === "hourly") {
                return new Date(ts).toLocaleString("id-ID", { day: "2-digit", month: "short", hour: "2-digit" });
            }
            return new Date(ts).toLocaleString("id-ID", { hour: "2-digit", minute: "2-digit" });
        } catch { return ts; }
    };

    // Resize handler (mouse + touch)
    const handleResizeStart = (e: React.MouseEvent) => {
        e.preventDefault();
        setIsResizing(true);
        const startY = e.clientY;
        const startH = panelHeightRef.current;
        const onMouseMove = (ev: MouseEvent) => {
            const delta = startY - ev.clientY;
            const newH = Math.max(200, Math.min(800, startH + delta));
            panelHeightRef.current = newH;
            setPanelHeight(newH);
        };
        const onMouseUp = () => {
            setIsResizing(false);
            document.removeEventListener("mousemove", onMouseMove);
            document.removeEventListener("mouseup", onMouseUp);
        };
        document.addEventListener("mousemove", onMouseMove);
        document.addEventListener("mouseup", onMouseUp);
    };

    const handleTouchResizeStart = (e: React.TouchEvent) => {
        e.stopPropagation();
        setIsResizing(true);
        const startY = e.touches[0].clientY;
        const startH = panelHeightRef.current;
        const onTouchMove = (ev: TouchEvent) => {
            ev.preventDefault();
            ev.stopPropagation();
            const delta = startY - ev.touches[0].clientY;
            const newH = Math.max(200, Math.min(800, startH + delta));
            panelHeightRef.current = newH;
            setPanelHeight(newH);
        };
        const onTouchEnd = () => {
            setIsResizing(false);
            document.removeEventListener("touchmove", onTouchMove);
            document.removeEventListener("touchend", onTouchEnd);
        };
        document.addEventListener("touchmove", onTouchMove, { passive: false });
        document.addEventListener("touchend", onTouchEnd);
    };

    // True fullscreen using browser Fullscreen API
    const toggleFullscreen = async () => {
        if (!panelRef.current) return;
        try {
            if (!document.fullscreenElement) {
                await panelRef.current.requestFullscreen();
            } else {
                await document.exitFullscreen();
            }
        } catch (err) {
            // Fallback for browsers that don't support fullscreen
            if (!isFullscreen) {
                setPanelHeight(window.innerHeight);
            } else {
                setPanelHeight(520);
                panelHeightRef.current = 520;
            }
            setIsFullscreen(!isFullscreen);
        }
    };

    // Sync fullscreen state with browser events
    useEffect(() => {
        const handler = () => {
            const fs = !!document.fullscreenElement;
            setIsFullscreen(fs);
        };
        document.addEventListener("fullscreenchange", handler);
        return () => document.removeEventListener("fullscreenchange", handler);
    }, []);

    // Point picked handler
    const handlePointPick = (lat: number, lon: number) => {
        setPickedPoint({ lat, lon });
        onPointSelect?.(lat, lon);
    };

    // Area picked handler
    const handleAreaPick = (areaName: string, kec: string, kab: string) => {
        setSelectedAreaName(areaName);
        onAreaSelect?.(areaName, kec, kab);
    };

    // Toggle picker modes
    const cycleMode = (mode: PickerMode) => {
        if (pickerMode === mode) {
            setPickerMode(null);
        } else {
            setPickerMode(mode);
        }
    };

    const totalTicks = effectiveTimestamps.length;
    const maxVisibleTicks = 12;
    const tickStep = Math.max(1, Math.floor(totalTicks / maxVisibleTicks));

    const activeSliderIdx = tsIndex >= 0 ? tsIndex : effectiveTsIndex;

    if (minimized) {
        return (
            <div style={{
                position: "fixed", bottom: 16, right: 16, zIndex: 9999,
                background: "var(--card)", border: "1px solid var(--border)",
                borderRadius: "var(--radius)", boxShadow: "var(--shadow-lg)",
                padding: "0.5rem 1rem",
                display: "flex", alignItems: "center", gap: "0.75rem",
                cursor: "pointer",
            }}
                onClick={() => setMinimized(false)}
            >
                <Layers size={16} style={{ color: "var(--primary)" }} />
                <span style={{ fontSize: "0.8125rem", fontWeight: 600 }}>Peta Distribusi Spasial</span>
                <Maximize2 size={14} style={{ color: "var(--muted-foreground)" }} />
            </div>
        );
    }

    const pillStyle = (active: boolean, color: string) => ({
        padding: "0.25rem 0.625rem",
        borderRadius: "999px",
        border: `1px solid ${active ? color : "var(--border)"}`,
        background: active ? `${color}22` : "transparent",
        color: active ? color : "var(--muted-foreground)",
        fontSize: "0.6875rem",
        fontWeight: 600 as const,
        cursor: "pointer",
        transition: "all 0.2s",
        whiteSpace: "nowrap" as const,
        flexShrink: 0,
        display: "flex",
        alignItems: "center" as const,
        gap: "0.25rem",
    });

    return (
        <div
            ref={panelRef}
            className={`spatial-overlay${panelOpen ? " sidebar-panel-open" : ""}`}
            style={{
                height: isFullscreen ? "100vh" : panelHeight,
                transition: isResizing ? "none" : "height 0.2s ease",
                ...(isFullscreen ? { left: 0, top: 0, bottom: 0, right: 0, zIndex: 99999 } : {}),
            }}
        >
            {/* Resize Handle */}
            <div
                onMouseDown={handleResizeStart}
                onTouchStart={handleTouchResizeStart}
                style={{
                    height: 12, cursor: "ns-resize", background: "transparent",
                    display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                    touchAction: "none",
                }}
            >
                <div style={{ width: 40, height: 3, borderRadius: 2, background: "var(--border)" }} />
            </div>

            {/* Toolbar */}
            <div style={{
                display: "flex", alignItems: "center", gap: "0.5rem",
                padding: "0.375rem 1rem", borderBottom: "1px solid var(--border)",
                background: "var(--background-secondary)", flexShrink: 0,
            }}>
                <Layers size={14} style={{ color: "var(--primary)", flexShrink: 0 }} />
                <span style={{ fontSize: "0.8125rem", fontWeight: 700, whiteSpace: "nowrap" }}>Peta Spasial</span>

                {/* Layer Toggle */}
                <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
                    <select
                        value={activeLayer}
                        onChange={(e) => setActiveLayer(e.target.value)}
                        style={{
                            appearance: "none", WebkitAppearance: "none",
                            padding: "0.2rem 1.5rem 0.2rem 0.5rem", fontSize: "0.6875rem",
                            fontWeight: 600, border: "1px solid var(--border)",
                            borderRadius: "999px", background: "transparent",
                            color: "var(--primary)", cursor: "pointer", outline: "none",
                        }}
                    >
                        <option value="qpe">Curah Hujan (QPE)</option>
                        <option value="dbz" disabled={accumulationMode !== "10min"}>Reflektifitas (dBZ)</option>
                        {enableTopography && <option value="altitude">Ketinggian (DEM)</option>}
                        {enableTopography && <option value="slope">Kemiringan Lereng</option>}
                    </select>
                    <ChevronDown size={10} style={{ position: "absolute", right: 6, pointerEvents: "none", color: "var(--primary)" }} />
                </div>

                {/* Mode selector dropdown */}
                <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
                    <select
                        value={accumulationMode}
                        onChange={(e) => {
                            const m = e.target.value as AccumulationMode;
                            onAccumulationModeChange?.(m);
                            if (m !== "10min" && activeLayer === "dbz") setActiveLayer("qpe");
                        }}
                        style={{
                            appearance: "none",
                            WebkitAppearance: "none",
                            padding: "0.2rem 1.5rem 0.2rem 0.5rem",
                            fontSize: "0.6875rem",
                            fontWeight: 600,
                            border: "1px solid var(--border)",
                            borderRadius: "999px",
                            background: "transparent",
                            color: "var(--foreground)",
                            cursor: "pointer",
                            outline: "none",
                        }}
                    >
                        {(["10min", "hourly", "daily"] as AccumulationMode[]).map(m => (
                            <option key={m} value={m}>{MODE_LABELS[m]}</option>
                        ))}
                    </select>
                    <ChevronDown size={10} style={{ position: "absolute", right: 6, pointerEvents: "none", color: "var(--muted-foreground)" }} />
                </div>

                {/* Loading */}
                {loading && <div className="spinner" style={{ width: "0.875rem", height: "0.875rem", borderWidth: 2, flexShrink: 0 }} />}

                {/* Current timestamp (Desktop) */}
                <div className="desktop-only" style={{ position: "relative" }}>
                    <div
                        onClick={() => setIsEditingDate(true)}
                        style={{
                            fontSize: "0.75rem", fontWeight: 600, color: "var(--foreground)",
                            background: "var(--muted)", padding: "0.25rem 0.625rem",
                            borderRadius: "calc(var(--radius) - 4px)", whiteSpace: "nowrap", flexShrink: 0,
                            cursor: "pointer", border: "1px solid transparent", display: "flex", alignItems: "center", gap: 4
                        }}
                        title="Pilih Waktu (Klik untuk mengubah)"
                        onMouseOver={e => e.currentTarget.style.border = "1px solid var(--border)"}
                        onMouseOut={e => e.currentTarget.style.border = "1px solid transparent"}
                    >
                        <CalendarIcon size={12} style={{ color: "var(--muted-foreground)" }} />
                        {formatTs(selectedTs)}
                    </div>
                    {isEditingDate && (
                        <CustomDatePicker
                            initialDate={selectedTs ? new Date(selectedTs) : new Date()}
                            onSelect={handleCustomDateSelect}
                            onClose={() => setIsEditingDate(false)}
                        />
                    )}
                </div>

                <div className="desktop-only" style={{ flex: 1 }} />

                {/* Selection info badge (Desktop) */}
                {pickerMode === "titik" && (pickedPoint || isEditingPoint) && (
                    <div className="desktop-only" style={{
                        display: "flex", alignItems: "center", gap: "0.25rem",
                        fontSize: "0.6875rem", fontWeight: 600, color: "var(--foreground)",
                        background: "rgba(239,68,68,0.1)", padding: "0.125rem 0.25rem 0.125rem 0.5rem",
                        borderRadius: "calc(var(--radius) - 4px)", whiteSpace: "nowrap",
                        flexShrink: 0, border: "1px solid rgba(239,68,68,0.3)",
                    }}>
                        <MapPin size={10} style={{ color: "var(--destructive)" }} />
                        {isEditingPoint ? (
                            <>
                                <input type="number" step="0.001" value={editLat} onChange={e => setEditLat(e.target.value)} style={{ width: 60, padding: "0 2px", border: "1px solid var(--border)", borderRadius: 2, fontSize: "0.6875rem" }} placeholder="Lat" />
                                <input type="number" step="0.001" value={editLon} onChange={e => setEditLon(e.target.value)} style={{ width: 60, padding: "0 2px", border: "1px solid var(--border)", borderRadius: 2, fontSize: "0.6875rem" }} placeholder="Lon" />
                                <button onClick={saveEditPoint} style={{ background: "var(--destructive)", border: "none", color: "white", borderRadius: 2, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", width: 14, height: 14 }}><Check size={10} /></button>
                                <button onClick={() => setIsEditingPoint(false)} style={{ background: "transparent", border: "none", color: "var(--muted-foreground)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", width: 14, height: 14 }}><X size={10} /></button>
                            </>
                        ) : (
                            <>
                                <span>{pickedPoint?.lat.toFixed(4)}, {pickedPoint?.lon.toFixed(4)}</span>
                                <button onClick={startEditPoint} style={{ background: "transparent", border: "none", color: "var(--muted-foreground)", cursor: "pointer", marginLeft: 4, display: "flex", alignItems: "center", justifyContent: "center" }}><Edit3 size={10} /></button>
                            </>
                        )}
                    </div>
                )}

                {pickerMode === "wilayah" && (selectedAreaName || isEditingArea) && (
                    <div className="desktop-only" style={{
                        display: "flex", alignItems: "center", gap: "0.25rem",
                        fontSize: "0.6875rem", fontWeight: 600, color: "var(--foreground)",
                        background: "rgba(34,211,238,0.1)", padding: "0.125rem 0.25rem 0.125rem 0.5rem",
                        borderRadius: "calc(var(--radius) - 4px)", whiteSpace: "nowrap",
                        flexShrink: 0, border: "1px solid rgba(34,211,238,0.3)",
                    }}>
                        <Map size={10} style={{ color: "#0891b2" }} />
                        {isEditingArea ? (
                            <>
                                <select value={editKab} onChange={e => { setEditKab(e.target.value); setEditKec(""); }} style={{ maxWidth: 100, padding: "0 2px", border: "1px solid var(--border)", borderRadius: 2, fontSize: "0.6875rem", background: "var(--background)" }}>
                                    <option value="">Pilih Kab</option>
                                    {kabupatens.map(k => <option key={k} value={k}>{k}</option>)}
                                </select>
                                <select value={editKec} onChange={e => setEditKec(e.target.value)} style={{ maxWidth: 100, padding: "0 2px", border: "1px solid var(--border)", borderRadius: 2, fontSize: "0.6875rem", background: "var(--background)" }}>
                                    <option value="">Pilih Kec</option>
                                    {kecamatans.map(k => <option key={k} value={k}>{k}</option>)}
                                </select>
                                <button onClick={saveEditArea} disabled={!editKab || !editKec} style={{ background: (!editKab || !editKec) ? "var(--muted)" : "#0ea5e9", border: "none", color: "white", borderRadius: 2, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", width: 14, height: 14 }}><Check size={10} /></button>
                                <button onClick={() => setIsEditingArea(false)} style={{ background: "transparent", border: "none", color: "var(--muted-foreground)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", width: 14, height: 14 }}><X size={10} /></button>
                            </>
                        ) : (
                            <>
                                <span style={{ maxWidth: 150, overflow: "hidden", textOverflow: "ellipsis" }}>{selectedAreaName}</span>
                                <button onClick={startEditArea} style={{ background: "transparent", border: "none", color: "var(--muted-foreground)", cursor: "pointer", marginLeft: 4, display: "flex", alignItems: "center", justifyContent: "center" }}><Edit3 size={10} /></button>
                            </>
                        )}
                    </div>
                )}

                {/* Mode toggles (Desktop) */}
                <button className="desktop-only" onClick={() => cycleMode("wilayah")} title="Pilih wilayah di peta" style={pillStyle(pickerMode === "wilayah", "#22d3ee")}>
                    <Map size={12} />
                    Wilayah
                </button>
                <button className="desktop-only" onClick={() => cycleMode("titik")} title="Pilih titik koordinat" style={pillStyle(pickerMode === "titik", "#ef4444")}>
                    <MapPin size={12} />
                    Titik
                </button>

                <div className="mobile-only" style={{ flex: 1 }} />

                {/* Mobile Settings Toggle */}
                <button className="mobile-only" onClick={() => setIsMobileSettingsOpen(!isMobileSettingsOpen)} style={{ background: isMobileSettingsOpen ? "var(--muted)" : "transparent", border: "none", cursor: "pointer", color: "var(--foreground)", display: "flex", padding: 6, borderRadius: 6 }}>
                    <SlidersHorizontal size={14} />
                </button>

                {/* Boundary Weight Toggle */}
                <div className="desktop-only" style={{ display: "flex", alignItems: "center", gap: "0.25rem", borderLeft: "1px solid var(--border)", paddingLeft: "0.5rem", marginLeft: "0.25rem" }}>
                    <Map size={14} style={{ color: "var(--muted-foreground)" }} />
                    <input type="range" min="0.1" max="4" step="0.1" value={boundaryWeight} onChange={e => setBoundaryWeight(parseFloat(e.target.value))} style={{ width: 60, accentColor: "var(--primary)", cursor: "pointer" }} title="Atur Tebal Garis Batas" />
                </div>

                {/* Legend Toggle */}
                <button onClick={() => setLegendMinimized(!legendMinimized)} title={legendMinimized ? "Tampilkan Legenda" : "Sembunyikan Legenda"} style={{ background: legendMinimized ? "var(--muted)" : "none", border: "none", cursor: "pointer", color: "var(--muted-foreground)", display: "flex", padding: 6, borderRadius: 6 }}>
                    <Layers size={14} />
                </button>

                {/* Fullscreen Toggle */}
                <button onClick={toggleFullscreen} title={isFullscreen ? "Keluar Fullscreen" : "Perluas Layar Penuh"} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted-foreground)", display: "flex", padding: 6, borderRadius: 6 }}>
                    {isFullscreen ? <Shrink size={14} /> : <Fullscreen size={14} />}
                </button>

                {/* Minimize */}
                {!isFullscreen && (
                    <button onClick={() => setMinimized(true)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted-foreground)", display: "flex", padding: 6, borderRadius: 6 }}>
                        <Minus size={14} />
                    </button>
                )}
            </div>

            {/* Mobile Settings Overlay */}
            {isMobileSettingsOpen && (
                <div className="mobile-only" style={{
                    position: "absolute", top: 48, left: 0, right: 0, zIndex: 9999, background: "var(--card)", borderBottom: "1px solid var(--border)", boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                    display: "flex", flexDirection: "column", padding: "1rem", gap: "1rem"
                }}>
                    {/* Waktu Section */}
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                        <span style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--muted-foreground)", textTransform: "uppercase" }}>Waktu Data</span>
                        <div style={{ position: "relative" }}>
                            <div
                                onClick={() => setIsEditingDate(true)}
                                style={{
                                    fontSize: "0.875rem", fontWeight: 600, color: "var(--foreground)",
                                    background: "var(--muted)", padding: "0.5rem 0.75rem",
                                    borderRadius: "var(--radius)", display: "flex", alignItems: "center", gap: 8,
                                    cursor: "pointer", border: "1px solid transparent"
                                }}
                            >
                                <CalendarIcon size={14} style={{ color: "var(--primary)" }} />
                                {formatTs(selectedTs)}
                            </div>
                            {isEditingDate && (
                                <CustomDatePicker
                                    initialDate={selectedTs ? new Date(selectedTs) : new Date()}
                                    onSelect={handleCustomDateSelect}
                                    onClose={() => setIsEditingDate(false)}
                                />
                            )}
                        </div>
                    </div>

                    {/* Mode Analisis Section */}
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                        <span style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--muted-foreground)", textTransform: "uppercase" }}>Pilih Mode Inspeksi</span>
                        <div style={{ display: "flex", gap: "0.5rem" }}>
                            <button onClick={() => cycleMode("wilayah")} style={{ ...pillStyle(pickerMode === "wilayah", "#22d3ee"), flex: 1, padding: "0.5rem" }}>
                                <Map size={14} />
                                Zonal Wilayah
                            </button>
                            <button onClick={() => cycleMode("titik")} style={{ ...pillStyle(pickerMode === "titik", "#ef4444"), flex: 1, padding: "0.5rem" }}>
                                <MapPin size={14} />
                                Titik Koordinat
                            </button>
                        </div>
                    </div>

                    {/* Visuals Section */}
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                        <span style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--muted-foreground)", textTransform: "uppercase" }}>Visualisasi</span>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                            <Map size={14} style={{ color: "var(--muted-foreground)" }} />
                            <span style={{ fontSize: "0.75rem", color: "var(--foreground)" }}>Tebal Garis:</span>
                            <input type="range" min="0.1" max="4" step="0.1" value={boundaryWeight} onChange={e => setBoundaryWeight(parseFloat(e.target.value))} style={{ flex: 1, accentColor: "var(--primary)" }} />
                        </div>
                    </div>

                    {/* Editor Section */}
                    {(pickerMode === "titik" || pickerMode === "wilayah") && (
                        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                            <span style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--muted-foreground)", textTransform: "uppercase" }}>Detail {pickerMode === "titik" ? "Koordinat" : "Wilayah"}</span>

                            {pickerMode === "titik" && (
                                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                                    <input type="number" step="0.001" value={editLat} onChange={e => setEditLat(e.target.value)} style={{ flex: 1, padding: "0.5rem", border: "1px solid var(--border)", borderRadius: "var(--radius)", fontSize: "0.875rem", background: "var(--background)" }} placeholder="Latitude" />
                                    <input type="number" step="0.001" value={editLon} onChange={e => setEditLon(e.target.value)} style={{ flex: 1, padding: "0.5rem", border: "1px solid var(--border)", borderRadius: "var(--radius)", fontSize: "0.875rem", background: "var(--background)" }} placeholder="Longitude" />
                                    <button onClick={saveEditPoint} style={{ background: "var(--destructive)", border: "none", color: "white", borderRadius: "var(--radius)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", width: 36, height: 36, flexShrink: 0 }}><Check size={16} /></button>
                                </div>
                            )}

                            {pickerMode === "wilayah" && (
                                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                                    <select value={editKab} onChange={e => { setEditKab(e.target.value); setEditKec(""); }} style={{ flex: 1, padding: "0.5rem", border: "1px solid var(--border)", borderRadius: "var(--radius)", fontSize: "0.875rem", background: "var(--background)" }}>
                                        <option value="">Pilih Kab</option>
                                        {kabupatens.map(k => <option key={k} value={k}>{k}</option>)}
                                    </select>
                                    <select value={editKec} onChange={e => setEditKec(e.target.value)} style={{ flex: 1, padding: "0.5rem", border: "1px solid var(--border)", borderRadius: "var(--radius)", fontSize: "0.875rem", background: "var(--background)" }}>
                                        <option value="">Pilih Kec</option>
                                        {kecamatans.map(k => <option key={k} value={k}>{k}</option>)}
                                    </select>
                                    <button onClick={saveEditArea} disabled={!editKab || !editKec} style={{ background: (!editKab || !editKec) ? "var(--muted)" : "#0ea5e9", border: "none", color: "white", borderRadius: "var(--radius)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", width: 36, height: 36, flexShrink: 0 }}><Check size={16} /></button>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}


            {/* Map Area */}
            <div style={{ flex: 1, position: "relative", overflow: "hidden" }}>
                <MapViewer
                    imageData={imageData}
                    geojson={geojson}
                    pickerMode={pickerMode}
                    pickedPoint={pickedPoint}
                    selectedAreaName={selectedAreaName}
                    onPointPick={handlePointPick}
                    onAreaPick={handleAreaPick}
                    legendMinimized={legendMinimized}
                    boundaryWeight={boundaryWeight}
                />
            </div>

            {/* Timeline Bar */}
            <div style={{
                display: "flex", alignItems: "center", gap: "0.5rem",
                padding: "0.375rem 1rem", background: "var(--background-secondary)",
                borderTop: "1px solid var(--border)", flexShrink: 0,
            }}>
                <button
                    onClick={() => stepTimestamp(-1)}
                    disabled={activeSliderIdx <= 0}
                    style={{
                        background: "none", border: "none",
                        cursor: activeSliderIdx <= 0 ? "default" : "pointer",
                        color: activeSliderIdx <= 0 ? "var(--border)" : "var(--muted-foreground)",
                        display: "flex", padding: 2, flexShrink: 0,
                    }}
                >
                    <ChevronLeft size={16} />
                </button>

                <div style={{ flex: 1, position: "relative", height: 36 }}>
                    {/* Tick marks */}
                    <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 14, display: "flex", alignItems: "flex-end", pointerEvents: "none" }}>
                        {effectiveTimestamps.map((ts, i) => {
                            if (i % tickStep !== 0 && i !== effectiveTimestamps.length - 1) return null;
                            const pct = effectiveTimestamps.length > 1 ? (i / (effectiveTimestamps.length - 1)) * 100 : 0;
                            return (
                                <div key={i} style={{
                                    position: "absolute", left: `${pct}%`, transform: "translateX(-50%)",
                                    display: "flex", flexDirection: "column", alignItems: "center",
                                }}>
                                    <div style={{
                                        width: 1, height: i === activeSliderIdx ? 10 : 6,
                                        background: i === activeSliderIdx ? "var(--primary)" : "var(--muted-foreground)",
                                        opacity: i === activeSliderIdx ? 1 : 0.4,
                                    }} />
                                </div>
                            );
                        })}
                    </div>

                    <input
                        type="range" min={0} max={effectiveTimestamps.length - 1}
                        value={activeSliderIdx}
                        onChange={handleSlider}
                        style={{ position: "absolute", top: 10, left: 0, width: "100%", accentColor: "var(--primary)", cursor: "pointer", margin: 0 }}
                    />

                    {/* Tick labels */}
                    <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 12, pointerEvents: "none" }}>
                        {effectiveTimestamps.map((ts, i) => {
                            if (i % (tickStep * 2) !== 0 && i !== effectiveTimestamps.length - 1) return null;
                            const pct = effectiveTimestamps.length > 1 ? (i / (effectiveTimestamps.length - 1)) * 100 : 0;
                            return (
                                <span key={i} style={{
                                    position: "absolute", left: `${pct}%`, transform: "translateX(-50%)",
                                    fontSize: "0.5625rem", color: "var(--muted-foreground)", whiteSpace: "nowrap", opacity: 0.7,
                                }}>
                                    {formatShortTs(ts)}
                                </span>
                            );
                        })}
                    </div>
                </div>

                <button
                    onClick={() => stepTimestamp(1)}
                    disabled={activeSliderIdx >= effectiveTimestamps.length - 1}
                    style={{
                        background: "none", border: "none",
                        cursor: activeSliderIdx >= effectiveTimestamps.length - 1 ? "default" : "pointer",
                        color: activeSliderIdx >= effectiveTimestamps.length - 1 ? "var(--border)" : "var(--muted-foreground)",
                        display: "flex", padding: 2, flexShrink: 0,
                    }}
                >
                    <ChevronRight size={16} />
                </button>
            </div>
        </div>
    );
}
