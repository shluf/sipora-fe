"use client";

import {
    ResponsiveContainer,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Cell,
    LabelList,
} from "recharts";
import type { IntensityDistItem } from "@/lib/api";

interface IntensityBarChartProps {
    data: IntensityDistItem[];
}

export default function IntensityBarChart({ data }: IntensityBarChartProps) {
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
                Distribusi Intensitas Hujan (Klasifikasi BMKG)
            </h4>
            <ResponsiveContainer width="100%" height={400}>
                <BarChart data={data}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" />
                    <XAxis
                        dataKey="label"
                        tick={{ fontSize: 11, fill: "var(--chart-text)" }}
                        angle={-20}
                        textAnchor="end"
                        height={60}
                    />
                    <YAxis
                        tick={{ fontSize: 11, fill: "var(--chart-text)" }}
                        label={{
                            value: "Jumlah Timestep (10 menit)",
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
                    <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                        {data.map((entry, index) => (
                            <Cell key={index} fill={entry.color} />
                        ))}
                        <LabelList dataKey="count" position="top" style={{ fontSize: 11, fill: "var(--chart-text)" }} />
                    </Bar>
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
}
