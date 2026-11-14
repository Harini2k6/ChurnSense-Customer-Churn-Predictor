"use client";

import { useCallback, useEffect, useState } from "react";
import { apiGet, cachedGet } from "./api";

/**
 * Fetch `path` from the backend and track loading / error / "waking up" state.
 * Pass path = null to skip. Set cache = true for data that never changes.
 */
export function useApi(path, { cache = false } = {}) {
  const [state, setState] = useState({ data: null, error: "", loading: !!path });
  const [retrying, setRetrying] = useState(0);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!path) {
      setState({ data: null, error: "", loading: false });
      return;
    }

    const controller = new AbortController();
    setState((prev) => ({ ...prev, error: "", loading: true }));
    setRetrying(0);

    const load = cache ? cachedGet : apiGet;
    load(path, { signal: controller.signal, onRetry: setRetrying })
      .then((data) => setState({ data, error: "", loading: false }))
      .catch((error) => {
        if (error?.name === "AbortError") return;
        setState({ data: null, error: error.message, loading: false });
      });

    return () => controller.abort();
  }, [path, cache, reloadKey]);

  const reload = useCallback(() => setReloadKey((k) => k + 1), []);

  return { ...state, retrying, reload };
}
