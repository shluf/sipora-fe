"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { api, type QPEMetadata, type BoundaryData, type AccumulationMode } from "@/lib/api";
import { useLocalStorage } from "@/lib/useLocalStorage";

interface QpeContextType {
    metadata: QPEMetadata | null;
    boundaries: BoundaryData | null;
    initLoading: boolean;
    error: string | null;
    loadInitial: () => Promise<void>;
    selectedArea: string;
    setSelectedArea: (val: string | ((prev: string) => string)) => void;
    startDate: string;
    setStartDate: (val: string | ((prev: string) => string)) => void;
    endDate: string;
    setEndDate: (val: string | ((prev: string) => string)) => void;
    accumulationMode: AccumulationMode;
    setAccumulationMode: (val: AccumulationMode | ((prev: AccumulationMode) => AccumulationMode)) => void;
    pointMode: boolean;
    setPointMode: (val: boolean | ((prev: boolean) => boolean)) => void;
    customPoint: { lat: number; lon: number } | null;
    setCustomPoint: (val: { lat: number; lon: number } | null | ((prev: { lat: number; lon: number } | null) => { lat: number; lon: number } | null)) => void;
    visualizeTrigger: number;
    triggerVisualize: () => void;
    sidebarPanelOpen: boolean;
    setSidebarPanelOpen: (val: boolean) => void;
}

const QpeContext = createContext<QpeContextType | undefined>(undefined);

export function QpeProvider({ children }: { children: ReactNode }) {
    const [metadata, setMetadata] = useState<QPEMetadata | null>(null);
    const [boundaries, setBoundaries] = useState<BoundaryData | null>(null);
    const [initLoading, setInitLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [visualizeTrigger, setVisualizeTrigger] = useState(0);
    const [sidebarPanelOpen, setSidebarPanelOpen] = useState(true);

    const triggerVisualize = useCallback(() => {
        setVisualizeTrigger(prev => prev + 1);
    }, []);

    // ── Persisted State ──
    const [selectedArea, setSelectedArea] = useLocalStorage("analytics_area", "");
    const [startDate, setStartDate] = useLocalStorage("analytics_startDate", "");
    const [endDate, setEndDate] = useLocalStorage("analytics_endDate", "");
    const [accumulationMode, setAccumulationMode] = useLocalStorage<AccumulationMode>("analytics_mode", "10min");
    const [pointMode, setPointMode] = useLocalStorage("analytics_pointMode", false);
    const [customPoint, setCustomPoint] = useLocalStorage<{ lat: number; lon: number } | null>("analytics_customPoint", null);

    const loadInitial = useCallback(async () => {
        setInitLoading(true);
        setError(null);
        try {
            const [meta, bounds] = await Promise.all([api.getMetadata(), api.getBoundaries()]);
            setMetadata(meta);
            setBoundaries(bounds);

            const minDate = meta.min_time.substring(0, 16);
            const maxDate = meta.max_time.substring(0, 16);

            if (!selectedArea && bounds.areas.length > 0) setSelectedArea(bounds.areas[0]);
            if (!startDate) setStartDate(minDate);
            if (!endDate) {
                const start = new Date(meta.min_time);
                start.setDate(start.getDate() + 1);
                const endStr = start.toISOString().substring(0, 16);
                setEndDate(endStr <= maxDate ? endStr : maxDate);
            }
        } catch (e) {
            setError(e instanceof Error ? e.message : "Failed to load initial data");
        } finally {
            setInitLoading(false);
        }
    }, [selectedArea, startDate, endDate, setSelectedArea, setStartDate, setEndDate]);

    useEffect(() => { loadInitial(); }, [loadInitial]);

    const value = {
        metadata, boundaries, initLoading, error, loadInitial,
        selectedArea, setSelectedArea,
        startDate, setStartDate,
        endDate, setEndDate,
        accumulationMode, setAccumulationMode,
        pointMode, setPointMode,
        customPoint, setCustomPoint,
        visualizeTrigger, triggerVisualize,
        sidebarPanelOpen, setSidebarPanelOpen,
    };

    return (
        <QpeContext.Provider value={value}>
            {children}
        </QpeContext.Provider>
    );
}

export function useQpeContext() {
    const context = useContext(QpeContext);
    if (context === undefined) {
        throw new Error("useQpeContext must be used within a QpeProvider");
    }
    return context;
}
