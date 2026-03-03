"use client";

import {
    ResponsiveContainer,
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    Area,
    AreaChart,
} from "recharts";
import type { TimeseriesRecord, AccumulationMode } from "@/lib/api";

interface TimeSeriesChartProps {
    data: TimeseriesRecord[];
    mode?: AccumulationMode;
}

const MODE_LABELS: Record<AccumulationMode, { yLabel: string; title: string; stdLabel: string; timeFormat: Intl.DateTimeFormatOptions }> = {
    "10min": {
        yLabel: "mm/10menit",
        title: "Curah Hujan per 10 Menit",
        stdLabel: "Std Dev (mm/10menit)",
        timeFormat: { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" },
    },
    hourly: {
        yLabel: "mm/jam",
        title: "Curah Hujan per Jam",
        stdLabel: "Std Dev (mm/jam)",
        timeFormat: { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" },
    },
    daily: {
        yLabel: "mm/hari",
        title: "Curah Hujan Harian",
        stdLabel: "Std Dev (mm/hari)",
        timeFormat: { day: "numeric", month: "short", year: "numeric" },
    },
};

export default function TimeSeriesChart({ data, mode = "10min" }: TimeSeriesChartProps) {
    const labels = MODE_LABELS[mode];

    const formatted = data.map((d) => ({
        ...d,
        time: new Date(d.waktu).toLocaleTimeString("id-ID", labels.timeFormat),
    }));

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
            {/* Main QPE timeseries */}
            <div>
                <h4
                    style={{
                        fontSize: "0.8125rem",
                        fontWeight: 600,
                        color: "var(--muted-foreground)",
                        marginBottom: "0.75rem",
                    }}
                >
                    {labels.title}
                </h4>
                <ResponsiveContainer width="100%" height={280}>
                    <AreaChart data={formatted}>
                        <defs>
                            <linearGradient id="gradMean" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#1f77b4" stopOpacity={0.3} />
                                <stop offset="95%" stopColor="#1f77b4" stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" />
                        <XAxis
                            dataKey="time"
                            tick={{ fontSize: 10, fill: "var(--chart-text)" }}
                            angle={-30}
                            textAnchor="end"
                            height={60}
                        />
                        <YAxis
                            tick={{ fontSize: 11, fill: "var(--chart-text)" }}
                            label={{
                                value: labels.yLabel,
                                angle: -90,
                                position: "insideLeft",
                                style: { fontSize: 11, fill: "var(--chart-text)" },
                            }}
                        />
                        <Tooltip
                            contentStyle={{
                                background: "var(--card)",
                                border: "1px solid var(--border)",
                                borderRadius: "8px",
                                fontSize: "0.8125rem",
                            }}
                        />
                        <Legend wrapperStyle={{ fontSize: "0.8125rem" }} />
                        <Area
                            type="monotone"
                            dataKey="mean_qpe"
                            name="Rata-rata"
                            stroke="#1f77b4"
                            strokeWidth={2}
                            fill="url(#gradMean)"
                            dot={false}
                        />
                        <Line
                            type="monotone"
                            dataKey="max_qpe"
                            name="Maksimum"
                            stroke="#ff7f0e"
                            strokeWidth={1.5}
                            strokeDasharray="5 3"
                            dot={false}
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>

            {/* Std dev subplot */}
            <div>
                <h4
                    style={{
                        fontSize: "0.8125rem",
                        fontWeight: 600,
                        color: "var(--muted-foreground)",
                        marginBottom: "0.75rem",
                    }}
                >
                    Variabilitas Spasial (Std Dev)
                </h4>
                <ResponsiveContainer width="100%" height={180}>
                    <AreaChart data={formatted}>
                        <defs>
                            <linearGradient id="gradStd" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#2ca02c" stopOpacity={0.25} />
                                <stop offset="95%" stopColor="#2ca02c" stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" />
                        <XAxis
                            dataKey="time"
                            tick={{ fontSize: 10, fill: "var(--chart-text)" }}
                            angle={-30}
                            textAnchor="end"
                            height={60}
                        />
                        <YAxis
                            tick={{ fontSize: 11, fill: "var(--chart-text)" }}
                            label={{
                                value: labels.stdLabel,
                                angle: -90,
                                position: "insideLeft",
                                style: { fontSize: 11, fill: "var(--chart-text)" },
                            }}
                        />
                        <Tooltip
                            contentStyle={{
                                background: "var(--card)",
                                border: "1px solid var(--border)",
                                borderRadius: "8px",
                                fontSize: "0.8125rem",
                            }}
                        />
                        <Area
                            type="monotone"
                            dataKey="std_qpe"
                            name="Std Dev"
                            stroke="#2ca02c"
                            strokeWidth={1.5}
                            fill="url(#gradStd)"
                            dot={false}
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}
