"use client";

import { useState, useEffect } from "react";
import {
    longsorApi, type ZonalData, type AccumulationMode,
} from "@/lib/api";
import { useLongsorContext } from "@/contexts/LongsorContext";
import MetricCards from "@/components/MetricCards";
import TimeSeriesChart from "@/components/charts/TimeSeriesChart";
import AccumulationChart from "@/components/charts/AccumulationChart";
import IntensityBarChart from "@/components/charts/IntensityBarChart";
import SpatialMap from "@/components/SpatialMap";
import DataTable from "@/components/DataTable";

export default function LongsorAnalyticsPage() {
    // ── Global Longsor State ──
    const {
        metadata, initLoading, error, loadInitial, boundaries,
        selectedArea, startDate, endDate, accumulationMode, setAccumulationMode,
        pointMode, customPoint, visualizeTrigger, sidebarPanelOpen,
    } = useLongsorContext();

    // ── Local State ──
    const [zonalData, setZonalData] = useState<ZonalData | null>(null);
    const [loading, setLoading] = useState(false);
    const [localError, setLocalError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState(0);
    const [exportContext, setExportContext] = useState<{ level?: string; lat?: number; lon?: number; mode?: AccumulationMode }>({});

    // ── Visualize ──
    const handleVisualize = async () => {
        if (pointMode) {
            if (!customPoint || !startDate || !endDate) return;
            setLoading(true);
            setLocalError(null);
            try {
                const data = await longsorApi.getPointStats(customPoint.lat, customPoint.lon, startDate, endDate, accumulationMode);
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
                const data = await longsorApi.getZonalStats(selectedArea, startDate, endDate, "kabupaten", accumulationMode);
                setZonalData(data);
                setExportContext({ mode: accumulationMode });
            } catch (e) {
                setLocalError(e instanceof Error ? e.message : "Failed to load data");
                setLoading(false);
            }
        }
    };

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
                const data = await longsorApi.getZonalStats(kecamatan, startDate, endDate, "kecamatan", accumulationMode);
                setZonalData(data);
                setExportContext({ level: "kecamatan", mode: accumulationMode });
            } else {
                const kabName = kabupaten || areaName;
                const matchedArea = boundaries?.areas.find(a =>
                    a.toLowerCase() === kabName.toLowerCase() ||
                    kabName.toLowerCase().includes(a.toLowerCase()) ||
                    a.toLowerCase().includes(kabName.toLowerCase())
                );
                const data = await longsorApi.getZonalStats(matchedArea || kabName, startDate, endDate, "kabupaten", accumulationMode);
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
            const data = await longsorApi.getPointStats(lat, lon, startDate, endDate, accumulationMode);
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

    if (initLoading) {
        return (
            <div style={{ display: "flex", minHeight: "100vh", flex: 1 }}>
                <main className="main-content" style={{ width: "100%" }}>
                    <div style={{ marginBottom: "2rem" }}>
                        <div className="skeleton" style={{ width: "150px", height: "2rem", marginBottom: "0.25rem", borderRadius: "1rem" }} />
                        <div className="skeleton" style={{ width: "300px", height: "1rem", borderRadius: "0.5rem" }} />
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
                        Analisis Event Longsor (QPE Historis)
                    </h1>
                    <p style={{ fontSize: "0.875rem", color: "var(--muted-foreground)" }}>
                        <strong>Data sumber: Radar C-Band BMKG Stasiun Klimatologi Mlati, DIY</strong> - Ekstraksi berbasis DEM dan ZARR
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
                                Ringkasan Curah Hujan: {zonalData.area}
                            </h2>
                            <p style={{ fontSize: "0.8125rem", color: "var(--muted-foreground)" }}>
                                <strong>Periode Analisis:</strong>{" "}
                                {new Date(zonalData.start).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })}{" "}
                                s/d{" "}
                                {new Date(zonalData.end).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                            </p>
                        </div>

                        <MetricCards summary={zonalData.summary} />

                        <div className="card" style={{ padding: "1.5rem" }}>
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
                        <h3 style={{ fontWeight: 700, fontSize: "1.125rem", marginBottom: "1.25rem" }}>Cara Menggunakan Dashboard Analisis Longsor</h3>

                        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "1.5rem" }}>
                            <div className="card" style={{ padding: "1.25rem" }}>
                                <h4 style={{ fontWeight: 700, marginBottom: "0.5rem", color: "var(--primary)" }}>1. Pilih Wilayah Longsor</h4>
                                <p style={{ fontSize: "0.8125rem", color: "var(--muted-foreground)" }}>
                                    Manfaatkan input titik koordinat untuk akurasi tertinggi pada titik kejadian
                                </p>
                            </div>
                            <div className="card" style={{ padding: "1.25rem" }}>
                                <h4 style={{ fontWeight: 700, marginBottom: "0.5rem", color: "var(--primary)" }}>2. Atur Waktu Kejadian</h4>
                                <p style={{ fontSize: "0.8125rem", color: "var(--muted-foreground)" }}>
                                    Tentukan rentang tanggal 1-2 hari sebelum kejadian
                                </p>
                            </div>
                            <div className="card" style={{ padding: "1.25rem" }}>
                                <h4 style={{ fontWeight: 700, marginBottom: "0.5rem", color: "var(--primary)" }}>3. Analisis Historis</h4>
                                <p style={{ fontSize: "0.8125rem", color: "var(--muted-foreground)" }}>
                                    Lihat akumulasi curah hujan untuk analisis pemicu hidrometeorologis
                                </p>
                            </div>
                        </div>
                    </div>
                )}
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
                    backendApi={longsorApi}
                    enableTopography={true}
                />
            )}
        </div>
    );
}
