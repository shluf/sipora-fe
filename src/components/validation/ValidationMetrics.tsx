"use client";

import { TrendingDown, Activity, Target, BarChart3, Hash } from "lucide-react";
import type { ValidationMetrics as Metrics } from "@/lib/api";

interface Props {
    metrics: Metrics;
}

export default function ValidationMetrics({ metrics }: Props) {
    if (!metrics.valid) {
        return (
            <div className="card" style={{ padding: "1.5rem", textAlign: "center", color: "var(--muted-foreground)" }}>
                ⚠️ Data tidak cukup untuk perhitungan metrik (minimum 3 data point)
            </div>
        );
    }

    const cards = [
        {
            label: "Bias",
            value: `${(metrics.bias ?? 0) >= 0 ? "+" : ""}${(metrics.bias ?? 0).toFixed(2)} mm`,
            icon: <TrendingDown size={20} />,
            color: "#ef4444",
            delta: (metrics.bias ?? 0) > 0 ? "Overestimate" : "Underestimate",
        },
        {
            label: "RMSE",
            value: `${(metrics.rmse ?? 0).toFixed(2)} mm`,
            icon: <Activity size={20} />,
            color: "#f59e0b",
        },
        {
            label: "MAE",
            value: `${(metrics.mae ?? 0).toFixed(2)} mm`,
            icon: <Target size={20} />,
            color: "#0ea5e9",
        },
        {
            label: "Korelasi",
            value: `${(metrics.correlation ?? 0).toFixed(3)}`,
            icon: <BarChart3 size={20} />,
            color: "#10b981",
            delta: `R² = ${(metrics.r2 ?? 0).toFixed(3)}`,
        },
        {
            label: "Jumlah Data",
            value: `${metrics.n}`,
            icon: <Hash size={20} />,
            color: "#8b5cf6",
            delta: `Slope: ${(metrics.slope ?? 0).toFixed(3)}`,
        },
    ];

    return (
        <div className="metrics-grid" style={{ gridTemplateColumns: "repeat(5, 1fr)" }}>
            {cards.map((c) => (
                <div key={c.label} className="card metric-card">
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                        <div>
                            <div className="metric-label">{c.label}</div>
                            <div className="metric-value" style={{ fontSize: "1.5rem" }}>{c.value}</div>
                            {c.delta && <div className="metric-delta">{c.delta}</div>}
                        </div>
                        <div
                            style={{
                                color: c.color,
                                background: `${c.color}15`,
                                padding: "0.5rem",
                                borderRadius: "0.5rem",
                            }}
                        >
                            {c.icon}
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}
