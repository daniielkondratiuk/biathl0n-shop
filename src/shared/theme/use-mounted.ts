// src/shared/theme/use-mounted.ts
"use client";

import { useSyncExternalStore } from "react";

const emptySubscribe = () => () => {};
const getSnapshot = () => true;
const getServerSnapshot = () => false;

/**
 * Hook to track if the component is mounted (client-side).
 * Use this to avoid hydration mismatches when reading theme or other client-only values.
 *
 * Uses useSyncExternalStore to avoid setState-in-useEffect lint errors.
 *
 * @returns {boolean} true on the client, false during SSR
 */
export function useMounted(): boolean {
  return useSyncExternalStore(emptySubscribe, getSnapshot, getServerSnapshot);
}
