const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export type AccumulationMode = "10min" | "hourly" | "daily";

export interface QPEMetadata {
  min_time: string;
  max_time: string;
  n_timesteps: number;
  grid_y: number;
  grid_x: number;
  resolution_m: number;
  timestamps: string[];
}

export interface ZonalSummary {
  total_accum: number;
  avg_intensity: number;
  avg_intensity_mm_h: number;
  max_intensity: number;
  peak_time: string;
  dominant_class: string;
}

export interface IntensityDistItem {
  label: string;
  count: number;
  color: string;
}

export interface TimeseriesRecord {
  waktu: string;
  mean_qpe: number;
  max_qpe: number;
  min_qpe: number;
  std_qpe: number;
  accum_mean: number;
  accum_max: number;
  intensity: string;
}

export interface ZonalData {
  area: string;
  start: string;
  end: string;
  mode?: AccumulationMode;
  summary: ZonalSummary;
  distribution: IntensityDistItem[];
  timeseries: TimeseriesRecord[];
}

export interface BoundaryData {
  areas: string[];
  kecamatan: Record<string, string[]>;
  geojson: object;
}

export interface SpatialData {
  timestamp: string;
  image_base64: string;
  content_type: string;
  bounds: [[number, number], [number, number]];
  legend: {
    colors: string[];
    values: number[];
  };
}

async function apiFetch<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`);
  if (!res.ok) {
    throw new Error(`API Error: ${res.status} ${res.statusText}`);
  }
  const json = await res.json();
  if (json.ok === false) {
    throw new Error(json.error?.message || "Unknown API error");
  }
  return json.data as T;
}

export const api = {
  getMetadata: () => apiFetch<QPEMetadata>("/api/qpe/metadata"),
  getBoundaries: () => apiFetch<BoundaryData>("/api/qpe/boundaries"),
  getZonalStats: (area: string, start: string, end: string, level: string = "kabupaten", mode: AccumulationMode = "10min") =>
    apiFetch<ZonalData>(`/api/qpe/zonal?area=${encodeURIComponent(area)}&start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}&level=${encodeURIComponent(level)}&mode=${mode}`),
  getPointStats: (lat: number, lon: number, start: string, end: string, mode: AccumulationMode = "10min") =>
    apiFetch<ZonalData>(`/api/qpe/point?lat=${lat}&lon=${lon}&start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}&mode=${mode}`),
  getSpatial: (timestamp: string, layer: string = "qpe", mode: AccumulationMode = "10min") =>
    apiFetch<SpatialData>(`/api/qpe/spatial?timestamp=${encodeURIComponent(timestamp)}&dbz=${layer === "dbz"}&mode=${mode}`),
  getExportUrl: (format: "csv" | "excel" | "json", area: string, start: string, end: string, options?: { level?: string; lat?: number; lon?: number; mode?: AccumulationMode }) => {
    let url = `${API_BASE}/api/export/${format}?area=${encodeURIComponent(area)}&start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`;
    if (options?.level && options.level !== "kabupaten") {
      url += `&level=${encodeURIComponent(options.level)}`;
    }
    if (options?.lat != null && options?.lon != null) {
      url += `&lat=${options.lat}&lon=${options.lon}`;
    }
    if (options?.mode && options.mode !== "10min") {
      url += `&mode=${options.mode}`;
    }
    return url;
  },
};

export const longsorApi = {
  getMetadata: () => apiFetch<QPEMetadata>("/api/longsor/metadata"),
  getBoundaries: () => apiFetch<BoundaryData>("/api/longsor/boundaries"),
  getZonalStats: (area: string, start: string, end: string, level: string = "kabupaten", mode: AccumulationMode = "10min") =>
    apiFetch<ZonalData>(`/api/longsor/zonal?area=${encodeURIComponent(area)}&start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}&level=${encodeURIComponent(level)}&mode=${mode}`),
  getPointStats: (lat: number, lon: number, start: string, end: string, mode: AccumulationMode = "10min") =>
    apiFetch<ZonalData>(`/api/longsor/point?lat=${lat}&lon=${lon}&start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}&mode=${mode}`),
  getSpatial: (timestamp: string, layer: string = "qpe", mode: AccumulationMode = "10min") =>
    apiFetch<SpatialData>(`/api/longsor/spatial?timestamp=${encodeURIComponent(timestamp)}&layer=${layer}&mode=${mode}`),
  getExportUrl: (format: "csv" | "excel" | "json", area: string, start: string, end: string, options?: { level?: string; lat?: number; lon?: number; mode?: AccumulationMode }) => {
    // Reusing the general export url might require changing the export router to support longsor as a source, but for now we will just use the same export url or create a specific one if implemented later. The current export API only targets QPE.
    let url = `${API_BASE}/api/export/${format}?area=${encodeURIComponent(area)}&start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}&source=longsor`;
    if (options?.level && options.level !== "kabupaten") {
      url += `&level=${encodeURIComponent(options.level)}`;
    }
    if (options?.lat != null && options?.lon != null) {
      url += `&lat=${options.lat}&lon=${options.lon}`;
    }
    if (options?.mode && options.mode !== "10min") {
      url += `&mode=${options.mode}`;
    }
    return url;
  },
};

// ── Validation Types ──────────────────────────────────

export interface ValidationMetrics {
  n: number;
  valid: boolean;
  bias?: number;
  rmse?: number;
  mae?: number;
  mape?: number | null;
  correlation?: number;
  r2?: number;
  std_obs?: number;
  std_pred?: number;
  slope?: number;
  intercept?: number;
}

export interface ValidationStation {
  station_name: string;
  latitude: number;
  longitude: number;
  aws_rainfall_mm: number;
  qpe_accumulation_mm: number;
  coverage_pct: number;
  n_valid_timesteps: number;
  timestamp: string;
  distance_km: number;
  azimuth_deg: number;
  error: number;
  abs_error: number;
  relative_error: number;
  is_outlier: boolean;
}

export interface ErrorHistogramBin {
  bin_start: number;
  bin_end: number;
  bin_center: number;
  count: number;
}

export interface DistanceErrorStat {
  category: string;
  min: number;
  q1: number;
  median: number;
  q3: number;
  max: number;
  mean: number;
  count: number;
}

export interface StationStat {
  station_name: string;
  aws_rainfall_mm_mean: number;
  aws_rainfall_mm_std: number;
  qpe_accumulation_mm_mean: number;
  qpe_accumulation_mm_std: number;
  distance_km_mean: number;
  is_outlier_sum: number;
}

export interface RadarConfig {
  name: string;
  lat: number;
  lon: number;
  max_range_km: number;
  beam_width: number;
}

export interface ValidationResult {
  ok: boolean;
  error?: string;
  warning?: string;
  zarr_loaded?: boolean;
  zarr_info?: { start: string; end: string; n_timesteps: number };
  n_stations: number;
  stations: ValidationStation[];
  metrics: ValidationMetrics;
  station_stats?: StationStat[];
  error_histogram?: ErrorHistogramBin[];
  distance_error_stats?: DistanceErrorStat[];
  recommendations?: string[];
  radar: RadarConfig;
  parameters?: {
    coverage_threshold: number;
    max_distance: number;
    outlier_method: string;
    outlier_threshold: number;
  };
}

export interface ValidationParams {
  coverage_threshold: number;
  max_distance: number;
  outlier_method: string;
  outlier_threshold: number;
}

// ── Bias Correction Types ─────────────────────────────

export type CorrectionMethod = "mean_field" | "regression" | "additive";

export interface CorrectionInfo {
  method: string;
  bias_ratio?: number;
  mean_qpe_before?: number;
  mean_aws?: number;
  slope?: number;
  intercept?: number;
  bias_removed?: number;
}

export interface CorrectedStation extends ValidationStation {
  qpe_corrected_mm: number;
  error_corrected: number;
  abs_error_corrected: number;
}

export interface BiasCorrectResult {
  ok: boolean;
  error?: string;
  method: string;
  correction_info: CorrectionInfo;
  n_stations: number;
  stations: CorrectedStation[];
  corrected_metrics: ValidationMetrics;
  original_metrics: ValidationMetrics;
  radar: RadarConfig;
}

export const validationApi = {
  processValidation: async (file: File, params: ValidationParams): Promise<ValidationResult> => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("coverage_threshold", String(params.coverage_threshold));
    formData.append("max_distance", String(params.max_distance));
    formData.append("outlier_method", params.outlier_method);
    formData.append("outlier_threshold", String(params.outlier_threshold));

    const res = await fetch(`${API_BASE}/api/validation/process`, { method: "POST", body: formData });
    if (!res.ok) throw new Error(`API Error: ${res.status} ${res.statusText}`);
    return res.json();
  },

  applyBiasCorrection: async (
    file: File,
    params: ValidationParams,
    correctionMethod: CorrectionMethod,
  ): Promise<BiasCorrectResult> => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("coverage_threshold", String(params.coverage_threshold));
    formData.append("max_distance", String(params.max_distance));
    formData.append("outlier_method", params.outlier_method);
    formData.append("outlier_threshold", String(params.outlier_threshold));
    formData.append("correction_method", correctionMethod);

    const res = await fetch(`${API_BASE}/api/validation/correct`, { method: "POST", body: formData });
    if (!res.ok) throw new Error(`API Error: ${res.status} ${res.statusText}`);
    return res.json();
  },

  processFtp: async (targetDate: string, params: ValidationParams): Promise<ValidationResult> => {
    const formData = new FormData();
    formData.append("target_date", targetDate);
    formData.append("coverage_threshold", String(params.coverage_threshold));
    formData.append("max_distance", String(params.max_distance));
    formData.append("outlier_method", params.outlier_method);
    formData.append("outlier_threshold", String(params.outlier_threshold));

    const res = await fetch(`${API_BASE}/api/validation/process-ftp`, { method: "POST", body: formData });
    if (!res.ok) {
      // Try to extract detail message from FastAPI error
      let detail = `API Error: ${res.status} ${res.statusText}`;
      try {
        const errBody = await res.json();
        if (errBody.detail) detail = errBody.detail;
      } catch { /* ignore */ }
      throw new Error(detail);
    }
    return res.json();
  },

  getExportCsvUrl: () => `${API_BASE}/api/validation/export/csv`,
  getExportJsonUrl: () => `${API_BASE}/api/validation/export/json`,
};

