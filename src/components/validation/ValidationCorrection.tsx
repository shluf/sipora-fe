"use client";

import { useMemo } from "react";
import { useValidationContext } from "@/contexts/ValidationContext";
import type { CorrectionMethod } from "@/lib/api";
import { Play, Download, AlertCircle, CheckCircle, TrendingDown, TrendingUp, Minus } from "lucide-react";
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine,
} from "recharts";

const METHODS: { value: CorrectionMethod; label: string; desc: string }[] = [
    {
        value: "mean_field",
        label: "Mean Field Bias",
        desc: "Koreksi multiplikatif: QPE_corr = QPE / (mean_QPE / mean_AWS). Cocok untuk bias sistematis proporsional.",
    },
    {
        value: "regression",
        label: "Regresi Linear",
        desc: "Koreksi berbasis regresi: QPE_corr = (QPE − intercept) / slope. Memperbaiki skala dari hubungan linier QPE↔AWS.",
    },
    {
        value: "additive",
        label: "Additif (Geser Bias)",
        desc: "Mengurangi bias tetap: QPE_corr = QPE − bias. Cocok untuk over/underestimation konstan.",
    },
];

function MetricDelta({
    label,
    before,
    after,
    unit = "",
    lowerIsBetter = true,
}: {
    label: string;
    before?: number | null;
    after?: number | null;
    unit?: string;
    lowerIsBetter?: boolean;
}) {
    if (before == null || after == null || isNaN(before) || isNaN(after)) return null;
    const diff = after - before;
    const improved = lowerIsBetter ? diff < 0 : diff > 0;
    const Icon = Math.abs(diff) < 0.001 ? Minus : improved ? TrendingDown : TrendingUp;
    const color = Math.abs(diff) < 0.001 ? "var(--muted-foreground)" : improved ? "var(--success, #22c55e)" : "#ef4444";

    return (
        <div style={{
            background: "var(--card)", border: "1px solid var(--border)",
            borderRadius: "var(--radius)", padding: "0.75rem 1rem",
            display: "flex", flexDirection: "column", gap: "0.25rem",
        }}>
            <span style={{ fontSize: "0.75rem", color: "var(--muted-foreground)", fontWeight: 500 }}>{label}</span>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <span style={{ fontSize: "1rem", fontWeight: 700 }}>
                    {after.toFixed(3)}{unit}
                </span>
                <div style={{ display: "flex", alignItems: "center", gap: "0.2rem", color, fontSize: "0.75rem", fontWeight: 600 }}>
                    <Icon size={12} />
                    {Math.abs(diff).toFixed(3)}
                </div>
            </div>
            <span style={{ fontSize: "0.7rem", color: "var(--muted-foreground)" }}>
                sebelum: {before.toFixed(3)}{unit}
            </span>
        </div>
    );
}

export default function ValidationCorrection() {
    const {
        validationResult,
        validationFile,
        correctionMethod,
        setCorrectionMethod,
        correctionLoading,
        correctionError,
        correctionResult,
        setCorrectionResult,
        handleBiasCorrection,
    } = useValidationContext();

    const hasValidation = validationResult?.ok && (validationResult.stations?.length ?? 0) > 0;
    const hasResult = correctionResult?.ok;

    const tableRows = useMemo(() => {
        if (!hasResult) return [];
        return correctionResult!.stations.map((s) => ({
            name: s.station_name,
            aws: s.aws_rainfall_mm,
            qpe_before: s.qpe_accumulation_mm,
            qpe_after: s.qpe_corrected_mm,
            error_before: s.error,
            error_after: s.error_corrected,
            is_outlier: s.is_outlier,
        }));
    }, [correctionResult, hasResult]);

    const downloadCSV = () => {
        if (!hasResult) return;
        const headers = ["station_name", "aws_rainfall_mm", "qpe_before_mm", "qpe_corrected_mm", "error_before", "error_corrected", "distance_km", "latitude", "longitude"];
        const rows = correctionResult!.stations.map(s =>
            [s.station_name, s.aws_rainfall_mm, s.qpe_accumulation_mm, s.qpe_corrected_mm, s.error, s.error_corrected, s.distance_km, s.latitude, s.longitude].join(",")
        );
        const csv = [headers.join(","), ...rows].join("\n");
        const blob = new Blob([csv], { type: "text/csv" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `qpe_bias_corrected_${correctionMethod}_${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    if (!hasValidation) {
        return (
            <div style={{ textAlign: "center", padding: "3rem 1rem", color: "var(--muted-foreground)" }}>
                <AlertCircle size={32} style={{ margin: "0 auto 1rem", opacity: 0.5 }} />
                <p style={{ fontSize: "0.875rem" }}>Jalankan validasi terlebih dahulu sebelum menerapkan koreksi bias.</p>
            </div>
        );
    }

    const origMetrics = validationResult!.metrics;
    const corrMetrics = correctionResult?.corrected_metrics;

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>

            {/* ── Method Selector ── */}
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                <h4 style={{ fontWeight: 600, fontSize: "0.875rem", margin: 0 }}>Pilih Metode Koreksi</h4>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                    {METHODS.map((m) => (
                        <label key={m.value} style={{
                            display: "flex", alignItems: "flex-start", gap: "0.75rem",
                            padding: "0.75rem 1rem", borderRadius: "var(--radius)",
                            border: `1px solid ${correctionMethod === m.value ? "var(--primary)" : "var(--border)"}`,
                            background: correctionMethod === m.value ? "rgba(14,165,233,0.06)" : "var(--card)",
                            cursor: "pointer", transition: "all 0.15s ease",
                        }}>
                            <input
                                type="radio"
                                name="correctionMethod"
                                value={m.value}
                                checked={correctionMethod === m.value}
                                onChange={() => { setCorrectionMethod(m.value); setCorrectionResult(null); }}
                                style={{ marginTop: 3 }}
                            />
                            <div>
                                <div style={{ fontWeight: 600, fontSize: "0.8125rem" }}>{m.label}</div>
                                <div style={{ fontSize: "0.75rem", color: "var(--muted-foreground)", marginTop: "0.2rem", lineHeight: 1.4 }}>{m.desc}</div>
                            </div>
                        </label>
                    ))}
                </div>
            </div>

            {/* ── Validation data summary ── */}
            {origMetrics.valid && (
                <div style={{
                    fontSize: "0.8rem", color: "var(--muted-foreground)", padding: "0.5rem 0.75rem",
                    background: "var(--muted)", borderRadius: "var(--radius)",
                    display: "flex", gap: "1.5rem", flexWrap: "wrap",
                }}>
                    <span>Bias saat ini: <strong style={{ color: "var(--foreground)" }}>{(origMetrics.bias ?? 0).toFixed(2)} mm</strong></span>
                    <span>RMSE: <strong style={{ color: "var(--foreground)" }}>{(origMetrics.rmse ?? 0).toFixed(2)} mm</strong></span>
                    <span>Korelasi: <strong style={{ color: "var(--foreground)" }}>{(origMetrics.correlation ?? 0).toFixed(3)}</strong></span>
                    <span>n stasiun: <strong style={{ color: "var(--foreground)" }}>{origMetrics.n}</strong></span>
                </div>
            )}

            {/* ── Action button ── */}
            <button
                onClick={handleBiasCorrection}
                disabled={correctionLoading || !validationFile}
                style={{
                    display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem",
                    padding: "0.6rem 1.25rem", borderRadius: "var(--radius)",
                    background: "var(--primary)", color: "var(--primary-foreground)",
                    border: "none", fontWeight: 600, fontSize: "0.875rem",
                    cursor: correctionLoading || !validationFile ? "not-allowed" : "pointer",
                    opacity: correctionLoading || !validationFile ? 0.6 : 1,
                    width: "fit-content",
                    transition: "opacity 0.15s ease",
                }}
            >
                <Play size={14} />
                {correctionLoading ? "Memproses..." : "Terapkan Koreksi Bias"}
            </button>

            {!validationFile && (
                <p style={{ fontSize: "0.75rem", color: "#f59e0b", margin: "-0.75rem 0 0" }}>
                    File CSV belum tersedia. Upload file di panel kiri — file akan tersimpan otomatis dan tetap ada saat refresh.
                </p>
            )}

            {/* ── Error ── */}
            {correctionError && (
                <div style={{
                    padding: "0.75rem 1rem", fontSize: "0.8125rem",
                    background: "rgba(239,68,68,0.08)", border: "1px solid #ef4444",
                    borderRadius: "var(--radius)", color: "#ef4444",
                    display: "flex", alignItems: "center", gap: "0.5rem",
                }}>
                    <AlertCircle size={14} /> {correctionError}
                </div>
            )}

            {/* ── Results ── */}
            {hasResult && (
                <>
                    {/* Success banner */}
                    <div style={{
                        padding: "0.625rem 1rem", fontSize: "0.8125rem",
                        background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.3)",
                        borderRadius: "var(--radius)", color: "var(--foreground)",
                        display: "flex", alignItems: "center", gap: "0.5rem",
                    }}>
                        <CheckCircle size={14} style={{ color: "var(--success, #22c55e)", flexShrink: 0 }} />
                        <span>
                            Koreksi berhasil diterapkan menggunakan metode <strong>{METHODS.find(m => m.value === correctionResult!.method)?.label}</strong>
                            {correctionResult!.correction_info.bias_ratio != null && (
                                <> · Rasio koreksi: <strong>{correctionResult!.correction_info.bias_ratio.toFixed(3)}</strong></>
                            )}
                            {correctionResult!.correction_info.bias_removed != null && (
                                <> · Bias dihapus: <strong>{correctionResult!.correction_info.bias_removed.toFixed(2)} mm</strong></>
                            )}
                        </span>
                    </div>

                    {/* Metrics comparison */}
                    <div>
                        <h4 style={{ fontWeight: 600, fontSize: "0.875rem", marginBottom: "0.75rem" }}>Perbandingan Metrik</h4>
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: "0.75rem" }}>
                            <MetricDelta label="Bias (mm)" before={origMetrics.bias} after={corrMetrics?.bias} lowerIsBetter={false} />
                            <MetricDelta label="RMSE (mm)" before={origMetrics.rmse} after={corrMetrics?.rmse} />
                            <MetricDelta label="MAE (mm)" before={origMetrics.mae} after={corrMetrics?.mae} />
                            <MetricDelta label="Korelasi" before={origMetrics.correlation} after={corrMetrics?.correlation} lowerIsBetter={false} />
                            <MetricDelta label="R²" before={origMetrics.r2} after={corrMetrics?.r2} lowerIsBetter={false} />
                        </div>
                        <p style={{ fontSize: "0.7rem", color: "var(--muted-foreground)", marginTop: "0.5rem" }}>
                            Panah menunjukkan perubahan dari nilai sebelum koreksi.
                        </p>
                    </div>

                    {/* Bar chart comparison per station */}
                    <div>
                        <h4 style={{ fontWeight: 600, fontSize: "0.875rem", marginBottom: "0.25rem" }}>Curah Hujan per Stasiun: Sebelum &amp; Sesudah Koreksi</h4>
                        <p style={{ fontSize: "0.72rem", color: "var(--muted-foreground)", marginBottom: "0.75rem" }}>
                            Perbandingan nilai AWS observasi, QPE asli, dan QPE setelah koreksi bias untuk setiap stasiun.
                        </p>
                        <ResponsiveContainer width="100%" height={Math.max(300, tableRows.length * 5)}>
                            <LineChart
                                data={tableRows.map(r => ({
                                    name: r.name.length > 14 ? r.name.slice(0, 13) + "…" : r.name,
                                    fullName: r.name,
                                    "AWS (Obs)": parseFloat(r.aws.toFixed(2)),
                                    "QPE Asli": parseFloat(r.qpe_before.toFixed(2)),
                                    "QPE Terkoreksi": parseFloat(r.qpe_after.toFixed(2)),
                                }))}
                                margin={{ top: 8, right: 16, left: 8, bottom: tableRows.length > 8 ? 64 : 32 }}
                            >
                                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                                <XAxis
                                    dataKey="name"
                                    tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
                                    angle={tableRows.length > 6 ? -35 : 0}
                                    textAnchor={tableRows.length > 6 ? "end" : "middle"}
                                    interval={0}
                                />
                                <YAxis
                                    tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
                                    label={{ value: "mm", angle: -90, position: "insideLeft", style: { fontSize: 10, fill: "var(--muted-foreground)" } }}
                                />
                                <Tooltip
                                    contentStyle={{
                                        background: "var(--card)",
                                        border: "1px solid var(--border)",
                                        borderRadius: "var(--radius)",
                                        fontSize: "0.75rem",
                                    }}
                                    formatter={(value: number | undefined, name: string | undefined) => [`${(value ?? 0).toFixed(2)} mm`, name ?? ""]}
                                    labelFormatter={(_, payload) => payload?.[0]?.payload?.fullName ?? ""}
                                />
                                <Legend wrapperStyle={{ fontSize: "0.75rem", paddingTop: "0.5rem" }} />
                                <ReferenceLine y={0} stroke="var(--border)" />
                                <Line 
                                    type="monotone" 
                                    dataKey="AWS (Obs)" 
                                    stroke="#3b82f6" 
                                    strokeWidth={2} 
                                    dot={{ r: 4, fill: "#3b82f6" }}
                                    activeDot={{ r: 6 }}
                                />
                                <Line 
                                    type="monotone" 
                                    dataKey="QPE Asli" 
                                    stroke="#f97316" 
                                    strokeWidth={2} 
                                    strokeDasharray="5 5"
                                    dot={{ r: 4, fill: "#f97316" }}
                                />
                                <Line 
                                    type="monotone" 
                                    dataKey="QPE Terkoreksi" 
                                    stroke="#22c55e" 
                                    strokeWidth={3} 
                                    dot={{ r: 5, fill: "#22c55e" }}
                                    activeDot={{ r: 7 }}
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>

                    {/* Table */}
                    <div>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.75rem" }}>
                            <h4 style={{ fontWeight: 600, fontSize: "0.875rem", margin: 0 }}>Perbandingan per Stasiun</h4>
                            <button
                                onClick={downloadCSV}
                                style={{
                                    display: "flex", alignItems: "center", gap: "0.375rem",
                                    padding: "0.375rem 0.75rem", borderRadius: "var(--radius)",
                                    border: "1px solid var(--border)", background: "var(--card)",
                                    fontSize: "0.75rem", fontWeight: 600, cursor: "pointer",
                                    color: "var(--foreground)",
                                }}
                            >
                                <Download size={12} /> Unduh CSV
                            </button>
                        </div>
                        <div style={{ overflowX: "auto", borderRadius: "var(--radius)", border: "1px solid var(--border)" }}>
                            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.75rem" }}>
                                <thead>
                                    <tr style={{ background: "var(--muted)" }}>
                                        {["Stasiun", "AWS (mm)", "QPE Asli (mm)", "QPE Terkoreksi (mm)", "Error Asli", "Error Terkoreksi"].map(h => (
                                            <th key={h} style={{
                                                padding: "0.5rem 0.75rem", textAlign: "left",
                                                fontWeight: 600, color: "var(--muted-foreground)",
                                                borderBottom: "1px solid var(--border)", whiteSpace: "nowrap",
                                            }}>{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {tableRows.map((r, i) => (
                                        <tr key={i} style={{
                                            borderBottom: "1px solid var(--border)",
                                            background: r.is_outlier ? "rgba(245,158,11,0.05)" : i % 2 === 0 ? "var(--card)" : "transparent",
                                        }}>
                                            <td style={{ padding: "0.5rem 0.75rem", fontWeight: 500 }}>
                                                {r.name}
                                                {r.is_outlier && <span style={{ marginLeft: "0.25rem", fontSize: "0.65rem", color: "#f59e0b" }}>⚠️</span>}
                                            </td>
                                            <td style={{ padding: "0.5rem 0.75rem" }}>{r.aws.toFixed(1)}</td>
                                            <td style={{ padding: "0.5rem 0.75rem" }}>{r.qpe_before.toFixed(1)}</td>
                                            <td style={{ padding: "0.5rem 0.75rem", fontWeight: 600, color: "var(--primary)" }}>
                                                {r.qpe_after.toFixed(1)}
                                            </td>
                                            <td style={{
                                                padding: "0.5rem 0.75rem",
                                                color: r.error_before > 0 ? "#ef4444" : "#22c55e",
                                            }}>
                                                {r.error_before.toFixed(2)}
                                            </td>
                                            <td style={{
                                                padding: "0.5rem 0.75rem", fontWeight: 600,
                                                color: Math.abs(r.error_after) < Math.abs(r.error_before) ? "#22c55e" : "#ef4444",
                                            }}>
                                                {r.error_after.toFixed(2)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
