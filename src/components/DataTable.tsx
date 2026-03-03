"use client";

import { FileDown, FileSpreadsheet, FileJson } from "lucide-react";
import type { TimeseriesRecord, AccumulationMode } from "@/lib/api";
import { api } from "@/lib/api";

interface DataTableProps {
    data: TimeseriesRecord[];
    area: string;
    startDate: string;
    endDate: string;
    exportLevel?: string;
    exportLat?: number;
    exportLon?: number;
    mode?: AccumulationMode;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getField(row: TimeseriesRecord, key: string): any {
    return (row as unknown as Record<string, unknown>)[key];
}

const UNIT_LABELS: Record<AccumulationMode, string> = {
    "10min": "mm/10min",
    hourly: "mm/jam",
    daily: "mm/hari",
};

export default function DataTable({ data, area, startDate, endDate, exportLevel, exportLat, exportLon, mode = "10min" }: DataTableProps) {
    const unit = UNIT_LABELS[mode];

    const timeFormat: Intl.DateTimeFormatOptions = mode === "daily"
        ? { day: "2-digit", month: "short", year: "numeric" }
        : { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" };

    const columns = [
        { key: "waktu", label: "Waktu", format: (v: string) => new Date(v).toLocaleString("id-ID", timeFormat) },
        { key: "mean_qpe", label: `Rata-rata (${unit})`, format: (v: number) => v.toFixed(2) },
        { key: "max_qpe", label: `Maksimum (${unit})`, format: (v: number) => v.toFixed(2) },
        { key: "min_qpe", label: `Minimum (${unit})`, format: (v: number) => v.toFixed(2) },
        { key: "std_qpe", label: `Std Dev (${unit})`, format: (v: number) => v.toFixed(2) },
        { key: "accum_mean", label: "Akum. Rata-rata (mm)", format: (v: number) => v.toFixed(2) },
        { key: "accum_max", label: "Akum. Maksimum (mm)", format: (v: number) => v.toFixed(2) },
        { key: "intensity", label: "Intensitas", format: (v: string) => v },
    ];

    const intensityColor: Record<string, string> = {
        "Tidak Hujan": "#f0f0f0",
        "Sangat Ringan": "#e6f2ff",
        "Ringan": "#99ccff",
        "Sedang": "#3399ff",
        "Lebat": "#0066cc",
        "Sangat Lebat": "#003366",
        "Ekstrem": "#800080",
    };

    const getMaxVal = () => {
        const maxes = data.map((d) => d.max_qpe);
        return Math.max(...maxes, 1);
    };

    const getBg = (val: number, max: number) => {
        const ratio = Math.min(val / max, 1);
        return `rgba(0, 85, 164, ${ratio * 0.2})`;
    };

    const exportOpts = (exportLat != null && exportLon != null)
        ? { lat: exportLat, lon: exportLon, mode }
        : exportLevel ? { level: exportLevel, mode } : { mode };

    return (
        <div>
            {/* Export buttons */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                <h3 style={{ fontWeight: 700, fontSize: "1rem" }}>Data QPE Terperinci</h3>
                <div className="export-group">
                    <a
                        href={api.getExportUrl("csv", area, startDate, endDate, exportOpts)}
                        className="btn btn-secondary"
                        download
                    >
                        <FileDown size={14} /> CSV
                    </a>
                    <a
                        href={api.getExportUrl("excel", area, startDate, endDate, exportOpts)}
                        className="btn btn-secondary"
                        download
                    >
                        <FileSpreadsheet size={14} /> Excel
                    </a>
                    <a
                        href={api.getExportUrl("json", area, startDate, endDate, exportOpts)}
                        className="btn btn-secondary"
                        download
                    >
                        <FileJson size={14} /> JSON
                    </a>
                </div>
            </div>

            {/* Table */}
            <div className="data-table-wrapper" style={{ maxHeight: "400px", overflowY: "auto" }}>
                <table className="data-table">
                    <thead>
                        <tr>
                            {columns.map((col) => (
                                <th key={col.key}>{col.label}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {data.map((row, i) => (
                            <tr key={i}>
                                {columns.map((col) => {
                                    const val = getField(row, col.key);
                                    const formatted = col.format(val as never);

                                    let style: React.CSSProperties = {};

                                    if (col.key === "mean_qpe" || col.key === "max_qpe") {
                                        style.background = getBg(val as number, getMaxVal());
                                    }

                                    if (col.key === "intensity") {
                                        const color = intensityColor[val as string] || "transparent";
                                        return (
                                            <td key={col.key}>
                                                <span
                                                    className="intensity-badge"
                                                    style={{
                                                        backgroundColor: color,
                                                        color: ["Lebat", "Sangat Lebat", "Ekstrem"].includes(val as string)
                                                            ? "#fff"
                                                            : "#333",
                                                    }}
                                                >
                                                    {formatted}
                                                </span>
                                            </td>
                                        );
                                    }

                                    return (
                                        <td key={col.key} style={style}>
                                            {formatted}
                                        </td>
                                    );
                                })}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
