"use client";

import { useState, useEffect } from "react";
import { useValidationContext } from "@/contexts/ValidationContext";
import type { ValidationResult } from "@/lib/api";
import ValidationMetrics from "@/components/validation/ValidationMetrics";
import ScatterComparison from "@/components/validation/ScatterComparison";
import ErrorAnalysis from "@/components/validation/ErrorAnalysis";
import StationTable from "@/components/validation/StationTable";
import ValidationExport from "@/components/validation/ValidationExport";
import StationLineChart from "@/components/validation/StationLineChart";
import ValidationCorrection from "@/components/validation/ValidationCorrection";
import dynamic from "next/dynamic";
import { AlertTriangle, CheckCircle, X, BarChart2, Globe, TrendingUp, Search, Download, AlertCircle, CloudRain, Sliders } from "lucide-react";

const SpatialBiasMap = dynamic(() => import("@/components/validation/SpatialBiasMap"), { ssr: false });

type ChartType = "scatter" | "error_distance" | "timeseries" | "bias_distribution";

export default function ValidationPage() {
    const {
        validationError, setValidationError,
        validationResult, setValidationResult,
    } = useValidationContext();

    const [validationTab, setValidationTab] = useState(0);
    const [validationChartType, setValidationChartType] = useState<ChartType>("scatter");
    const [selectedStation, setSelectedStation] = useState("");
    const [mounted, setMounted] = useState(false);

    const valTabs: { label: string; icon: React.ReactNode; id: string }[] = [
        { label: "Statistik", icon: <BarChart2 size={13} />, id: "stats" },
        { label: "Peta Spasial", icon: <Globe size={13} />, id: "map" },
        { label: "Grafik", icon: <TrendingUp size={13} />, id: "charts" },
        { label: "Error Analysis", icon: <Search size={13} />, id: "error" },
        { label: "Koreksi Bias", icon: <Sliders size={13} />, id: "correction" },
        { label: "Export", icon: <Download size={13} />, id: "export" },
    ];

    const chartOptions: { label: string; value: ChartType }[] = [
        { label: "Scatter AWS vs QPE", value: "scatter" },
        { label: "Error vs Distance", value: "error_distance" },
        { label: "Time Series", value: "timeseries" },
        { label: "Bias Distribution", value: "bias_distribution" },
    ];

    const hasValidationResults = validationResult?.ok && (validationResult.stations?.length ?? 0) > 0;

    useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted) {
        return <div style={{ minHeight: "100vh", display: "flex", flex: 1, padding: "2rem" }}>Memuat...</div>;
    }

    return (
        <div style={{ display: "flex", minHeight: "100vh", flex: 1 }}>
            {/* ── Main Validation Results Area ── */}
            <main className="main-content" style={{ flex: 1, padding: "1.5rem", overflowX: "hidden" }}>
                {!hasValidationResults && (
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "var(--muted-foreground)" }}>
                        <div style={{ textAlign: "center", maxWidth: "400px" }}>
                            <CloudRain size={48} style={{ margin: "0 auto 1rem", opacity: 0.5 }} />
                            <h2 style={{ fontSize: "1.25rem", marginBottom: "0.5rem", color: "var(--foreground)" }}>Belum Ada Data Validasi</h2>
                            <p style={{ fontSize: "0.875rem", lineHeight: 1.5 }}>
                                Silakan upload file observasi AWS (CSV) di panel sebelah kiri dan klik <strong>Proses Validasi</strong> untuk melihat hasilnya.
                            </p>
                        </div>
                    </div>
                )}

                {hasValidationResults ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: "2rem", marginBottom: "2rem" }}>
                        {/* Header */}
                        <div style={{
                            display: "flex", alignItems: "center", justifyContent: "space-between",
                            padding: "0.75rem 1rem", background: "linear-gradient(135deg, rgba(14,165,233,0.08), rgba(99,102,241,0.08))",
                            border: "1px solid rgba(14,165,233,0.2)", borderRadius: "var(--radius)",
                        }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", fontSize: "0.8125rem" }}>
                                <CheckCircle size={16} style={{ color: "var(--success)" }} />
                                <span>
                                    <strong>Validasi Selesai</strong> — {validationResult!.n_stations} stasiun diproses
                                    {validationResult!.stations.filter(s => s.is_outlier).length > 0 && (
                                        <span style={{ color: "#f59e0b", marginLeft: "0.5rem" }}>
                                            • {validationResult!.stations.filter(s => s.is_outlier).length} outlier
                                        </span>
                                    )}
                                </span>
                            </div>
                            <button
                                onClick={() => { setValidationResult(null); setValidationError(null); }}
                                style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted-foreground)", display: "flex", padding: 4 }}
                                title="Tutup hasil validasi"
                            >
                                <X size={16} />
                            </button>
                        </div>

                        {/* Error/warning */}
                        {validationError && (
                            <div style={{
                                padding: "0.75rem 1rem", fontSize: "0.8125rem",
                                background: validationResult?.warning ? "rgba(245,158,11,0.1)" : "rgba(239,68,68,0.1)",
                                border: `1px solid ${validationResult?.warning ? "#f59e0b" : "#ef4444"}`,
                                borderRadius: "var(--radius)",
                                color: validationResult?.warning ? "#92400e" : "#ef4444",
                                display: "flex", alignItems: "center", gap: "0.5rem",
                            }}>
                                <AlertTriangle size={14} /> {validationError}
                            </div>
                        )}

                        <ValidationMetrics metrics={validationResult!.metrics} />

                        <div className="card" style={{ padding: "1.5rem" }}>
                            <div className="tabs" style={{ marginBottom: "1.5rem" }}>
                                {valTabs.map((t, i) => (
                                    <button
                                        key={t.id}
                                        className={`tab ${validationTab === i ? "active" : ""}`}
                                        onClick={() => setValidationTab(i)}
                                        style={{ display: "flex", alignItems: "center", gap: "0.375rem" }}
                                    >
                                        {t.icon}
                                        {t.label}
                                    </button>
                                ))}
                            </div>

                            {validationTab === 0 && (
                                <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
                                    <StationLineChart
                                        stations={validationResult!.stations}
                                        stationStats={validationResult!.station_stats}
                                    />
                                    <StationTable
                                        stations={validationResult!.stations}
                                        stationStats={validationResult!.station_stats}
                                    />
                                </div>
                            )}

                            {validationTab === 1 && (
                                <SpatialBiasMap stations={validationResult!.stations} radar={validationResult!.radar} />
                            )}

                            {validationTab === 2 && (
                                <div>
                                    <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "1rem", flexWrap: "wrap" }}>
                                        <select
                                            className="select-field"
                                            style={{ width: "auto", minWidth: "200px" }}
                                            value={validationChartType}
                                            onChange={(e) => setValidationChartType(e.target.value as ChartType)}
                                        >
                                            {chartOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                                        </select>
                                        {validationChartType === "timeseries" && (
                                            <select
                                                className="select-field"
                                                style={{ width: "auto", minWidth: "150px" }}
                                                value={selectedStation}
                                                onChange={(e) => setSelectedStation(e.target.value)}
                                            >
                                                <option value="">Semua Stasiun</option>
                                                {[...new Set(validationResult!.stations.map(s => s.station_name))].map(name => (
                                                    <option key={name} value={name}>{name}</option>
                                                ))}
                                            </select>
                                        )}
                                    </div>
                                    <ScatterComparison
                                        stations={validationResult!.stations}
                                        metrics={validationResult!.metrics}
                                        chartType={validationChartType}
                                        selectedStation={selectedStation || undefined}
                                    />
                                </div>
                            )}

                            {validationTab === 3 && (
                                <div>
                                    <ErrorAnalysis
                                        stations={validationResult!.stations}
                                        errorHistogram={validationResult!.error_histogram || []}
                                        distanceErrorStats={validationResult!.distance_error_stats || []}
                                    />
                                    {validationResult!.recommendations && validationResult!.recommendations.length > 0 && (
                                        <div style={{ marginTop: "1.5rem" }}>
                                            {validationResult!.recommendations.map((rec, i) => (
                                                <div key={i} style={{
                                                    background: "#fff3cd", borderLeft: "4px solid #ffc107",
                                                    padding: "0.75rem 1rem", borderRadius: "0.25rem",
                                                    fontSize: "0.8125rem", color: "#856404", marginBottom: "0.5rem",
                                                    display: "flex", alignItems: "flex-start", gap: "0.5rem",
                                                }}>
                                                    <AlertCircle size={14} style={{ flexShrink: 0, marginTop: 2 }} /> {rec}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}

                            {validationTab === 4 && (
                                <ValidationCorrection />
                            )}

                            {validationTab === 5 && (
                                <ValidationExport result={validationResult!} />
                            )}
                        </div>
                    </div>
                ) : (
                    <div className="card" style={{ padding: "2rem", textAlign: "center", marginTop: "4rem" }}>
                        <div style={{
                            width: 80, height: 80, borderRadius: "50%", background: "var(--muted)",
                            display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 1.5rem"
                        }}>
                            <CloudRain size={40} style={{ color: "var(--muted-foreground)" }} />
                        </div>
                        <h3 style={{ fontWeight: 700, fontSize: "1.25rem", marginBottom: "0.5rem" }}>Belum Ada Data Validasi</h3>
                        <p style={{ color: "var(--muted-foreground)", maxWidth: 400, margin: "0 auto 1.5rem" }}>
                            Silakan upload file CSV berisi data curah hujan observasi (AWS) melalui panel di sebelah kiri.
                        </p>
                    </div>
                )}
            </main>
        </div>
    );
}
