"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import {
    Upload, X, CheckCircle, CloudRain, FileText, Check, AlertCircle,
    Sliders, FileUp, Play, Download, Calendar, ServerOff, Wifi,
} from "lucide-react";

export interface ValidationFormPanelProps {
    // Upload manual
    validationFile: File | null;
    onValidationFileChange: (file: File | null) => void;
    validationLoading: boolean;
    onValidationProcess: () => void;
    // FTP auto
    ftpDate: string;
    onFtpDateChange: (date: string) => void;
    ftpLoading: boolean;
    ftpError: string | null;
    onFtpProcess: () => void;
    // Shared
    validationParams: any;
    onValidationParamsChange: (params: any) => void;
}

// Today in YYYY-MM-DD (client side)
function getToday() {
    return new Date().toISOString().slice(0, 10);
}

// Derive expected FTP filename from date
function getFtpFilename(date: string) {
    return date ? `${date}_combined_data.csv` : "";
}

export default function ValidationFormPanel({
    validationFile,
    onValidationFileChange,
    validationLoading,
    onValidationProcess,
    ftpDate,
    onFtpDateChange,
    ftpLoading,
    ftpError,
    onFtpProcess,
    validationParams,
    onValidationParamsChange,
}: ValidationFormPanelProps) {
    const [validationTab, setValidationTab] = useState<"upload" | "params">("upload");
    const [dataMode, setDataMode] = useState<"manual" | "ftp">("manual");
    const [isDragOver, setIsDragOver] = useState(false);
    const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const today = getToday();

    // Parse CSV headers when file changes
    useEffect(() => {
        if (!validationFile) { setCsvHeaders([]); return; }
        const reader = new FileReader();
        reader.onload = (ev) => {
            const text = ev.target?.result as string;
            if (text) {
                const firstLine = text.split(/\r?\n/)[0];
                setCsvHeaders(firstLine.split(",").map((h: string) => h.trim()));
            }
        };
        reader.readAsText(validationFile.slice(0, 2048));
    }, [validationFile]);

    // ── Drag & Drop ──
    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault(); e.stopPropagation(); setIsDragOver(true);
    }, []);
    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault(); e.stopPropagation(); setIsDragOver(false);
    }, []);
    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault(); e.stopPropagation(); setIsDragOver(false);
        const files = e.dataTransfer.files;
        if (files.length > 0 && files[0].name.toLowerCase().endsWith(".csv")) {
            onValidationFileChange(files[0]);
        }
    }, [onValidationFileChange]);

    const ftpFilename = getFtpFilename(ftpDate);
    const canProcess = dataMode === "manual" ? !!validationFile : !!ftpDate;
    const isLoading = dataMode === "manual" ? validationLoading : ftpLoading;

    function handleProcess() {
        if (dataMode === "manual") onValidationProcess();
        else onFtpProcess();
    }

    // Tab button style
    const tabStyle = (active: boolean): React.CSSProperties => ({
        flex: 1, padding: "0.5rem", fontSize: "0.75rem", fontWeight: 600,
        border: "none", borderRadius: "calc(var(--radius) - 4px)", cursor: "pointer",
        background: active ? "var(--card)" : "transparent",
        color: active ? "var(--foreground)" : "var(--muted-foreground)",
        boxShadow: active ? "var(--shadow-sm)" : "none",
        transition: "all 0.2s",
        display: "flex", alignItems: "center", justifyContent: "center", gap: "0.375rem",
    });

    // Mode toggle button style
    const modeStyle = (active: boolean): React.CSSProperties => ({
        flex: 1,
        padding: "0.45rem 0.5rem",
        fontSize: "0.7rem",
        fontWeight: 600,
        border: `1px solid ${active ? "var(--primary)" : "var(--border)"}`,
        borderRadius: "calc(var(--radius) - 4px)",
        cursor: "pointer",
        background: active ? "var(--primary)" : "transparent",
        color: active ? "var(--primary-foreground)" : "var(--muted-foreground)",
        transition: "all 0.2s",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "0.3rem",
    });

    return (
        <div className="card" style={{ display: "flex", flexDirection: "column", gap: "1rem", padding: "1rem", height: "fit-content" }}>

            {/* ── Main Tabs: Data Validasi / Parameter ── */}
            <div style={{ display: "flex", gap: "0.25rem", background: "var(--muted)", padding: "0.25rem", borderRadius: "calc(var(--radius) - 2px)" }}>
                <button onClick={() => setValidationTab("upload")} style={tabStyle(validationTab === "upload")}>
                    <FileUp size={13} /> Data Validasi
                </button>
                <button onClick={() => setValidationTab("params")} style={tabStyle(validationTab === "params")}>
                    <Sliders size={13} /> Parameter
                </button>
            </div>

            {/* ── Tab: Data Validasi ── */}
            {validationTab === "upload" && (
                <div style={{ display: "flex", flexDirection: "column", gap: "0.875rem" }}>

                    {/* Mode Toggle: Manual / FTP */}
                    <div style={{ display: "flex", gap: "0.375rem" }}>
                        <button onClick={() => setDataMode("manual")} style={modeStyle(dataMode === "manual")}>
                            <Upload size={11} /> Upload
                        </button>
                        <button onClick={() => setDataMode("ftp")} style={modeStyle(dataMode === "ftp")}>
                            <Wifi size={11} /> Otomatis
                        </button>
                    </div>

                    {/* ── Manual Upload ── */}
                    {dataMode === "manual" && (
                        <>
                            <div
                                onClick={() => fileInputRef.current?.click()}
                                onDragOver={handleDragOver}
                                onDragLeave={handleDragLeave}
                                onDrop={handleDrop}
                                style={{
                                    border: `2px dashed ${isDragOver ? "var(--primary)" : validationFile ? "var(--success)" : "var(--border)"}`,
                                    borderRadius: "var(--radius)",
                                    padding: "1.5rem 1rem", textAlign: "center", cursor: "pointer",
                                    background: isDragOver ? "rgba(0,85,164,0.06)" : validationFile ? "rgba(16,185,129,0.05)" : "var(--card)",
                                    transition: "all 0.2s ease", position: "relative",
                                }}
                            >
                                {isDragOver ? (
                                    <>
                                        <Upload size={28} style={{ margin: "0 auto 0.5rem", color: "var(--primary)", animation: "pulse 1s infinite" }} />
                                        <p style={{ fontSize: "0.8125rem", fontWeight: 600, color: "var(--primary)" }}>Drop file di sini</p>
                                    </>
                                ) : validationFile ? (
                                    <>
                                        <CheckCircle size={28} style={{ margin: "0 auto 0.375rem", color: "var(--success)" }} />
                                        <p style={{ fontSize: "0.8125rem", fontWeight: 600, color: "var(--success)" }}>{validationFile.name}</p>
                                        <p style={{ fontSize: "0.6875rem", color: "var(--muted-foreground)" }}>{(validationFile.size / 1024).toFixed(1)} KB</p>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); onValidationFileChange(null); }}
                                            style={{
                                                position: "absolute", top: 6, right: 6,
                                                background: "var(--muted)", border: "none", borderRadius: "50%",
                                                width: 22, height: 22, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                                                color: "var(--muted-foreground)",
                                            }}
                                        >
                                            <X size={12} />
                                        </button>
                                    </>
                                ) : (
                                    <>
                                        <CloudRain size={28} style={{ margin: "0 auto 0.5rem", color: "var(--muted-foreground)" }} />
                                        <p style={{ fontSize: "0.8125rem", fontWeight: 600, color: "var(--foreground)" }}>Drag &amp; drop CSV</p>
                                        <p style={{ fontSize: "0.6875rem", color: "var(--muted-foreground)", marginTop: "0.25rem" }}>atau klik untuk pilih file</p>
                                    </>
                                )}
                            </div>
                            <input ref={fileInputRef} type="file" accept=".csv" style={{ display: "none" }} onChange={(e) => { if (e.target.files?.[0]) onValidationFileChange(e.target.files[0]); }} />

                            {/* Column comparison */}
                            {csvHeaders.length > 0 && (() => {
                                const requiredCols = [
                                    { key: "station_name", aliases: ["name", "station_name", "stasiun", "nama", "pos_hujan_id"], label: "Nama Stasiun" },
                                    { key: "latitude", aliases: ["current_latitude", "latitude", "lat"], label: "Latitude" },
                                    { key: "longitude", aliases: ["current_longitude", "longitude", "lon"], label: "Longitude" },
                                    { key: "timestamp", aliases: ["data_timestamp", "timestamp", "time", "tanggal"], label: "Timestamp" },
                                    { key: "rainfall", aliases: ["rainfall_day_mm", "rainfall", "curah_hujan", "rr_acc"], label: "Curah Hujan" },
                                ];
                                return (
                                    <div style={{ marginTop: "0.25rem", border: "1px solid var(--border)", borderRadius: "calc(var(--radius) - 2px)", overflow: "hidden" }}>
                                        <div style={{ display: "flex", alignItems: "center", gap: "0.375rem", padding: "0.375rem 0.625rem", background: "var(--muted)", borderBottom: "1px solid var(--border)", fontSize: "0.6875rem", fontWeight: 700 }}>
                                            <FileText size={11} /> Perbandingan Kolom
                                        </div>
                                        <div style={{ fontSize: "0.625rem" }}>
                                            {requiredCols.map((col) => {
                                                const matched = csvHeaders.find(h => col.aliases.includes(h.toLowerCase()));
                                                return (
                                                    <div key={col.key} style={{ display: "flex", alignItems: "center", padding: "0.25rem 0.625rem", borderBottom: "1px solid var(--border)", gap: "0.375rem" }}>
                                                        {matched ? <Check size={10} style={{ color: "var(--success)", flexShrink: 0 }} /> : <AlertCircle size={10} style={{ color: "#f59e0b", flexShrink: 0 }} />}
                                                        <span style={{ flex: 1, fontWeight: 600, color: "var(--foreground)" }}>{col.label}</span>
                                                        <span style={{ color: matched ? "var(--success)" : "var(--muted-foreground)", fontFamily: "monospace" }}>{matched || "—"}</span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                        <div style={{ padding: "0.25rem 0.625rem", fontSize: "0.5625rem", color: "var(--muted-foreground)", background: "var(--muted)" }}>CSV: {csvHeaders.length} kolom terdeteksi</div>
                                    </div>
                                );
                            })()}
                        </>
                    )}

                    {/* ── FTP Auto-Download ── */}
                    {dataMode === "ftp" && (
                        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                            {/* Info box */}
                            <div style={{
                                padding: "0.625rem 0.75rem",
                                borderRadius: "var(--radius)",
                                background: "rgba(0,85,164,0.07)",
                                border: "1px solid rgba(0,85,164,0.18)",
                                fontSize: "0.6875rem",
                                color: "var(--muted-foreground)",
                                lineHeight: 1.5,
                            }}>
                                <span style={{ fontWeight: 700, color: "var(--foreground)", display: "flex", alignItems: "center", gap: "0.3rem", marginBottom: "0.25rem" }}>
                                    <ServerOff size={11} /> Pilih tanggal
                                </span>
                                Sistem akan mengunduh file CSV langsung dari server.
                            </div>

                            {/* Date picker */}
                            <div className="input-group">
                                <label style={{ fontSize: "0.75rem", display: "flex", alignItems: "center", gap: "0.3rem" }}>
                                    <Calendar size={11} /> Tanggal Data
                                </label>
                                <input
                                    type="date"
                                    className="input-field"
                                    value={ftpDate}
                                    max={today}
                                    onChange={(e) => onFtpDateChange(e.target.value)}
                                    style={{ width: "100%" }}
                                />
                            </div>

                            {/* Filename preview */}
                            {ftpFilename && (
                                <div style={{
                                    display: "flex", alignItems: "center", gap: "0.375rem",
                                    padding: "0.4rem 0.625rem",
                                    background: "var(--muted)", borderRadius: "calc(var(--radius) - 4px)",
                                    fontSize: "0.6875rem", color: "var(--muted-foreground)",
                                }}>
                                    <FileText size={11} style={{ flexShrink: 0 }} />
                                    <span>File: <code style={{ color: "var(--foreground)", fontWeight: 600 }}>{ftpFilename}</code></span>
                                </div>
                            )}

                            {/* FTP error display */}
                            {ftpError && (
                                <div style={{
                                    display: "flex", alignItems: "flex-start", gap: "0.4rem",
                                    padding: "0.5rem 0.625rem",
                                    background: "rgba(239,68,68,0.08)",
                                    border: "1px solid rgba(239,68,68,0.25)",
                                    borderRadius: "calc(var(--radius) - 4px)",
                                    fontSize: "0.6875rem", color: "#dc2626",
                                }}>
                                    <AlertCircle size={12} style={{ flexShrink: 0, marginTop: 1 }} />
                                    <span>{ftpError}</span>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* ── Tab: Parameter ── */}
            {validationTab === "params" && (
                <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
                    <div className="input-group">
                        <label style={{ fontSize: "0.75rem" }}>Min Coverage: <strong>{validationParams?.coverage_threshold}%</strong></label>
                        <input type="range" min={0} max={100} value={validationParams?.coverage_threshold} onChange={(e) => onValidationParamsChange({ ...validationParams, coverage_threshold: Number(e.target.value) })} style={{ width: "100%" }} />
                    </div>
                    <div className="input-group">
                        <label style={{ fontSize: "0.75rem" }}>Maks Jarak: <strong>{validationParams?.max_distance} km</strong></label>
                        <input type="range" min={0} max={200} value={validationParams?.max_distance} onChange={(e) => onValidationParamsChange({ ...validationParams, max_distance: Number(e.target.value) })} style={{ width: "100%" }} />
                    </div>
                    <div className="input-group">
                        <label style={{ fontSize: "0.75rem" }}>Metode Outlier</label>
                        <select className="select-field" value={validationParams?.outlier_method} onChange={(e) => onValidationParamsChange({ ...validationParams, outlier_method: e.target.value })}>
                            <option value="iqr">IQR</option>
                            <option value="zscore">Z-Score</option>
                        </select>
                    </div>
                    <div className="input-group">
                        <label style={{ fontSize: "0.75rem" }}>Threshold Outlier</label>
                        <input className="input-field" type="number" min={1.0} max={3.0} step={0.1} value={validationParams?.outlier_threshold} onChange={(e) => onValidationParamsChange({ ...validationParams, outlier_threshold: Number(e.target.value) })} />
                    </div>
                </div>
            )}

            {/* ── Process Button ── */}
            <button
                className="btn btn-primary"
                onClick={handleProcess}
                disabled={!canProcess || isLoading}
                style={{ width: "100%", padding: "0.75rem", gap: "0.5rem", opacity: (!canProcess || isLoading) ? 0.6 : 1, marginTop: "0.25rem" }}
            >
                {isLoading ? (
                    <><div className="spinner" style={{ width: "1rem", height: "1rem", borderWidth: 2 }} /> {dataMode === "ftp" ? "Mengunduh..." : "Memproses..."}</>
                ) : (
                    <>{dataMode === "ftp" ? <Download size={14} /> : <Play size={14} />} {dataMode === "ftp" ? "Unduh & Proses" : "Proses Validasi"}</>
                )}
            </button>
        </div>
    );
}
