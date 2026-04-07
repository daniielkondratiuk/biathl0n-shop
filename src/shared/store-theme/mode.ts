"use client";

import { useCallback, useMemo, useSyncExternalStore } from "react";

export type FrontstoreThemeMode = "theme_first" | "theme_secondary";

const STORAGE_KEY = "frontstore-theme-mode";
const DEFAULT_MODE: FrontstoreThemeMode = "theme_first";

function isFrontstoreThemeMode(value: unknown): value is FrontstoreThemeMode {
  return value === "theme_first" || value === "theme_secondary";
}

let currentMode: FrontstoreThemeMode = DEFAULT_MODE;
let initialized = false;
const listeners = new Set<() => void>();

function ensureInitialized(): void {
  if (initialized) return;
  if (typeof window === "undefined") return;
  initialized = true;

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    currentMode = isFrontstoreThemeMode(raw) ? raw : DEFAULT_MODE;
  } catch {
    currentMode = DEFAULT_MODE;
  }
}

export function useFrontstoreThemeMode(): {
  mounted: boolean;
  mode: FrontstoreThemeMode;
  setMode: (mode: FrontstoreThemeMode) => void;
  toggleMode: () => void;
  isSecondary: boolean;
} {
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  const mode = useSyncExternalStore(
    (onStoreChange) => {
      listeners.add(onStoreChange);
      return () => listeners.delete(onStoreChange);
    },
    () => {
      ensureInitialized();
      return currentMode;
    },
    () => DEFAULT_MODE,
  );

  const setMode = useCallback((nextMode: FrontstoreThemeMode) => {
    ensureInitialized();
    currentMode = nextMode;
    try {
      window.localStorage.setItem(STORAGE_KEY, nextMode);
    } catch {
      // ignore storage failures (private mode, blocked, etc.)
    }
    for (const listener of listeners) listener();
  }, []);

  const toggleMode = useCallback(() => {
    setMode(mode === "theme_secondary" ? "theme_first" : "theme_secondary");
  }, [mode, setMode]);

  const isSecondary = useMemo(() => mode === "theme_secondary", [mode]);

  return { mounted, mode, setMode, toggleMode, isSecondary };
}

