// src/server/integrations/colissimo-tracking.ts
/**
 * Colissimo Tracking Timeline v2.6 — timelineCompany
 *
 * REST endpoint:
 * POST {COLISSIMO_WS_BASE_URL}/tracking-timeline-ws/rest/tracking/timelineCompany
 *
 * Authentication: apiKey in JSON body (login/password sent as empty strings).
 * Env: COLISSIMO_WS_API_KEY
 *
 * Detection strategy (hybrid):
 *   1. Collect all events from parcel.step[].event[]
 *   2. Sort by date desc → take the latest event
 *   3. Check event.code against known code sets (primary)
 *   4. If code unknown → fallback to event label text matching
 *   5. If no events → fallback to step-based detection (stepId)
 *
 * CDC_WebServiceTrackingTL v2.6 step definitions:
 *   0 Annonce · 1 Prise en charge · 2 Acheminement
 *   3 Arrivée sur site · 4 Livraison · 5 Livré
 * Step status values: STEP_STATUS_ACTIVE / STEP_STATUS_INACTIVE / STEP_STATUS_DISABLED
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ColissimoTrackingOutcome = "SHIPPED" | "DELIVERED" | "UNCHANGED" | "UNAUTHORIZED";

export interface ColissimoTrackingResult {
  trackingNumber: string;
  outcome: ColissimoTrackingOutcome;
  error: string | null;
  /** Highest active stepId found, or null if none */
  activeStepId: number | null;
  /** Short label of the active step (from API stepLabel) */
  activeStepLabelShort: string | null;
  /** ISO date string from the active step, if present */
  activeStepDate: string | null;
  /** response.status[0].code from the API */
  apiStatusCode: string | null;
  /** response.status[0].message from the API */
  apiStatusMessage: string | null;
  /** Whether parcel.step was an array in the response */
  rawHasSteps: boolean;
  /** Event code of the latest event (from step[].event[]) */
  lastEventCode: string | null;
  /** Label of the latest event (labelLong ?? labelShort) */
  lastEventLabel: string | null;
  /** True when event code was not in any known set → fell back to text/step */
  codeWasUnknown: boolean;
}

/** Shape of a single event inside a step */
interface StepEvent {
  code?: string;
  labelLong?: string;
  labelShort?: string;
  date?: string | null;
  [key: string]: unknown;
}

/** Shape of a single step in parcel.step */
interface ParcelStep {
  stepId?: number;
  stepLabel?: string;
  status?: string;
  date?: string | null;
  event?: StepEvent[];
  [key: string]: unknown;
}

/** Shape of the timelineCompany response (defensive) */
interface TrackingTLResponse {
  parcel?: {
    parcelNumber?: string;
    step?: ParcelStep[];
    [key: string]: unknown;
  };
  status?: { code?: string; message?: string }[];
  error?: { code?: string; message?: string };
  [key: string]: unknown;
}

// ---------------------------------------------------------------------------
// Event code classification
// ---------------------------------------------------------------------------

const ANNOUNCE_CODES = new Set(["PCHMQT"]);
const SHIPPED_CODES = new Set<string>([]);
const DELIVERED_CODES = new Set<string>([]);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getTrackingUrl(): string {
  const base =
    process.env.COLISSIMO_WS_BASE_URL ?? "https://ws.colissimo.fr";
  return `${base}/tracking-timeline-ws/rest/tracking/timelineCompany`;
}

function getApiKey(): string | null {
  const key = process.env.COLISSIMO_WS_API_KEY;
  return key && key.trim() ? key.trim() : null;
}

function emptyResult(
  trackingNumber: string,
  error: string | null
): ColissimoTrackingResult {
  return {
    trackingNumber,
    outcome: "UNCHANGED",
    error,
    activeStepId: null,
    activeStepLabelShort: null,
    activeStepDate: null,
    apiStatusCode: null,
    apiStatusMessage: null,
    rawHasSteps: false,
    lastEventCode: null,
    lastEventLabel: null,
    codeWasUnknown: false,
  };
}

function baseResult(
  trackingNumber: string,
  overrides: Partial<ColissimoTrackingResult> = {}
): ColissimoTrackingResult {
  return {
    trackingNumber,
    outcome: "UNCHANGED",
    error: null,
    activeStepId: null,
    activeStepLabelShort: null,
    activeStepDate: null,
    apiStatusCode: null,
    apiStatusMessage: null,
    rawHasSteps: false,
    lastEventCode: null,
    lastEventLabel: null,
    codeWasUnknown: false,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Query Colissimo tracking timeline for a single parcel.
 *
 * Hybrid detection:
 *   1. event.code checked against known code sets
 *   2. fallback to event label text (labelLong/labelShort)
 *   3. fallback to step-based detection (stepId)
 */
export async function getColissimoTrackingStatus(
  trackingNumber: string
): Promise<ColissimoTrackingResult> {
  const apiKey = getApiKey();
  if (!apiKey) {
    return emptyResult(
      trackingNumber,
      "Missing COLISSIMO_WS_API_KEY for tracking"
    );
  }

  const url = getTrackingUrl();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15_000);

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        login: "",
        password: "",
        apiKey,
        parcelNumber: trackingNumber,
        lang: "fr_FR",
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      return emptyResult(
        trackingNumber,
        `HTTP ${response.status} from Colissimo tracking`
      );
    }

    let data: TrackingTLResponse;
    try {
      data = (await response.json()) as TrackingTLResponse;
    } catch {
      return emptyResult(
        trackingNumber,
        "Invalid JSON response from Colissimo tracking"
      );
    }

    // Extract API-level status (status[0].code / status[0].message)
    const apiStatus = Array.isArray(data.status) ? data.status[0] : undefined;
    const apiStatusCode = apiStatus?.code != null ? String(apiStatus.code) : null;
    const apiStatusMessage = apiStatus?.message != null ? String(apiStatus.message) : null;

    // Handle API-level error object — not a network failure, so error: null
    if (data.error?.code || data.error?.message) {
      return baseResult(trackingNumber, {
        apiStatusCode: data.error?.code ?? apiStatusCode,
        apiStatusMessage: data.error?.message ?? apiStatusMessage,
      });
    }

    // Handle non-zero status code (e.g. code !== "0")
    // These are API-level issues (auth, unknown parcel, etc.) — not network failures.
    // We return UNCHANGED (or UNAUTHORIZED for 202) with error: null so sync
    // does NOT count them as FAILED.
    if (apiStatusCode && apiStatusCode !== "0") {
      return baseResult(trackingNumber, {
        outcome: apiStatusCode === "202" ? "UNAUTHORIZED" : "UNCHANGED",
        apiStatusCode,
        apiStatusMessage,
      });
    }

    // Parse parcel.step array
    const steps = data.parcel?.step;
    const rawHasSteps = Array.isArray(steps);

    if (!rawHasSteps || !steps || steps.length === 0) {
      return baseResult(trackingNumber, { apiStatusCode, apiStatusMessage });
    }

    // -----------------------------------------------------------------------
    // Step-level context: find highest active step (for context / fallback)
    // -----------------------------------------------------------------------
    const activeSteps = steps.filter(
      (s) =>
        typeof s.stepId === "number" &&
        s.status === "STEP_STATUS_ACTIVE"
    );

    let activeStepId: number | null = null;
    let activeStepLabelShort: string | null = null;
    let activeStepDate: string | null = null;

    if (activeSteps.length > 0) {
      const highest = activeSteps.reduce((best, cur) =>
        (cur.stepId ?? -1) > (best.stepId ?? -1) ? cur : best
      );
      activeStepId = highest.stepId!;
      activeStepLabelShort = highest.stepLabel
        ? String(highest.stepLabel)
        : null;
      activeStepDate = highest.date != null ? String(highest.date) : null;
    }

    // -----------------------------------------------------------------------
    // Event-level detection: collect all events, sort by date, take latest
    // -----------------------------------------------------------------------
    const allEvents: StepEvent[] = [];
    for (const step of steps) {
      if (Array.isArray(step.event)) {
        allEvents.push(...step.event);
      }
    }

    // Sort by date descending (newest first); undated events sort last
    allEvents.sort((a, b) => {
      const da = a.date ? new Date(String(a.date)).getTime() : 0;
      const db = b.date ? new Date(String(b.date)).getTime() : 0;
      return db - da;
    });

    const latestEvent = allEvents.length > 0 ? allEvents[0] : null;
    const lastEventCode = latestEvent?.code ? String(latestEvent.code).trim() : null;
    const lastEventLabel =
      (latestEvent?.labelLong ? String(latestEvent.labelLong) : null) ??
      (latestEvent?.labelShort ? String(latestEvent.labelShort) : null);

    // -----------------------------------------------------------------------
    // Hybrid outcome determination
    // -----------------------------------------------------------------------
    let outcome: ColissimoTrackingOutcome;
    let codeWasUnknown = false;

    if (latestEvent && lastEventCode) {
      // Primary: event code classification
      if (DELIVERED_CODES.has(lastEventCode)) {
        outcome = "DELIVERED";
      } else if (SHIPPED_CODES.has(lastEventCode)) {
        outcome = "SHIPPED";
      } else if (ANNOUNCE_CODES.has(lastEventCode)) {
        outcome = "UNCHANGED";
      } else {
        // Unknown code — fallback to event label text
        codeWasUnknown = true;
        const label = (lastEventLabel ?? "").toLowerCase();
        if (label.includes("livré")) {
          outcome = "DELIVERED";
        } else if (label.includes("pris en charge")) {
          outcome = "SHIPPED";
        } else {
          // Final fallback: step-based detection
          if (activeStepId === 5) {
            outcome = "DELIVERED";
          } else if (activeStepId !== null && activeStepId >= 1) {
            outcome = "SHIPPED";
          } else {
            outcome = "UNCHANGED";
          }
        }
      }
    } else {
      // No events — use step-based detection
      if (activeStepId === 5) {
        outcome = "DELIVERED";
      } else if (activeStepId !== null && activeStepId >= 1) {
        outcome = "SHIPPED";
      } else {
        outcome = "UNCHANGED";
      }
    }

    return {
      trackingNumber,
      outcome,
      error: null,
      activeStepId,
      activeStepLabelShort,
      activeStepDate,
      apiStatusCode,
      apiStatusMessage,
      rawHasSteps: true,
      lastEventCode,
      lastEventLabel,
      codeWasUnknown,
    };
  } catch (err) {
    const message =
      err instanceof Error
        ? err.name === "AbortError"
          ? "Request timed out (15s)"
          : err.message
        : "Unknown tracking error";
    return emptyResult(trackingNumber, message);
  } finally {
    clearTimeout(timeout);
  }
}
