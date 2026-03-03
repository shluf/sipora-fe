"use client";

import { useEffect, useRef, useCallback } from "react";

const DB_NAME = "sipora_qpe_db";
const STORE_NAME = "validation_files";
const FILE_KEY = "aws_csv";
const DB_VERSION = 1;

function openDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
        const req = indexedDB.open(DB_NAME, DB_VERSION);
        req.onupgradeneeded = () => {
            req.result.createObjectStore(STORE_NAME);
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
    });
}

function idbGet(db: IDBDatabase, key: string): Promise<File | undefined> {
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, "readonly");
        const req = tx.objectStore(STORE_NAME).get(key);
        req.onsuccess = () => resolve(req.result as File | undefined);
        req.onerror = () => reject(req.error);
    });
}

function idbPut(db: IDBDatabase, key: string, value: File): Promise<void> {
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, "readwrite");
        const req = tx.objectStore(STORE_NAME).put(value, key);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
    });
}

function idbDelete(db: IDBDatabase, key: string): Promise<void> {
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, "readwrite");
        const req = tx.objectStore(STORE_NAME).delete(key);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
    });
}

/**
 * Hook to persist a File object across page refreshes using IndexedDB.
 * Returns helpers to save, clear, and restore a file.
 */
export function useFileIndexedDB(onRestored: (file: File) => void) {
    const dbRef = useRef<IDBDatabase | null>(null);

    // Open DB and restore file on mount
    useEffect(() => {
        let cancelled = false;
        openDB().then((db) => {
            if (cancelled) return;
            dbRef.current = db;
            return idbGet(db, FILE_KEY);
        }).then((file) => {
            if (cancelled || !file) return;
            onRestored(file);
        }).catch((err) => {
            console.warn("[useFileIndexedDB] restore failed:", err);
        });
        return () => { cancelled = true; };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const saveFile = useCallback(async (file: File | null) => {
        if (!dbRef.current) return;
        try {
            if (file) {
                await idbPut(dbRef.current, FILE_KEY, file);
            } else {
                await idbDelete(dbRef.current, FILE_KEY);
            }
        } catch (err) {
            console.warn("[useFileIndexedDB] save failed:", err);
        }
    }, []);

    const clearFile = useCallback(async () => {
        if (!dbRef.current) return;
        try {
            await idbDelete(dbRef.current, FILE_KEY);
        } catch (err) {
            console.warn("[useFileIndexedDB] clear failed:", err);
        }
    }, []);

    return { saveFile, clearFile };
}
