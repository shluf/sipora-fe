"use client";

import type { ValidationStation, StationStat } from "@/lib/api";

interface Props {
    stations: ValidationStation[];
    stationStats?: StationStat[];
    showOutliersOnly?: boolean;
}

export default function StationTable({ stations, stationStats, showOutliersOnly = false }: Props) {
    // Station details table
    const filtered = showOutliersOnly ? stations.filter((s) => s.is_outlier) : stations;

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
            {/* Station stats summary */}
            {stationStats && stationStats.length > 0 && (
                <div>
                    <h4 style={{ fontSize: "0.875rem", fontWeight: 700, marginBottom: "0.75rem" }}>📋 Statistik per Stasiun</h4>
                    <div className="data-table-wrapper" style={{ maxHeight: "300px", overflowY: "auto" }}>
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Stasiun</th>
                                    <th>AWS Mean (mm)</th>
                                    <th>AWS Std</th>
                                    <th>QPE Mean (mm)</th>
                                    <th>QPE Std</th>
                                    <th>Jarak (km)</th>
                                    <th>Outlier</th>
                                </tr>
                            </thead>
                            <tbody>
                                {stationStats.map((s) => (
                                    <tr key={s.station_name}>
                                        <td style={{ fontWeight: 600 }}>{s.station_name}</td>
                                        <td>{s.aws_rainfall_mm_mean?.toFixed(1)}</td>
                                        <td>{s.aws_rainfall_mm_std?.toFixed(1)}</td>
                                        <td>{s.qpe_accumulation_mm_mean?.toFixed(1)}</td>
                                        <td>{s.qpe_accumulation_mm_std?.toFixed(1)}</td>
                                        <td>
                                            <span style={{
                                                color: s.distance_km_mean > 100 ? "#ef4444" : s.distance_km_mean > 60 ? "#f59e0b" : "#10b981",
                                            }}>
                                                {s.distance_km_mean?.toFixed(1)}
                                            </span>
                                        </td>
                                        <td>{s.is_outlier_sum > 0 ? `⚠️ ${s.is_outlier_sum}` : "✅"}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Detailed station data */}
            <div>
                <h4 style={{ fontSize: "0.875rem", fontWeight: 700, marginBottom: "0.75rem" }}>
                    📊 Data Validasi Detail {showOutliersOnly ? "(Outlier Only)" : ""} — {filtered.length} stasiun
                </h4>
                <div className="data-table-wrapper" style={{ maxHeight: "400px", overflowY: "auto" }}>
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Stasiun</th>
                                <th>Lat</th>
                                <th>Lon</th>
                                <th>AWS (mm)</th>
                                <th>QPE (mm)</th>
                                <th>Error (mm)</th>
                                <th>Rel. Error (%)</th>
                                <th>Jarak (km)</th>
                                <th>Coverage (%)</th>
                                <th>Outlier</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.map((s, i) => (
                                <tr key={i} style={{ background: s.is_outlier ? "rgba(239, 68, 68, 0.08)" : undefined }}>
                                    <td style={{ fontWeight: 600 }}>{s.station_name}</td>
                                    <td>{s.latitude?.toFixed(4)}</td>
                                    <td>{s.longitude?.toFixed(4)}</td>
                                    <td>{s.aws_rainfall_mm?.toFixed(1)}</td>
                                    <td>{s.qpe_accumulation_mm?.toFixed(1)}</td>
                                    <td style={{ color: s.error > 0 ? "#ef4444" : "#3b82f6", fontWeight: 600 }}>
                                        {s.error >= 0 ? "+" : ""}{s.error?.toFixed(2)}
                                    </td>
                                    <td>{isFinite(s.relative_error) ? s.relative_error?.toFixed(1) : "—"}</td>
                                    <td>{s.distance_km?.toFixed(1)}</td>
                                    <td>{s.coverage_pct?.toFixed(0)}</td>
                                    <td>{s.is_outlier ? "⚠️" : "✅"}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
