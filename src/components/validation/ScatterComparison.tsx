"use client";

import {
    ResponsiveContainer,
    ScatterChart,
    Scatter,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ReferenceLine,
    Line,
    ComposedChart,
    ZAxis,
} from "recharts";
import type { ValidationStation, ValidationMetrics } from "@/lib/api";

interface Props {
    stations: ValidationStation[];
    metrics: ValidationMetrics;
    chartType: "scatter" | "error_distance" | "timeseries" | "bias_distribution";
    selectedStation?: string;
}

export default function ScatterComparison({ stations, metrics, chartType, selectedStation }: Props) {
    const valid = stations.filter((s) => !isNaN(s.aws_rainfall_mm) && !isNaN(s.qpe_accumulation_mm));

    if (valid.length === 0) {
        return (
            <div style={{ textAlign: "center", padding: "3rem", color: "var(--muted-foreground)" }}>
                Tidak ada data valid untuk ditampilkan
            </div>
        );
    }

    if (chartType === "scatter") {
        const maxVal = Math.max(
            ...valid.map((s) => s.aws_rainfall_mm),
            ...valid.map((s) => s.qpe_accumulation_mm)
        ) * 1.1;

        // Regression line points
        const slope = metrics.slope ?? 1;
        const intercept = metrics.intercept ?? 0;
        const regressionData = [
            { x: 0, y: intercept },
            { x: maxVal, y: slope * maxVal + intercept },
        ];

        const oneToOneData = [
            { x: 0, y: 0 },
            { x: maxVal, y: maxVal },
        ];

        return (
            <div>
                <div style={{ position: "relative" }}>
                    {/* Stats overlay */}
                    <div style={{
                        position: "absolute", top: 40, left: 60, zIndex: 10,
                        background: "rgba(255,248,220,0.92)", padding: "0.5rem 0.75rem",
                        borderRadius: "6px", fontSize: "0.75rem", lineHeight: 1.6,
                        border: "1px solid #e2e8f0",
                    }}>
                        <div><strong>Bias:</strong> {(metrics.bias ?? 0).toFixed(2)} mm</div>
                        <div><strong>RMSE:</strong> {(metrics.rmse ?? 0).toFixed(2)} mm</div>
                        <div><strong>MAE:</strong> {(metrics.mae ?? 0).toFixed(2)} mm</div>
                        <div><strong>Corr:</strong> {(metrics.correlation ?? 0).toFixed(3)}</div>
                    </div>

                    <ResponsiveContainer width="100%" height={400}>
                        <ComposedChart margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" />
                            <XAxis
                                type="number"
                                dataKey="x"
                                domain={[0, maxVal]}
                                tick={{ fontSize: 11, fill: "var(--chart-text)" }}
                                label={{ value: "Observasi AWS (mm)", position: "insideBottom", offset: -10, style: { fontSize: 12, fontWeight: 600 } }}
                            />
                            <YAxis
                                type="number"
                                dataKey="y"
                                domain={[0, maxVal]}
                                tick={{ fontSize: 11, fill: "var(--chart-text)" }}
                                label={{ value: "Estimasi QPE (mm)", angle: -90, position: "insideLeft", style: { fontSize: 12, fontWeight: 600 } }}
                            />
                            <Tooltip
                                contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "8px", fontSize: "0.8rem" }}
                                formatter={(value: any, name: any) => [Number(value).toFixed(2), String(name)]}
                            />
                            {/* 1:1 line */}
                            <Line
                                data={oneToOneData}
                                dataKey="y"
                                stroke="#ef4444"
                                strokeWidth={2}
                                strokeDasharray="8 4"
                                dot={false}
                                name="1:1 Line"
                                legendType="line"
                            />
                            {/* Regression line */}
                            <Line
                                data={regressionData}
                                dataKey="y"
                                stroke="#3b82f6"
                                strokeWidth={2}
                                dot={false}
                                name={`Regresi: y=${slope.toFixed(2)}x+${intercept.toFixed(2)}`}
                                legendType="line"
                            />
                            {/* Scatter points */}
                            <Scatter
                                data={valid.map((s) => ({ x: s.aws_rainfall_mm, y: s.qpe_accumulation_mm, name: s.station_name, dist: s.distance_km }))}
                                fill="#1f77b4"
                                fillOpacity={0.7}
                                stroke="#0f172a"
                                strokeWidth={0.5}
                                name="Stasiun"
                            />
                            <Legend wrapperStyle={{ fontSize: "0.8rem" }} />
                        </ComposedChart>
                    </ResponsiveContainer>
                </div>
            </div>
        );
    }

    if (chartType === "error_distance") {
        const data = valid.map((s) => ({
            distance: s.distance_km,
            error: s.error,
            rainfall: s.aws_rainfall_mm,
            name: s.station_name,
        }));

        return (
            <ResponsiveContainer width="100%" height={400}>
                <ScatterChart margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" />
                    <XAxis
                        type="number"
                        dataKey="distance"
                        name="Jarak"
                        tick={{ fontSize: 11, fill: "var(--chart-text)" }}
                        label={{ value: "Jarak dari Radar (km)", position: "insideBottom", offset: -10, style: { fontSize: 12, fontWeight: 600 } }}
                    />
                    <YAxis
                        type="number"
                        dataKey="error"
                        name="Error"
                        tick={{ fontSize: 11, fill: "var(--chart-text)" }}
                        label={{ value: "Error (QPE - AWS) [mm]", angle: -90, position: "insideLeft", style: { fontSize: 12, fontWeight: 600 } }}
                    />
                    <ZAxis type="number" dataKey="rainfall" range={[40, 200]} name="AWS Rainfall" />
                    <ReferenceLine y={0} stroke="#ef4444" strokeDasharray="5 5" strokeWidth={2} />
                    <Tooltip
                        contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "8px", fontSize: "0.8rem" }}
                        formatter={(value: any) => Number(value).toFixed(2)}
                    />
                    <Scatter data={data} fill="#6366f1" fillOpacity={0.7} stroke="#312e81" strokeWidth={0.5} />
                </ScatterChart>
            </ResponsiveContainer>
        );
    }

    if (chartType === "timeseries") {
        const filtered = selectedStation ? valid.filter((s) => s.station_name === selectedStation) : valid;
        const sorted = [...filtered].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
        const data = sorted.map((s) => ({
            time: new Date(s.timestamp).toLocaleDateString("id-ID", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }),
            aws: s.aws_rainfall_mm,
            qpe: s.qpe_accumulation_mm,
        }));

        return (
            <ResponsiveContainer width="100%" height={400}>
                <ComposedChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" />
                    <XAxis dataKey="time" tick={{ fontSize: 10, fill: "var(--chart-text)" }} angle={-45} textAnchor="end" height={80} />
                    <YAxis tick={{ fontSize: 11, fill: "var(--chart-text)" }} label={{ value: "Akumulasi (mm)", angle: -90, position: "insideLeft", style: { fontSize: 12, fontWeight: 600 } }} />
                    <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "8px", fontSize: "0.8rem" }} />
                    <Legend wrapperStyle={{ fontSize: "0.8rem" }} />
                    <Line type="monotone" dataKey="aws" name="AWS (Observasi)" stroke="#1f77b4" strokeWidth={2} dot={{ r: 3 }} />
                    <Line type="monotone" dataKey="qpe" name="QPE (Radar)" stroke="#ef4444" strokeWidth={2} dot={{ r: 3 }} />
                </ComposedChart>
            </ResponsiveContainer>
        );
    }

    if (chartType === "bias_distribution") {
        const biasValues = valid.map((s) => s.error).filter((e) => !isNaN(e));
        const mean = biasValues.reduce((a, b) => a + b, 0) / biasValues.length;

        // Build histogram
        const min = Math.min(...biasValues);
        const max = Math.max(...biasValues);
        const binCount = 25;
        const binWidth = (max - min) / binCount || 1;
        const bins: { center: number; count: number }[] = [];
        for (let i = 0; i < binCount; i++) {
            const lo = min + i * binWidth;
            const hi = lo + binWidth;
            const count = biasValues.filter((v) => v >= lo && (i === binCount - 1 ? v <= hi : v < hi)).length;
            bins.push({ center: parseFloat(((lo + hi) / 2).toFixed(2)), count });
        }

        return (
            <ResponsiveContainer width="100%" height={400}>
                <ComposedChart data={bins} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" />
                    <XAxis dataKey="center" tick={{ fontSize: 11, fill: "var(--chart-text)" }} label={{ value: "Bias (mm)", position: "insideBottom", offset: -10, style: { fontSize: 12, fontWeight: 600 } }} />
                    <YAxis tick={{ fontSize: 11, fill: "var(--chart-text)" }} label={{ value: "Frekuensi", angle: -90, position: "insideLeft", style: { fontSize: 12, fontWeight: 600 } }} />
                    <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "8px", fontSize: "0.8rem" }} />
                    <ReferenceLine x={parseFloat(mean.toFixed(2))} stroke="#ef4444" strokeDasharray="5 5" strokeWidth={2} label={{ value: `Mean: ${mean.toFixed(2)}`, fill: "#ef4444", fontSize: 11 }} />
                    <ReferenceLine x={0} stroke="#000" strokeWidth={1} strokeOpacity={0.5} />
                    <Scatter dataKey="count" fill="#87ceeb" stroke="#333" strokeWidth={0.5} />
                </ComposedChart>
            </ResponsiveContainer>
        );
    }

    return null;
}
