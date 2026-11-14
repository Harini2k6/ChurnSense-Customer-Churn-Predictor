// All communication with the Python (FastAPI) backend lives in this file.
//
// The backend address comes from the NEXT_PUBLIC_API_URL environment variable:
//   - on your laptop it falls back to http://127.0.0.1:8000
//   - on Vercel you set it to your Render URL (see DEPLOY.md)

export const API_BASE = (
  process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000"
).replace(/\/+$/, "");

export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

function sleep(ms, signal) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener("abort", () => {
      clearTimeout(timer);
      reject(new DOMException("Aborted", "AbortError"));
    });
  });
}

/**
 * GET JSON from the backend.
 * - 4xx errors (e.g. "Customer not found") are returned immediately.
 * - Network errors / 5xx (e.g. a free Render server that is still waking up)
 *   are retried a few times; `onRetry(attempt)` lets the screen say so.
 */
export async function apiGet(path, { signal, onRetry, retries = 4 } = {}) {
  let lastError;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await fetch(`${API_BASE}${path}`, {
        signal,
        headers: { Accept: "application/json" },
      });

      if (!response.ok) {
        let detail = `Request failed (${response.status})`;
        try {
          const body = await response.json();
          if (body?.detail) detail = String(body.detail);
        } catch {
          /* response had no JSON body */
        }
        throw new ApiError(detail, response.status);
      }

      return await response.json();
    } catch (error) {
      if (error?.name === "AbortError") throw error;
      if (error instanceof ApiError && error.status < 500) throw error;

      lastError = error;
      if (attempt < retries) {
        onRetry?.(attempt + 1);
        await sleep(3500, signal);
      }
    }
  }

  if (lastError instanceof ApiError) throw lastError;
  throw new ApiError(
    "Cannot reach the prediction server. Check that the backend is running.",
    0
  );
}

// Small in-memory cache for data that never changes while the app is open
// (dashboard statistics, model information).
const cache = new Map();

export async function cachedGet(path, options) {
  if (cache.has(path)) return cache.get(path);
  const data = await apiGet(path, options);
  cache.set(path, data);
  return data;
}

export function clearCache() {
  cache.clear();
}

export function buildQuery(params) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== "" && value !== null && value !== undefined) {
      search.set(key, String(value));
    }
  });
  const text = search.toString();
  return text ? `?${text}` : "";
}
