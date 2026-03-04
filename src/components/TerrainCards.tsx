"use client";

import { Mountain, Layers3 } from "lucide-react";

export interface TerrainInfo {
    // Point mode
    altitude_m?: number | null;
    slope_deg?: number | null;
    actual_lat?: number;
    actual_lon?: number;
    // Area mode
    altitude_mean_m?: number;
    altitude_min_m?: number;
    altitude_max_m?: number;
    slope_mean_deg?: number;
    slope_min_deg?: number;
    slope_max_deg?: number;
}

function classifySlope(deg: number): { label: string; color: string } {
    if (deg < 2) return { label: "Datar", color: "#10b981" };
    if (deg < 5) return { label: "Landai", color: "#84cc16" };
    if (deg < 8) return { label: "Agak Curam", color: "#eab308" };
    if (deg < 15) return { label: "Curam", color: "#f97316" };
    if (deg < 25) return { label: "Sangat Curam", color: "#ef4444" };
    return { label: "Terjal", color: "#7c3aed" };
}

function classifyAltitude(m: number): { label: string; color: string } {
    if (m < 100) return { label: "Dataran Rendah", color: "#10b981" };
    if (m < 500) return { label: "Perbukitan Rendah", color: "#84cc16" };
    if (m < 1000) return { label: "Perbukitan", color: "#eab308" };
    if (m < 2000) return { label: "Dataran Tinggi", color: "#f97316" };
    return { label: "Pegunungan", color: "#ef4444" };
}

interface TerrainCardsProps {
    terrain: TerrainInfo;
    isPointMode: boolean;
}

export default function TerrainCards({ terrain, isPointMode }: TerrainCardsProps) {
    const altVal = isPointMode ? terrain.altitude_m : terrain.altitude_mean_m;
    const slopeVal = isPointMode ? terrain.slope_deg : terrain.slope_mean_deg;

    const altClass = (altVal != null && altVal > 0) ? classifyAltitude(altVal) : null;
    const slopeClass = (slopeVal != null && slopeVal > 0) ? classifySlope(slopeVal) : null;

    return (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "1rem" }}>
            {/* Altitude Card */}
            <div className="card metric-card" style={{ borderLeft: `3px solid ${altClass?.color || "var(--border)"}` }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div style={{ flex: 1 }}>
                        <div className="metric-label">Ketinggian (DEM)</div>
                        {(altVal != null && altVal > 0) ? (
                            <>
                                <div className="metric-value">
                                    {isPointMode
                                        ? `${altVal.toFixed(0)} m dpl`
                                        : `${altVal.toFixed(0)} m rata-rata`}
                                </div>
                                {!isPointMode && terrain.altitude_min_m != null && terrain.altitude_max_m != null && (
                                    <div className="metric-delta">
                                        {terrain.altitude_min_m.toFixed(0)} – {terrain.altitude_max_m.toFixed(0)} m
                                    </div>
                                )}
                                {altClass && (
                                    <div style={{
                                        display: "inline-block", marginTop: "0.25rem",
                                        padding: "0.125rem 0.5rem", borderRadius: "999px",
                                        background: `${altClass.color}20`, color: altClass.color,
                                        fontSize: "0.6875rem", fontWeight: 700,
                                    }}>
                                        {altClass.label}
                                    </div>
                                )}
                            </>
                        ) : (
                            <div className="metric-value" style={{ color: "var(--muted-foreground)" }}>Tidak tersedia</div>
                        )}
                    </div>
                    <div style={{
                        color: altClass?.color || "var(--muted-foreground)",
                        background: `${altClass?.color || "#888"}15`,
                        padding: "0.5rem", borderRadius: "0.5rem", flexShrink: 0,
                    }}>
                        <Mountain size={20} />
                    </div>
                </div>
            </div>

            {/* Slope Card */}
            <div className="card metric-card" style={{ borderLeft: `3px solid ${slopeClass?.color || "var(--border)"}` }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div style={{ flex: 1 }}>
                        <div className="metric-label">Kemiringan Lereng</div>
                        {(slopeVal != null && slopeVal > 0) ? (
                            <>
                                <div className="metric-value">
                                    {isPointMode
                                        ? `${slopeVal.toFixed(1)}°`
                                        : `${slopeVal.toFixed(1)}° rata-rata`}
                                </div>
                                {!isPointMode && terrain.slope_min_deg != null && terrain.slope_max_deg != null && (
                                    <div className="metric-delta">
                                        {terrain.slope_min_deg.toFixed(1)}° – {terrain.slope_max_deg.toFixed(1)}°
                                    </div>
                                )}
                                {slopeClass && (
                                    <div style={{
                                        display: "inline-block", marginTop: "0.25rem",
                                        padding: "0.125rem 0.5rem", borderRadius: "999px",
                                        background: `${slopeClass.color}20`, color: slopeClass.color,
                                        fontSize: "0.6875rem", fontWeight: 700,
                                    }}>
                                        {slopeClass.label}
                                    </div>
                                )}
                            </>
                        ) : (
                            <div className="metric-value" style={{ color: "var(--muted-foreground)" }}>Tidak tersedia</div>
                        )}
                    </div>
                    <div style={{
                        color: slopeClass?.color || "var(--muted-foreground)",
                        background: `${slopeClass?.color || "#888"}15`,
                        padding: "0.5rem", borderRadius: "0.5rem", flexShrink: 0,
                    }}>
                        <Layers3 size={20} />
                    </div>
                </div>
            </div>
        </div>
    );
}
