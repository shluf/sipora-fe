"use client";

import {
    ResponsiveContainer,
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    Line,
} from "recharts";
import type { TimeseriesRecord, AccumulationMode } from "@/lib/api";

interface AccumulationChartProps {
    data: TimeseriesRecord[];
    mode?: AccumulationMode;
}

const TIME_FORMATS: Record<AccumulationMode, Intl.DateTimeFormatOptions> = {
    "10min": { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" },
    hourly: { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" },
    daily: { day: "numeric", month: "short", year: "numeric" },
};

export default function AccumulationChart({ data, mode = "10min" }: AccumulationChartProps) {
    const formatted = data.map((d) => ({
        ...d,
        time: new Date(d.waktu).toLocaleTimeString("id-ID", TIME_FORMATS[mode]),
    }));

    return (
        <div>
            <h4
                style={{
                    fontSize: "0.8125rem",
                    fontWeight: 600,
                    color: "var(--muted-foreground)",
                    marginBottom: "0.75rem",
                }}
            >
                Akumulasi Curah Hujan (mm)
            </h4>
            <ResponsiveContainer width="100%" height={400}>
                <AreaChart data={formatted}>
                    <defs>
                        <linearGradient id="gradAccum" x1="0" y1="0" x2="0" y2="1">
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
                            value: "Total Akumulasi (mm)",
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
                        dataKey="accum_mean"
                        name="Akumulasi Rata-rata"
                        stroke="#1f77b4"
                        strokeWidth={2.5}
                        fill="url(#gradAccum)"
                        dot={false}
                    />
                    <Line
                        type="monotone"
                        dataKey="accum_max"
                        name="Akumulasi Maksimum"
                        stroke="#ff7f0e"
                        strokeWidth={2}
                        strokeDasharray="5 3"
                        dot={false}
                    />
                </AreaChart>
            </ResponsiveContainer>
        </div>
    );
}
