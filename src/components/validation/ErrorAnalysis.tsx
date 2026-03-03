"use client";

import {
    ResponsiveContainer,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ReferenceLine,
    ScatterChart,
    Scatter,
    ComposedChart,
    Cell,
    Legend,
} from "recharts";
import type { ErrorHistogramBin, DistanceErrorStat, ValidationStation } from "@/lib/api";

interface Props {
    stations: ValidationStation[];
    errorHistogram: ErrorHistogramBin[];
    distanceErrorStats: DistanceErrorStat[];
}

export default function ErrorAnalysis({ stations, errorHistogram, distanceErrorStats }: Props) {
    const valid = stations.filter((s) => !isNaN(s.error));
    const meanError = valid.length > 0 ? valid.reduce((a, s) => a + s.error, 0) / valid.length : 0;

    return (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem" }}>
            {/* Panel 1: Error histogram */}
            <div className="card" style={{ padding: "1rem" }}>
                <h4 style={{ fontSize: "0.8125rem", fontWeight: 700, marginBottom: "0.75rem", color: "var(--foreground)" }}>
                    Distribusi Error
                </h4>
                <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={errorHistogram} margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" />
                        <XAxis dataKey="bin_center" tick={{ fontSize: 9, fill: "var(--chart-text)" }} label={{ value: "Error (QPE - AWS) [mm]", position: "insideBottom", offset: -15, style: { fontSize: 10 } }} />
                        <YAxis tick={{ fontSize: 10, fill: "var(--chart-text)" }} label={{ value: "Frekuensi", angle: -90, position: "insideLeft", style: { fontSize: 10 } }} />
                        <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "6px", fontSize: "0.75rem" }} />
                        <ReferenceLine x={parseFloat(meanError.toFixed(2))} stroke="#ef4444" strokeDasharray="5 5" label={{ value: `Mean: ${meanError.toFixed(2)}`, fill: "#ef4444", fontSize: 9 }} />
                        <Bar dataKey="count" fill="#6b9bd2" stroke="#333" strokeWidth={0.5} />
                    </BarChart>
                </ResponsiveContainer>
            </div>

            {/* Panel 2: Error vs Intensity */}
            <div className="card" style={{ padding: "1rem" }}>
                <h4 style={{ fontSize: "0.8125rem", fontWeight: 700, marginBottom: "0.75rem", color: "var(--foreground)" }}>
                    Error vs Intensitas Hujan
                </h4>
                <ResponsiveContainer width="100%" height={250}>
                    <ScatterChart margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" />
                        <XAxis type="number" dataKey="x" name="AWS" tick={{ fontSize: 10, fill: "var(--chart-text)" }} label={{ value: "Curah Hujan AWS (mm)", position: "insideBottom", offset: -15, style: { fontSize: 10 } }} />
                        <YAxis type="number" dataKey="y" name="Error" tick={{ fontSize: 10, fill: "var(--chart-text)" }} label={{ value: "Error (mm)", angle: -90, position: "insideLeft", style: { fontSize: 10 } }} />
                        <ReferenceLine y={0} stroke="#ef4444" strokeDasharray="5 5" />
                        <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "6px", fontSize: "0.75rem" }} />
                        <Scatter
                            data={valid.map((s) => ({ x: s.aws_rainfall_mm, y: s.error, dist: s.distance_km }))}
                            fill="#6366f1"
                            fillOpacity={0.7}
                            stroke="#312e81"
                            strokeWidth={0.5}
                        />
                    </ScatterChart>
                </ResponsiveContainer>
            </div>

            {/* Panel 3: Boxplot-style by distance category */}
            <div className="card" style={{ padding: "1rem" }}>
                <h4 style={{ fontSize: "0.8125rem", fontWeight: 700, marginBottom: "0.75rem", color: "var(--foreground)" }}>
                    Error per Rentang Jarak
                </h4>
                {distanceErrorStats.length > 0 ? (
                    <ResponsiveContainer width="100%" height={250}>
                        <ComposedChart data={distanceErrorStats} margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" />
                            <XAxis dataKey="category" tick={{ fontSize: 10, fill: "var(--chart-text)" }} label={{ value: "Jarak (km)", position: "insideBottom", offset: -15, style: { fontSize: 10 } }} />
                            <YAxis tick={{ fontSize: 10, fill: "var(--chart-text)" }} label={{ value: "Error (mm)", angle: -90, position: "insideLeft", style: { fontSize: 10 } }} />
                            <ReferenceLine y={0} stroke="#ef4444" strokeDasharray="5 5" />
                            <Tooltip
                                contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "6px", fontSize: "0.75rem" }}
                                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                formatter={(value: any, name: any) => [Number(value).toFixed(2) + " mm", String(name)]}
                            />
                            <Legend wrapperStyle={{ fontSize: "0.75rem" }} />
                            <Bar dataKey="median" name="Median" fill="#60a5fa" stroke="#1e40af" strokeWidth={0.5}>
                                {distanceErrorStats.map((_, i) => (
                                    <Cell key={i} fill={distanceErrorStats[i].median > 0 ? "#fca5a5" : "#93c5fd"} />
                                ))}
                            </Bar>
                            <Bar dataKey="mean" name="Mean" fill="#a78bfa" stroke="#4c1d95" strokeWidth={0.5} />
                        </ComposedChart>
                    </ResponsiveContainer>
                ) : (
                    <div style={{ textAlign: "center", padding: "2rem", color: "var(--muted-foreground)", fontSize: "0.8rem" }}>
                        Data jarak tidak tersedia
                    </div>
                )}
            </div>

            {/* Panel 4: Relative error vs intensity */}
            <div className="card" style={{ padding: "1rem" }}>
                <h4 style={{ fontSize: "0.8125rem", fontWeight: 700, marginBottom: "0.75rem", color: "var(--foreground)" }}>
                    Relative Error vs Intensitas
                </h4>
                <ResponsiveContainer width="100%" height={250}>
                    <ScatterChart margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" />
                        <XAxis type="number" dataKey="x" name="AWS" tick={{ fontSize: 10, fill: "var(--chart-text)" }} label={{ value: "Curah Hujan AWS (mm)", position: "insideBottom", offset: -15, style: { fontSize: 10 } }} />
                        <YAxis type="number" dataKey="y" name="Rel. Error" tick={{ fontSize: 10, fill: "var(--chart-text)" }} label={{ value: "Relative Error (%)", angle: -90, position: "insideLeft", style: { fontSize: 10 } }} />
                        <ReferenceLine y={0} stroke="#333" strokeWidth={1} strokeOpacity={0.5} />
                        <ReferenceLine y={50} stroke="#f59e0b" strokeDasharray="4 4" strokeOpacity={0.7} />
                        <ReferenceLine y={-50} stroke="#f59e0b" strokeDasharray="4 4" strokeOpacity={0.7} />
                        <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "6px", fontSize: "0.75rem" }} />
                        <Scatter
                            data={valid.filter((s) => !isNaN(s.relative_error) && isFinite(s.relative_error)).map((s) => ({
                                x: s.aws_rainfall_mm,
                                y: s.relative_error * (s.error < 0 ? -1 : 1),
                            }))}
                            fill="#fb923c"
                            fillOpacity={0.7}
                            stroke="#7c2d12"
                            strokeWidth={0.5}
                        />
                    </ScatterChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}
