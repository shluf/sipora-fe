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
    Brush,
} from "recharts";


import type { ValidationStation, StationStat } from "@/lib/api";

interface Props {
    stations: ValidationStation[];
    stationStats?: StationStat[];
}

export default function StationLineChart({ stations, stationStats }: Props) {
    // Aggregate per station: use stationStats if available, otherwise aggregate from stations
    const chartData = (() => {
        if (stationStats && stationStats.length > 0) {
            return stationStats.map((s) => ({
                name: s.station_name,
                aws: Number(s.aws_rainfall_mm_mean?.toFixed(2)) || 0,
                qpe: Number(s.qpe_accumulation_mm_mean?.toFixed(2)) || 0,
            }));
        }
        // Fallback: group by station_name and average
        const grouped: Record<string, { awsSum: number; qpeSum: number; count: number }> = {};
        stations.forEach((s) => {
            if (!grouped[s.station_name]) {
                grouped[s.station_name] = { awsSum: 0, qpeSum: 0, count: 0 };
            }
            grouped[s.station_name].awsSum += s.aws_rainfall_mm;
            grouped[s.station_name].qpeSum += s.qpe_accumulation_mm;
            grouped[s.station_name].count += 1;
        });
        return Object.entries(grouped).map(([name, { awsSum, qpeSum, count }]) => ({
            name,
            aws: Number((awsSum / count).toFixed(2)),
            qpe: Number((qpeSum / count).toFixed(2)),
        }));
    })();

    if (chartData.length === 0) {
        return (
            <div style={{ padding: "2rem", textAlign: "center", color: "var(--muted-foreground)" }}>
                Tidak ada data stasiun untuk ditampilkan
            </div>
        );
    }

    return (
        <div>
            <h4 style={{ fontSize: "0.875rem", fontWeight: 700, marginBottom: "0.75rem" }}>
                📈 Perbandingan Curah Hujan AWS vs QPE per Stasiun
            </h4>
            <ResponsiveContainer width="100%" height={360}>
                <LineChart data={chartData} margin={{ top: 10, right: 30, left: 10, bottom: 80 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.5} />
                    <XAxis
                        dataKey="name"
                        tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                        angle={-35}
                        textAnchor="end"
                        height={80}
                    />
                    <YAxis
                        tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                        label={{
                            value: "Curah Hujan (mm)",
                            angle: -90,
                            position: "insideLeft",
                            style: { fontSize: 12, fill: "var(--muted-foreground)" },
                            offset: 5,
                        }}
                    />
                    <Tooltip
                        contentStyle={{
                            background: "var(--card)",
                            border: "1px solid var(--border)",
                            borderRadius: "var(--radius)",
                            fontSize: "0.8125rem",
                            boxShadow: "var(--shadow)",
                        }}
                        formatter={(value: any, name: string | number | undefined) => [
                            `${Number(value).toFixed(2)} mm`,
                            name === "aws" ? "AWS (Observasi)" : "QPE (Radar)",
                        ]}
                        labelFormatter={(label) => `Stasiun: ${label}`}
                    />
                    <Legend
                        wrapperStyle={{ fontSize: "0.8125rem", paddingTop: "0.5rem", paddingBottom: "1.5rem" }}
                        formatter={(value: string | undefined) =>
                            value === "aws" ? "AWS (Curah Hujan Observasi)" : "QPE (Prediksi Radar)"
                        }
                    />
                    <Line
                        type="monotone"
                        dataKey="aws"
                        stroke="#3b82f6"
                        strokeWidth={2.5}
                        dot={{ r: 5, fill: "#3b82f6", stroke: "#fff", strokeWidth: 2 }}
                        activeDot={{ r: 7 }}
                        name="aws"
                    />
                    <Line
                        type="monotone"
                        dataKey="qpe"
                        stroke="#f59e0b"
                        strokeWidth={2.5}
                        dot={{ r: 5, fill: "#f59e0b", stroke: "#fff", strokeWidth: 2 }}
                        activeDot={{ r: 7 }}
                        name="qpe"
                    />
                    <Brush
                        dataKey="name"
                        height={30}
                        stroke="var(--primary)"
                        fill="var(--muted)"
                        tickFormatter={() => ""}
                        startIndex={0}
                        endIndex={Math.min(chartData.length - 1, 25)}
                    />
                </LineChart>
            </ResponsiveContainer>
        </div>
    );
}
