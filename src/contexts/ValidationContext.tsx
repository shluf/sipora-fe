"use client";

import { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import { validationApi, type ValidationResult, type ValidationParams, type BiasCorrectResult, type CorrectionMethod } from "@/lib/api";
import { useLocalStorage } from "@/lib/useLocalStorage";
import { useFileIndexedDB } from "@/lib/useFileIndexedDB";

// Today's date in YYYY-MM-DD for FTP date picker default/max
function todayIso() {
    return new Date().toISOString().slice(0, 10);
}

interface ValidationContextValue {
    // File (manual upload)
    validationFile: File | null;
    setValidationFile: (file: File | null) => void;
    // Params
    validationParams: ValidationParams;
    setValidationParams: (params: ValidationParams) => void;
    // Process state (upload)
    validationLoading: boolean;
    validationError: string | null;
    setValidationError: (err: string | null) => void;
    // Result
    validationResult: ValidationResult | null;
    setValidationResult: (result: ValidationResult | null) => void;
    // Action (upload)
    handleValidationProcess: () => Promise<void>;
    // FTP
    ftpDate: string;
    setFtpDate: (date: string) => void;
    ftpLoading: boolean;
    ftpError: string | null;
    setFtpError: (err: string | null) => void;
    handleFtpProcess: () => Promise<void>;
    // Bias Correction
    correctionMethod: CorrectionMethod;
    setCorrectionMethod: (method: CorrectionMethod) => void;
    correctionLoading: boolean;
    correctionError: string | null;
    setCorrectionError: (err: string | null) => void;
    correctionResult: BiasCorrectResult | null;
    setCorrectionResult: (result: BiasCorrectResult | null) => void;
    handleBiasCorrection: () => Promise<void>;
}

const ValidationContext = createContext<ValidationContextValue | null>(null);

export function ValidationProvider({ children }: { children: ReactNode }) {
    const [validationFile, _setValidationFile] = useState<File | null>(null);
    const [validationLoading, setValidationLoading] = useState(false);
    const [validationError, setValidationError] = useState<string | null>(null);

    // Persist file across refreshes via IndexedDB
    const { saveFile } = useFileIndexedDB((restoredFile) => {
        _setValidationFile(restoredFile);
    });

    const setValidationFile = useCallback((file: File | null) => {
        _setValidationFile(file);
        saveFile(file);
    }, [saveFile]);

    const [validationResult, setValidationResult] = useLocalStorage<ValidationResult | null>(
        "validation_result",
        null,
    );
    const [validationParams, setValidationParams] = useLocalStorage<ValidationParams>(
        "validation_params",
        {
            coverage_threshold: 50,
            max_distance: 150,
            outlier_method: "iqr",
            outlier_threshold: 1.5,
        },
    );

    const handleValidationProcess = useCallback(async () => {
        if (!validationFile) return;
        setValidationLoading(true);
        setValidationError(null);
        try {
            const data = await validationApi.processValidation(validationFile, validationParams);
            if (!data.ok) {
                setValidationError(data.error || "Gagal memproses data");
                setValidationResult(null);
            } else {
                setValidationResult(data);
                if (data.warning) setValidationError(data.warning);
            }
        } catch (e) {
            setValidationError(e instanceof Error ? e.message : "Terjadi kesalahan");
            setValidationResult(null);
        } finally {
            setValidationLoading(false);
        }
    }, [validationFile, validationParams, setValidationResult]);

    // ── FTP state ──────────────────────────────────────
    const [ftpDate, setFtpDate] = useState<string>(todayIso());
    const [ftpLoading, setFtpLoading] = useState(false);
    const [ftpError, setFtpError] = useState<string | null>(null);

    const handleFtpProcess = useCallback(async () => {
        if (!ftpDate) return;
        setFtpLoading(true);
        setFtpError(null);
        setValidationError(null);
        try {
            const data = await validationApi.processFtp(ftpDate, validationParams);
            if (!data.ok) {
                setFtpError(data.error || "Gagal memproses data dari FTP");
                setValidationResult(null);
            } else {
                setValidationResult(data);
                if (data.warning) setFtpError(data.warning);
            }
        } catch (e) {
            setFtpError(e instanceof Error ? e.message : "Terjadi kesalahan saat download FTP");
            setValidationResult(null);
        } finally {
            setFtpLoading(false);
        }
    }, [ftpDate, validationParams, setValidationResult]);

    // ── Bias Correction state ──────────────────────────
    const [correctionMethod, setCorrectionMethod] = useState<CorrectionMethod>("mean_field");
    const [correctionLoading, setCorrectionLoading] = useState(false);
    const [correctionError, setCorrectionError] = useState<string | null>(null);
    const [correctionResult, setCorrectionResult] = useState<BiasCorrectResult | null>(null);

    const handleBiasCorrection = useCallback(async () => {
        if (!validationFile) return;
        setCorrectionLoading(true);
        setCorrectionError(null);
        try {
            const data = await validationApi.applyBiasCorrection(validationFile, validationParams, correctionMethod);
            if (!data.ok) {
                setCorrectionError(data.error || "Gagal menghitung koreksi bias");
                setCorrectionResult(null);
            } else {
                setCorrectionResult(data);
            }
        } catch (e) {
            setCorrectionError(e instanceof Error ? e.message : "Terjadi kesalahan");
            setCorrectionResult(null);
        } finally {
            setCorrectionLoading(false);
        }
    }, [validationFile, validationParams, correctionMethod]);

    return (
        <ValidationContext.Provider
            value={{
                validationFile,
                setValidationFile,
                validationParams,
                setValidationParams,
                validationLoading,
                validationError,
                setValidationError,
                validationResult,
                setValidationResult,
                handleValidationProcess,
                ftpDate,
                setFtpDate,
                ftpLoading,
                ftpError,
                setFtpError,
                handleFtpProcess,
                correctionMethod,
                setCorrectionMethod,
                correctionLoading,
                correctionError,
                setCorrectionError,
                correctionResult,
                setCorrectionResult,
                handleBiasCorrection,
            }}
        >
            {children}
        </ValidationContext.Provider>
    );
}

export function useValidationContext() {
    const ctx = useContext(ValidationContext);
    if (!ctx) throw new Error("useValidationContext must be used within ValidationProvider");
    return ctx;
}
