// src/server/integrations/colissimo.ts
/**
 * Colissimo point relais (Point Retrait WS v2) client
 *
 * REST endpoint:
 * https://ws.colissimo.fr/pointretrait-ws-cxf/rest/v2/pointretrait/findRDVPointRetraitAcheminement
 */

const COLISSIMO_WS_BASE_URL =
  process.env.COLISSIMO_WS_BASE_URL || "https://ws.colissimo.fr";

export interface ColissimoFindRelayPointsParams {
  address: string;
  zipCode: string;
  city: string;
  countryCode?: string;
  weight: number;
  shippingDate: string;
  filterRelay?: number;
  optionInter?: number;
  requestId?: string;
  lang?: string;
}

export interface ColissimoResponse<T = unknown> {
  ok: boolean;
  status: number;
  data: T | null;
  error?: string;
}

function getColissimoApiKey(explicitKey?: string | null): string {
  const key = explicitKey || process.env.COLISSIMO_WS_API_KEY;
  if (!key) {
    throw new Error(
      "Missing required environment variable COLISSIMO_WS_API_KEY for Colissimo integration"
    );
  }
  return key;
}

/**
 * Builds JSON body for the Colissimo REST endpoint, applying defaults.
 */
function buildColissimoBody(
  params: ColissimoFindRelayPointsParams,
  apiKey: string
): Record<string, unknown> {
  return {
    apiKey,
    address: params.address,
    zipCode: params.zipCode,
    city: params.city,
    countryCode: params.countryCode || "FR",
    weight: params.weight,
    shippingDate: params.shippingDate,
    filterRelay: params.filterRelay ?? 1,
    optionInter: params.optionInter ?? 0,
    requestId: params.requestId,
    lang: params.lang || "FR",
  };
}

/**
 * Low-level Colissimo fetch wrapper with timeout and safe JSON parsing.
 */
export async function findRelayPoints<T = unknown>(
  params: ColissimoFindRelayPointsParams,
  opts?: { timeoutMs?: number }
): Promise<ColissimoResponse<T>> {
  const apiKey = getColissimoApiKey(null);
  const timeoutMs = opts?.timeoutMs ?? 8000;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const url = `${COLISSIMO_WS_BASE_URL.replace(
      /\/$/,
      ""
    )}/pointretrait-ws-cxf/rest/v2/pointretrait/findRDVPointRetraitAcheminement`;
    const body = JSON.stringify(buildColissimoBody(params, apiKey));

    const response = await fetch(url, {
      method: "POST",
      signal: controller.signal,
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body,
    });

    const status = response.status;
    let data: T | null = null;
    let error: string | undefined;

    const text = await response.text();

    if (text) {
      try {
        data = JSON.parse(text) as T;
      } catch {
        // If JSON parsing fails, expose the raw text in error message but keep data null
        error = "Failed to parse Colissimo JSON response";
      }
    }

    if (!response.ok) {
      if (!error) {
        error = `Colissimo HTTP ${status}`;
      }
      return { ok: false, status, data, error };
    }

    return { ok: true, status, data, error: undefined };
  } catch (err) {
    const message =
      err instanceof Error && err.name === "AbortError"
        ? `Colissimo request timed out after ${timeoutMs}ms`
        : err instanceof Error
        ? err.message
        : "Unknown Colissimo error";

    return {
      ok: false,
      status: 0,
      data: null,
      error: message,
    };
  } finally {
    clearTimeout(timeout);
  }
}

export { getColissimoApiKey };
