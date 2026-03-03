"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronLeft, ChevronRight, Calendar, Clock, Check, X } from "lucide-react";

interface CustomDatePickerProps {
    initialDate: Date;
    onSelect: (date: Date) => void;
    onClose: () => void;
}

export default function CustomDatePicker({ initialDate, onSelect, onClose }: CustomDatePickerProps) {
    const [viewDate, setViewDate] = useState(new Date(initialDate));
    const [selectedDate, setSelectedDate] = useState(new Date(initialDate));

    const [hours, setHours] = useState(initialDate.getHours().toString().padStart(2, "0"));
    const [minutes, setMinutes] = useState(initialDate.getMinutes().toString().padStart(2, "0"));

    const popoverRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
                onClose();
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [onClose]);

    const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
    const getFirstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const daysInMonth = getDaysInMonth(year, month);
    const firstDay = getFirstDayOfMonth(year, month);

    const days = [];
    for (let i = 0; i < firstDay; i++) days.push(null);
    for (let i = 1; i <= daysInMonth; i++) days.push(new Date(year, month, i));

    const handlePrevMonth = () => setViewDate(new Date(year, month - 1, 1));
    const handleNextMonth = () => setViewDate(new Date(year, month + 1, 1));

    const handleApply = () => {
        const h = parseInt(hours) || 0;
        const m = parseInt(minutes) || 0;
        const newDate = new Date(selectedDate);
        newDate.setHours(h);
        newDate.setMinutes(m);
        onSelect(newDate);
    };

    return (
        <div
            ref={popoverRef}
            style={{
                position: "absolute", top: "100%", left: 0, marginTop: 8,
                background: "var(--card)", border: "1px solid var(--border)",
                borderRadius: "var(--radius)", boxShadow: "var(--shadow-lg)",
                padding: "1rem", zIndex: 10000, color: "var(--foreground)",
                width: 280, display: "flex", flexDirection: "column", gap: 16
            }}
        >
            {/* Header / Month Nav */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <button
                    onClick={handlePrevMonth}
                    style={{ background: "transparent", border: "1px solid var(--border)", borderRadius: 6, width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "var(--foreground)" }}
                >
                    <ChevronLeft size={14} />
                </button>
                <div style={{ fontSize: "0.875rem", fontWeight: 600 }}>
                    {viewDate.toLocaleString("id-ID", { month: "long", year: "numeric" })}
                </div>
                <button
                    onClick={handleNextMonth}
                    style={{ background: "transparent", border: "1px solid var(--border)", borderRadius: 6, width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "var(--foreground)" }}
                >
                    <ChevronRight size={14} />
                </button>
            </div>

            {/* Calendar Grid */}
            <div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", marginBottom: 8, textAlign: "center", fontSize: "0.75rem", color: "var(--muted-foreground)", fontWeight: 600 }}>
                    {["M", "S", "S", "R", "K", "J", "S"].map((d, i) => <div key={i}>{d}</div>)}
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4 }}>
                    {days.map((d, i) => {
                        if (!d) return <div key={i} />;
                        const isSelected = selectedDate.getDate() === d.getDate() && selectedDate.getMonth() === d.getMonth() && selectedDate.getFullYear() === d.getFullYear();
                        return (
                            <button
                                key={i}
                                onClick={() => setSelectedDate(d)}
                                style={{
                                    height: 32,
                                    background: isSelected ? "var(--primary)" : "transparent",
                                    color: isSelected ? "white" : "var(--foreground)",
                                    border: "none", borderRadius: 6, cursor: "pointer", fontSize: "0.8125rem",
                                    display: "flex", alignItems: "center", justifyContent: "center",
                                    fontWeight: isSelected ? 600 : 400
                                }}
                                onMouseOver={e => { if (!isSelected) e.currentTarget.style.background = "var(--muted)"; }}
                                onMouseOut={e => { if (!isSelected) e.currentTarget.style.background = "transparent"; }}
                            >
                                {d.getDate()}
                            </button>
                        );
                    })}
                </div>
            </div>

            <div style={{ height: 1, background: "var(--border)" }} />

            {/* Time Selector */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: "0.8125rem" }}>
                    <Clock size={14} style={{ color: "var(--muted-foreground)" }} />
                    <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                        <input
                            type="number" min="0" max="23"
                            value={hours} onChange={e => setHours(e.target.value)}
                            style={{ width: 40, textAlign: "center", background: "var(--background)", border: "1px solid var(--border)", borderRadius: 6, padding: "4px 0", color: "var(--foreground)", outline: "none" }}
                        />
                        <span>:</span>
                        <input
                            type="number" min="0" max="59"
                            value={minutes} onChange={e => setMinutes(e.target.value)}
                            style={{ width: 40, textAlign: "center", background: "var(--background)", border: "1px solid var(--border)", borderRadius: 6, padding: "4px 0", color: "var(--foreground)", outline: "none" }}
                        />
                    </div>
                </div>

                <div style={{ display: "flex", gap: 6 }}>
                    <button onClick={onClose} style={{ background: "transparent", border: "1px solid var(--border)", borderRadius: 6, width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "var(--muted-foreground)" }}>
                        <X size={14} />
                    </button>
                    <button onClick={handleApply} style={{ background: "var(--primary)", border: "none", borderRadius: 6, width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "white" }}>
                        <Check size={14} />
                    </button>
                </div>
            </div>
        </div>
    );
}
