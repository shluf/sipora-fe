"use client";

import { useState, useEffect, useCallback } from "react";
import {
    api, type QPEMetadata, type ZonalData, type BoundaryData,
    type AccumulationMode,
} from "@/lib/api";
import { useQpeContext } from "@/contexts/QpeContext";
import MetricCards from "@/components/MetricCards";
import TimeSeriesChart from "@/components/charts/TimeSeriesChart";
import AccumulationChart from "@/components/charts/AccumulationChart";
import IntensityBarChart from "@/components/charts/IntensityBarChart";
import SpatialMap from "@/components/SpatialMap";
import DataTable from "@/components/DataTable";
import dynamic from "next/dynamic";

export default function AnalyticsPage() {
    // ── Global QPE State ──
    const {
        metadata, boundaries, initLoading, error, loadInitial,
        selectedArea, startDate, endDate, accumulationMode, setAccumulationMode,
        pointMode, customPoint, visualizeTrigger, sidebarPanelOpen,
    } = useQpeContext();

    // ── Local State ──
    const [zonalData, setZonalData] = useState<ZonalData | null>(null);
    const [loading, setLoading] = useState(false);
    const [localError, setLocalError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState(0);
    const [exportContext, setExportContext] = useState<{ level?: string; lat?: number; lon?: number; mode?: AccumulationMode }>({});

    // ── QPE Visualize ──
    const handleVisualize = async () => {
        if (pointMode) {
            if (!customPoint || !startDate || !endDate) return;
            setLoading(true);
            setLocalError(null);
            try {
                const data = await api.getPointStats(customPoint.lat, customPoint.lon, startDate, endDate, accumulationMode);
                setZonalData(data);
                setExportContext({ lat: customPoint.lat, lon: customPoint.lon, mode: accumulationMode });
            } catch (e) {
                setLocalError(e instanceof Error ? e.message : "Failed to load point data");
            } finally {
                setLoading(false);
            }
        } else {
            if (!selectedArea || !startDate || !endDate) return;
            setLoading(true);
            setLocalError(null);
            try {
                const data = await api.getZonalStats(selectedArea, startDate, endDate, "kabupaten", accumulationMode);
                setZonalData(data);
                setExportContext({ mode: accumulationMode });
            } catch (e) {
                setLocalError(e instanceof Error ? e.message : "Failed to load data");
                setLoading(false);
            }
        }
    };

    // Listen to sidebar visualize button click
    useEffect(() => {
        if (visualizeTrigger > 0) {
            handleVisualize();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [visualizeTrigger]);

    const handleSpatialAreaSelect = async (areaName: string, kecamatan?: string, kabupaten?: string) => {
        if (!startDate || !endDate) return;
        setLoading(true);
        setLocalError(null);
        try {
            if (kecamatan) {
                const data = await api.getZonalStats(kecamatan, startDate, endDate, "kecamatan", accumulationMode);
                setZonalData(data);
                setExportContext({ level: "kecamatan", mode: accumulationMode });
            } else {
                const kabName = kabupaten || areaName;
                const matchedArea = boundaries?.areas.find(a =>
                    a.toLowerCase() === kabName.toLowerCase() ||
                    kabName.toLowerCase().includes(a.toLowerCase()) ||
                    a.toLowerCase().includes(kabName.toLowerCase())
                );
                const data = await api.getZonalStats(matchedArea || kabName, startDate, endDate, "kabupaten", accumulationMode);
                setZonalData(data);
                setExportContext({ mode: accumulationMode });
            }
        } catch (e) {
            setLocalError(e instanceof Error ? e.message : "Failed to load area data");
        } finally {
            setLoading(false);
        }
    };

    const handleSpatialPointSelect = async (lat: number, lon: number) => {
        if (!startDate || !endDate) return;
        setLoading(true);
        setLocalError(null);
        try {
            const data = await api.getPointStats(lat, lon, startDate, endDate, accumulationMode);
            setZonalData(data);
            setExportContext({ lat, lon, mode: accumulationMode });
        } catch (e) {
            setLocalError(e instanceof Error ? e.message : "Failed to load point data");
        } finally {
            setLoading(false);
        }
    };

    const qpeTabs = [
        { label: "Time Series" },
        { label: "Akumulasi" },
        { label: "Distribusi Intensitas" },
    ];

    // ── Loading / Error States ──
    if (initLoading) {
        return (
            <div style={{ display: "flex", minHeight: "100vh", flex: 1 }}>
                <main className="main-content" style={{ width: "100%" }}>
                    <div style={{ marginBottom: "2rem" }}>
                        <div className="skeleton" style={{ width: "150px", height: "2rem", marginBottom: "0.25rem", borderRadius: "1rem" }} />
                        <div className="skeleton" style={{ width: "300px", height: "1rem", borderRadius: "0.5rem" }} />
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
                        <div>
                            <div className="skeleton" style={{ width: "250px", height: "1.5rem", marginBottom: "0.5rem", borderRadius: "0.75rem" }} />
                            <div className="skeleton" style={{ width: "200px", height: "1rem", borderRadius: "0.5rem" }} />
                        </div>
                        {/* Skeleton Metric Cards */}
                        <div className="metrics-grid">
                            {[1, 2, 3, 4].map(i => (
                                <div key={i} className="card" style={{ padding: "1.25rem", height: "100px" }}>
                                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.5rem" }}>
                                        <div className="skeleton" style={{ width: "60%", height: "1rem", borderRadius: "0.5rem" }} />
                                        <div className="skeleton" style={{ width: "30px", height: "30px", borderRadius: "0.5rem" }} />
                                    </div>
                                    <div className="skeleton" style={{ width: "40%", height: "2rem", borderRadius: "1rem" }} />
                                </div>
                            ))}
                        </div>
                        {/* Skeleton Main Chart */}
                        <div className="card" style={{ padding: "1.5rem", height: "400px", display: "flex", flexDirection: "column" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "1.5rem" }}>
                                <div className="skeleton" style={{ width: "200px", height: "1.5rem", borderRadius: "0.75rem" }} />
                                <div className="skeleton" style={{ width: "150px", height: "1.5rem", borderRadius: "0.75rem" }} />
                            </div>
                            <div className="skeleton" style={{ flex: 1, width: "100%", borderRadius: "var(--radius)" }} />
                        </div>
                    </div>
                </main>
            </div>
        );
    }

    if (error && !metadata) {
        return (
            <div style={{ display: "flex", minHeight: "100vh", flex: 1 }}>
                <main className="main-content" style={{ width: "100%" }}>
                    <div className="card" style={{ maxWidth: 500, margin: "2rem auto", padding: "2rem", textAlign: "center" }}>
                        <h2 style={{ color: "var(--destructive)", marginBottom: "1rem" }}>Koneksi Backend Gagal</h2>
                        <p style={{ color: "var(--muted-foreground)", marginBottom: "1.5rem" }}>{error}</p>
                        <p style={{ fontSize: "0.8125rem", color: "var(--muted-foreground)", marginBottom: "1rem" }}>
                            Pastikan backend FastAPI berjalan di <code>http://localhost:8000</code>
                        </p>
                        <button className="btn btn-primary" onClick={loadInitial}>
                            Coba Lagi
                        </button>
                    </div>
                </main>
            </div>
        );
    }

    return (
        <div style={{ display: "flex", minHeight: "100vh", flex: 1 }}>
            <main className="main-content" style={{ width: "100%" }}>
                <div style={{ marginBottom: "2rem" }}>
                    <h1 style={{ fontSize: "1.75rem", fontWeight: 800, color: "var(--foreground)", marginBottom: "0.25rem" }}>
                        SIPORA
                    </h1>
                    <p style={{ fontSize: "0.875rem", color: "var(--muted-foreground)" }}>
                        <strong>Data sumber: Radar C-Band BMKG Stasiun Klimatologi Mlati, DIY</strong> - Resolusi 10 menit, 500 meter
                    </p>
                </div>

                {(error || localError) && (
                    <div style={{ padding: "1rem", background: "rgba(239, 68, 68, 0.1)", border: "1px solid #ef4444", borderRadius: "var(--radius)", color: "#ef4444", fontSize: "0.875rem", marginBottom: "1.5rem" }}>
                        {error || localError}
                    </div>
                )}

                {zonalData ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
                        <div>
                            <h2 style={{ fontSize: "1.25rem", fontWeight: 700, marginBottom: "0.25rem" }}>
                                Ringkasan QPE: {zonalData.area}
                            </h2>
                            <p style={{ fontSize: "0.8125rem", color: "var(--muted-foreground)" }}>
                                <strong>Periode Analisis:</strong>{" "}
                                {new Date(zonalData.start).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}{" "}
                                s/d{" "}
                                {new Date(zonalData.end).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}
                            </p>
                        </div>

                        <MetricCards summary={zonalData.summary} />

                        <div className="card" style={{ padding: "1.5rem" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1rem", flexWrap: "wrap" }}>
                                <h3 style={{ fontWeight: 700, fontSize: "1rem", margin: 0 }}>Analisis Temporal</h3>
                                <div style={{ display: "flex", gap: "0.375rem", marginLeft: "auto" }}>
                                    {(["10min", "hourly", "daily"] as AccumulationMode[]).map((m) => {
                                        const labels: Record<AccumulationMode, string> = { "10min": "10 Menit", hourly: "Per Jam", daily: "Harian" };
                                        const active = accumulationMode === m;
                                        return (
                                            <button
                                                key={m}
                                                onClick={() => {
                                                    setAccumulationMode(m);
                                                    if (zonalData) {
                                                        const runRefetch = async () => {
                                                            setLoading(true);
                                                            try {
                                                                let data: ZonalData;
                                                                if (exportContext.lat != null && exportContext.lon != null) {
                                                                    data = await api.getPointStats(exportContext.lat, exportContext.lon, startDate, endDate, m);
                                                                } else {
                                                                    const level = exportContext.level || "kabupaten";
                                                                    data = await api.getZonalStats(zonalData.area, startDate, endDate, level, m);
                                                                }
                                                                setZonalData(data);
                                                                setExportContext(prev => ({ ...prev, mode: m }));
                                                            } catch (e) {
                                                                setLocalError(e instanceof Error ? e.message : "Failed to reload data");
                                                            } finally {
                                                                setLoading(false);
                                                            }
                                                        };
                                                        runRefetch();
                                                    }
                                                }}
                                                style={{
                                                    padding: "0.3rem 0.75rem", borderRadius: "999px",
                                                    border: `1px solid ${active ? "var(--primary)" : "var(--border)"}`,
                                                    background: active ? "var(--primary)" : "transparent",
                                                    color: active ? "#fff" : "var(--muted-foreground)",
                                                    fontSize: "0.75rem", fontWeight: 600, cursor: "pointer",
                                                    transition: "all 0.2s", whiteSpace: "nowrap",
                                                }}
                                            >
                                                {labels[m]}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                            <div className="tabs">
                                {qpeTabs.map((t, i) => (
                                    <button key={i} className={`tab ${activeTab === i ? "active" : ""}`} onClick={() => setActiveTab(i)}>
                                        {t.label}
                                    </button>
                                ))}
                            </div>
                            <div>
                                {activeTab === 0 && <TimeSeriesChart data={zonalData.timeseries} mode={accumulationMode} />}
                                {activeTab === 1 && <AccumulationChart data={zonalData.timeseries} mode={accumulationMode} />}
                                {activeTab === 2 && <IntensityBarChart data={zonalData.distribution} />}
                            </div>
                        </div>

                        <div className="card" style={{ padding: "1.5rem" }}>
                            <DataTable
                                data={zonalData.timeseries}
                                area={zonalData.area}
                                startDate={zonalData.start}
                                endDate={zonalData.end}
                                exportLevel={exportContext.level}
                                exportLat={exportContext.lat}
                                exportLon={exportContext.lon}
                                mode={accumulationMode}
                            />
                        </div>
                    </div>
                ) : (
                    <div className="card" style={{ padding: "2rem" }}>
                        <h3 style={{ fontWeight: 700, fontSize: "1.125rem", marginBottom: "1.25rem" }}>Cara Menggunakan Dashboard QPE</h3>

                        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "1.5rem" }}>
                            <div className="card" style={{ padding: "1.25rem" }}>
                                <h4 style={{ fontWeight: 700, marginBottom: "0.5rem", color: "var(--primary)" }}>1. Pilih Wilayah</h4>
                                <p style={{ fontSize: "0.8125rem", color: "var(--muted-foreground)" }}>
                                    Pilih kabupaten/kota di sidebar untuk area analisis
                                </p>
                            </div>
                            <div className="card" style={{ padding: "1.25rem" }}>
                                <h4 style={{ fontWeight: 700, marginBottom: "0.5rem", color: "var(--primary)" }}>2. Atur Waktu</h4>
                                <p style={{ fontSize: "0.8125rem", color: "var(--muted-foreground)" }}>
                                    Tentukan rentang tanggal mulai dan selesai
                                </p>
                            </div>
                            <div className="card" style={{ padding: "1.25rem" }}>
                                <h4 style={{ fontWeight: 700, marginBottom: "0.5rem", color: "var(--primary)" }}>3. Visualisasi</h4>
                                <p style={{ fontSize: "0.8125rem", color: "var(--muted-foreground)" }}>
                                    Klik tombol &quot;Tampilkan Visualisasi QPE&quot; di sidebar
                                </p>
                            </div>
                        </div>

                        <div style={{ marginTop: "1.5rem", padding: "1rem", background: "var(--muted)", borderRadius: "var(--radius)" }}>
                            <h4 style={{ fontWeight: 700, marginBottom: "0.5rem" }}>Karakteristik Produk QPE</h4>
                            <ul style={{ fontSize: "0.8125rem", color: "var(--muted-foreground)", paddingLeft: "1.25rem", lineHeight: 1.8 }}>
                                <li><strong>Sumber data:</strong> Radar C-Band BMKG Stasiun Klimatologi Mlati (DIY)</li>
                                <li><strong>Metode estimasi:</strong> Machine Learning (LightGBM single-stage)</li>
                                <li><strong>Resolusi waktu:</strong> 10 menit per timestep</li>
                                <li><strong>Resolusi spasial:</strong> 500 meter per pixel</li>
                                <li><strong>Cakupan area:</strong> Radius ~100 km dari lokasi radar</li>
                                <li><strong>Satuan:</strong> mm per 10 menit (akumulasi dalam mm)</li>
                            </ul>
                        </div>
                    </div>
                )}

                <div className="footer">
                    <h4>SIPORA - Sistem Pemantauan Curah Hujan Operasional</h4>
                    <p>BMKG Stasiun Klimatologi Mlati, DIY</p>
                    <p>Produk QPE dihasilkan dari pipeline Machine Learning berbasis data radar cuaca C-Band</p>
                    <p className="copyright">© 2026 BMKG | Dashboard v2.0 - Next.js Edition</p>
                </div>
            </main>

            {metadata && metadata.timestamps.length > 0 && (
                <SpatialMap
                    timestamps={metadata.timestamps}
                    defaultTimestamp={metadata.timestamps[metadata.timestamps.length - 1]}
                    startDate={startDate}
                    endDate={endDate}
                    onAreaSelect={handleSpatialAreaSelect}
                    onPointSelect={handleSpatialPointSelect}
                    panelOpen={sidebarPanelOpen}
                    accumulationMode={accumulationMode}
                    onAccumulationModeChange={setAccumulationMode}
                />
            )}
        </div>
    );
}
