"use client";

import { useState, useEffect, useRef, useCallback } from "react";

const PREFIX = "sipora_v1_";
const MAX_SIZE = 2 * 1024 * 1024; // 2MB guard

export function useLocalStorage<T>(key: string, defaultValue: T): [T, (v: T | ((prev: T) => T)) => void] {
    const prefixedKey = PREFIX + key;

    const [value, setValue] = useState<T>(() => {
        if (typeof window === "undefined") return defaultValue;
        try {
            const stored = localStorage.getItem(prefixedKey);
            return stored ? (JSON.parse(stored) as T) : defaultValue;
        } catch {
            return defaultValue;
        }
    });

    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Debounced write to localStorage
    useEffect(() => {
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => {
            try {
                const json = JSON.stringify(value);
                if (json.length <= MAX_SIZE) {
                    localStorage.setItem(prefixedKey, json);
                }
            } catch {
                // quota exceeded or serialization error — silently skip
            }
        }, 500);
        return () => {
            if (timerRef.current) clearTimeout(timerRef.current);
        };
    }, [value, prefixedKey]);

    const set = useCallback((v: T | ((prev: T) => T)) => {
        setValue(v);
    }, []);

    return [value, set];
}
