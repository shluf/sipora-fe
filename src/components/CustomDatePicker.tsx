"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronLeft, ChevronRight, Clock, Check, X } from "lucide-react";

interface SingleProps {
    mode?: "single";
    initialDate: Date;
    onSelect: (date: Date) => void;
    onClose: () => void;
}

interface RangeProps {
    mode: "range";
    initialDate: Date;
    initialEndDate?: Date;
    onSelectRange: (start: Date, end: Date) => void;
    onClose: () => void;
}

type CustomDatePickerProps = SingleProps | RangeProps;

export default function CustomDatePicker(props: CustomDatePickerProps) {
    const isRange = props.mode === "range";
    const [viewDate, setViewDate] = useState(new Date(props.initialDate));
    const [selectedStart, setSelectedStart] = useState(new Date(props.initialDate));
    const [selectedEnd, setSelectedEnd] = useState<Date | null>(
        isRange && (props as RangeProps).initialEndDate ? new Date((props as RangeProps).initialEndDate!) : null
    );
    const [hoveredDay, setHoveredDay] = useState<Date | null>(null);
    // phase: "start" | "end" for range picking
    const [phase, setPhase] = useState<"start" | "end">(isRange && (props as RangeProps).initialEndDate ? "end" : "start");

    const [hours, setHours] = useState(props.initialDate.getHours().toString().padStart(2, "0"));
    const [minutes, setMinutes] = useState(props.initialDate.getMinutes().toString().padStart(2, "0"));
    const [endHours, setEndHours] = useState(
        isRange && (props as RangeProps).initialEndDate
            ? (props as RangeProps).initialEndDate!.getHours().toString().padStart(2, "0")
            : "23"
    );
    const [endMinutes, setEndMinutes] = useState(
        isRange && (props as RangeProps).initialEndDate
            ? (props as RangeProps).initialEndDate!.getMinutes().toString().padStart(2, "0")
            : "00"
    );

    const popoverRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
                props.onClose();
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [props.onClose]);

    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDay = new Date(year, month, 1).getDay();

    const days: (Date | null)[] = [];
    for (let i = 0; i < firstDay; i++) days.push(null);
    for (let i = 1; i <= daysInMonth; i++) days.push(new Date(year, month, i));

    const isSameDay = (a: Date, b: Date) =>
        a.getDate() === b.getDate() && a.getMonth() === b.getMonth() && a.getFullYear() === b.getFullYear();

    const isInRange = (d: Date) => {
        if (!isRange) return false;
        const end = selectedEnd ?? hoveredDay;
        if (!end) return false;
        const [lo, hi] = selectedStart <= end ? [selectedStart, end] : [end, selectedStart];
        return d >= lo && d <= hi;
    };

    const handleDayClick = (d: Date) => {
        if (!isRange) {
            setSelectedStart(d);
            return;
        }
        if (phase === "start") {
            setSelectedStart(d);
            setSelectedEnd(null);
            setPhase("end");
        } else {
            // Ensure start < end
            if (d < selectedStart) {
                setSelectedEnd(selectedStart);
                setSelectedStart(d);
            } else {
                setSelectedEnd(d);
            }
            setPhase("start");
        }
    };

    const handleApply = () => {
        if (isRange) {
            const start = new Date(selectedStart);
            start.setHours(parseInt(hours) || 0, parseInt(minutes) || 0, 0, 0);
            const end = new Date(selectedEnd ?? selectedStart);
            end.setHours(parseInt(endHours) || 23, parseInt(endMinutes) || 0, 0, 0);
            (props as RangeProps).onSelectRange(start, end);
        } else {
            const d = new Date(selectedStart);
            d.setHours(parseInt(hours) || 0, parseInt(minutes) || 0, 0, 0);
            (props as SingleProps).onSelect(d);
        }
    };

    const calWidth = isRange ? 320 : 280;

    const dayStyle = (d: Date): React.CSSProperties => {
        const isStart = isSameDay(d, selectedStart);
        const isEnd = selectedEnd && isSameDay(d, selectedEnd);
        const inRange = isRange && isInRange(d);
        return {
            height: 32,
            background: isStart || isEnd ? "var(--primary)" : inRange ? "var(--primary)30" : "transparent",
            color: isStart || isEnd ? "white" : "var(--foreground)",
            border: "none",
            borderRadius: isStart ? "6px 0 0 6px" : isEnd ? "0 6px 6px 0" : inRange ? 0 : 6,
            cursor: "pointer",
            fontSize: "0.8125rem",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontWeight: isStart || isEnd ? 700 : 400,
            width: "100%",
        };
    };

    return (
        <div
            ref={popoverRef}
            style={{
                position: "absolute", top: "100%", left: 0, marginTop: 8,
                background: "var(--card)", border: "1px solid var(--border)",
                borderRadius: "var(--radius)", boxShadow: "var(--shadow-lg)",
                padding: "1rem", zIndex: 10000, color: "var(--foreground)",
                width: calWidth, display: "flex", flexDirection: "column", gap: 16,
            }}
        >
            {/* Range status hint */}
            {isRange && (
                <div style={{ fontSize: "0.6875rem", fontWeight: 600, display: "flex", gap: 8 }}>
                    <span style={{ color: phase === "start" ? "var(--primary)" : "var(--muted-foreground)" }}>
                        ● Mulai{selectedStart ? `: ${selectedStart.toLocaleDateString("id-ID")}` : ""}
                    </span>
                    <span style={{ color: phase === "end" ? "var(--primary)" : "var(--muted-foreground)" }}>
                        ● Selesai{selectedEnd ? `: ${selectedEnd.toLocaleDateString("id-ID")}` : " (belum dipilih)"}
                    </span>
                </div>
            )}

            {/* Header / Month Nav */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <button onClick={() => setViewDate(new Date(year, month - 1, 1))} style={{ background: "transparent", border: "1px solid var(--border)", borderRadius: 6, width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "var(--foreground)" }}>
                    <ChevronLeft size={14} />
                </button>
                <div style={{ fontSize: "0.875rem", fontWeight: 600 }}>
                    {viewDate.toLocaleString("id-ID", { month: "long", year: "numeric" })}
                </div>
                <button onClick={() => setViewDate(new Date(year, month + 1, 1))} style={{ background: "transparent", border: "1px solid var(--border)", borderRadius: 6, width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "var(--foreground)" }}>
                    <ChevronRight size={14} />
                </button>
            </div>

            {/* Calendar Grid */}
            <div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", marginBottom: 8, textAlign: "center", fontSize: "0.75rem", color: "var(--muted-foreground)", fontWeight: 600 }}>
                    {["M", "S", "S", "R", "K", "J", "S"].map((d, i) => <div key={i}>{d}</div>)}
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 2 }}>
                    {days.map((d, i) => {
                        if (!d) return <div key={i} />;
                        return (
                            <button
                                key={i}
                                onClick={() => handleDayClick(d)}
                                onMouseEnter={() => isRange && phase === "end" && setHoveredDay(d)}
                                onMouseLeave={() => setHoveredDay(null)}
                                style={dayStyle(d)}
                            >
                                {d.getDate()}
                            </button>
                        );
                    })}
                </div>
            </div>

            <div style={{ height: 1, background: "var(--border)" }} />

            {/* Time Selector */}
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {/* Start time */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, fontSize: "0.8125rem" }}>
                    <span style={{ color: "var(--muted-foreground)", minWidth: isRange ? 40 : "auto" }}>
                        {isRange ? "Mulai" : "Waktu"}
                    </span>
                    <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                        <input type="number" min="0" max="23" value={hours} onChange={e => setHours(e.target.value)}
                            style={{ width: 40, textAlign: "center", background: "var(--background)", border: "1px solid var(--border)", borderRadius: 6, padding: "4px 0", color: "var(--foreground)", outline: "none" }} />
                        <span>:</span>
                        <input type="number" min="0" max="59" value={minutes} onChange={e => setMinutes(e.target.value)}
                            style={{ width: 40, textAlign: "center", background: "var(--background)", border: "1px solid var(--border)", borderRadius: 6, padding: "4px 0", color: "var(--foreground)", outline: "none" }} />
                    </div>
                    {!isRange && (
                        <div style={{ display: "flex", gap: 6 }}>
                            <button onClick={props.onClose} style={{ background: "transparent", border: "1px solid var(--border)", borderRadius: 6, width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "var(--muted-foreground)" }}>
                                <X size={14} />
                            </button>
                            <button onClick={handleApply} style={{ background: "var(--primary)", border: "none", borderRadius: 6, width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "white" }}>
                                <Check size={14} />
                            </button>
                        </div>
                    )}
                </div>

                {/* End time (range only) */}
                {isRange && (
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, fontSize: "0.8125rem" }}>
                        <span style={{ color: "var(--muted-foreground)", minWidth: 40 }}>Selesai</span>
                        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                            <input type="number" min="0" max="23" value={endHours} onChange={e => setEndHours(e.target.value)}
                                style={{ width: 40, textAlign: "center", background: "var(--background)", border: "1px solid var(--border)", borderRadius: 6, padding: "4px 0", color: "var(--foreground)", outline: "none" }} />
                            <span>:</span>
                            <input type="number" min="0" max="59" value={endMinutes} onChange={e => setEndMinutes(e.target.value)}
                                style={{ width: 40, textAlign: "center", background: "var(--background)", border: "1px solid var(--border)", borderRadius: 6, padding: "4px 0", color: "var(--foreground)", outline: "none" }} />
                        </div>
                        <div style={{ display: "flex", gap: 6 }}>
                            <button onClick={props.onClose} style={{ background: "transparent", border: "1px solid var(--border)", borderRadius: 6, width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "var(--muted-foreground)" }}>
                                <X size={14} />
                            </button>
                            <button onClick={handleApply} disabled={isRange && !selectedEnd} style={{ background: isRange && !selectedEnd ? "var(--muted)" : "var(--primary)", border: "none", borderRadius: 6, width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center", cursor: isRange && !selectedEnd ? "not-allowed" : "pointer", color: "white" }}>
                                <Check size={14} />
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
