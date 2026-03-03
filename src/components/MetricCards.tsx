"use client";

import { Droplets, TrendingUp, Activity, Zap } from "lucide-react";
import type { ZonalSummary } from "@/lib/api";

interface MetricCardsProps {
    summary: ZonalSummary;
}

export default function MetricCards({ summary }: MetricCardsProps) {
    const cards = [
        {
            label: "Total Akumulasi",
            value: `${summary.total_accum.toFixed(1)} mm`,
            icon: <Droplets size={20} />,
            color: "#0055a4",
        },
        {
            label: "Rata-rata Intensitas",
            value: `${summary.avg_intensity.toFixed(2)} mm/10min`,
            delta: `≈ ${summary.avg_intensity_mm_h.toFixed(1)} mm/jam`,
            icon: <TrendingUp size={20} />,
            color: "#0ea5e9",
        },
        {
            label: "Intensitas Dominan",
            value: summary.dominant_class,
            icon: <Activity size={20} />,
            color: "#10b981",
        },
        {
            label: "Curah Maksimum",
            value: `${summary.max_intensity.toFixed(1)} mm/10min`,
            delta: new Date(summary.peak_time).toLocaleTimeString("id-ID", {
                hour: "2-digit",
                minute: "2-digit",
            }),
            icon: <Zap size={20} />,
            color: "#f59e0b",
        },
    ];

    return (
        <div className="metrics-grid">
            {cards.map((c) => (
                <div key={c.label} className="card metric-card">
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                        <div>
                            <div className="metric-label">{c.label}</div>
                            <div className="metric-value">{c.value}</div>
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
