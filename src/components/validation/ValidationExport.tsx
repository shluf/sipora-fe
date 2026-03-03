"use client";

import { Download, FileJson, FileText } from "lucide-react";
import type { ValidationResult } from "@/lib/api";

interface Props {
    result: ValidationResult;
}

export default function ValidationExport({ result }: Props) {
    const { metrics, radar, n_stations, parameters } = result;

    const downloadCSV = () => {
        const stations = result.stations;
        if (!stations || stations.length === 0) return;

        const headers = [
            "station_name", "latitude", "longitude", "aws_rainfall_mm",
            "qpe_accumulation_mm", "error", "relative_error", "distance_km",
            "azimuth_deg", "coverage_pct", "is_outlier",
        ];
        const rows = stations.map((s) =>
            headers.map((h) => {
                const val = s[h as keyof typeof s];
                return typeof val === "boolean" ? (val ? "TRUE" : "FALSE") : String(val ?? "");
            }).join(",")
        );
        const csv = [headers.join(","), ...rows].join("\n");

        const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `qpe_validation_${new Date().toISOString().replace(/[:.]/g, "").slice(0, 15)}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const downloadJSON = () => {
        const exportData = {
            timestamp: new Date().toISOString(),
            radar,
            n_stations,
            metrics,
            parameters,
            recommendations: result.recommendations,
        };

        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `validation_metrics_${new Date().toISOString().replace(/[:.]/g, "").slice(0, 15)}.json`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const reportText = `QPE VALIDATION REPORT
=====================
Timestamp: ${new Date().toISOString()}
Radar: ${radar.name}
Stasiun Valid: ${n_stations}

METRIK VALIDASI:
- Bias     : ${metrics.bias != null ? (metrics.bias >= 0 ? "+" : "") + metrics.bias.toFixed(2) : "N/A"} mm
- RMSE     : ${metrics.rmse?.toFixed(2) ?? "N/A"} mm
- MAE      : ${metrics.mae?.toFixed(2) ?? "N/A"} mm
- Korelasi : ${metrics.correlation?.toFixed(3) ?? "N/A"}
- R²       : ${metrics.r2?.toFixed(3) ?? "N/A"}

PARAMETER:
- Min Coverage: ${parameters?.coverage_threshold ?? "N/A"}%
- Max Distance: ${parameters?.max_distance ?? "N/A"} km
- Outlier Method: ${parameters?.outlier_method ?? "N/A"} (threshold=${parameters?.outlier_threshold ?? "N/A"})`;

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
            {/* Download buttons */}
            <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
                <button className="btn btn-primary" onClick={downloadCSV} style={{ gap: "0.5rem" }}>
                    <FileText size={16} />
                    Download Hasil (CSV)
                </button>
                <button className="btn btn-secondary" onClick={downloadJSON} style={{ gap: "0.5rem" }}>
                    <FileJson size={16} />
                    Download Metrik (JSON)
                </button>
            </div>

            {/* Summary report */}
            <div>
                <h4 style={{ fontSize: "0.875rem", fontWeight: 700, marginBottom: "0.75rem" }}>📝 Ringkasan Laporan</h4>
                <pre style={{
                    background: "var(--muted)",
                    padding: "1.25rem",
                    borderRadius: "var(--radius)",
                    fontSize: "0.8125rem",
                    lineHeight: 1.6,
                    color: "var(--foreground)",
                    overflow: "auto",
                    whiteSpace: "pre-wrap",
                    border: "1px solid var(--border)",
                }}>
                    {reportText}
                </pre>
            </div>

            {/* Recommendations */}
            {result.recommendations && result.recommendations.length > 0 && (
                <div>
                    <h4 style={{ fontSize: "0.875rem", fontWeight: 700, marginBottom: "0.75rem" }}>💡 Rekomendasi</h4>
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                        {result.recommendations.map((rec, i) => (
                            <div key={i} style={{
                                background: "#fff3cd",
                                borderLeft: "4px solid #ffc107",
                                padding: "0.75rem 1rem",
                                borderRadius: "0.25rem",
                                fontSize: "0.8125rem",
                                color: "#856404",
                            }}>
                                ⚠️ {rec}
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
