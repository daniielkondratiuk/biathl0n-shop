// app/api/shipping/colissimo/points-retrait/route.ts
import { NextRequest, NextResponse } from "next/server";
import {
  findRelayPoints,
  getColissimoApiKey,
  ColissimoFindRelayPointsParams,
} from "@/server/integrations/colissimo";

type ColissimoRelayPointInput = {
  address: string;
  zipCode: string;
  city: string;
  countryCode?: string;
  weightGrams: number;
  shippingDate: string;
  filterRelay?: number;
  optionInter?: 0 | 1;
  requestId?: string;
  lang?: string;
};

type NormalizedColissimoPoint = {
  id: string;
  name: string | null;
  type: string | null;
  network: string | null;
  distanceMeters: number | null;
  address: {
    line1: string | null;
    line2: string | null;
    zipCode: string | null;
    city: string | null;
    countryCode: string | null;
  };
  geo: {
    lat: number | null;
    lng: number | null;
  };
  openingHours: Record<string, unknown> | null;
};

type NormalizedColissimoResponse = {
  wsRequestId: string | null;
  qualiteReponse: number | null;
  errorCode: string;
  errorMessage: string | null;
  points: NormalizedColissimoPoint[];
};

function isValidShippingDateFormat(value: unknown): value is string {
  if (typeof value !== "string") return false;
  return /^\d{2}\/\d{2}\/\d{4}$/.test(value);
}

function stringOrNull(value: unknown): string | null {
  if (typeof value === "string" && value.trim().length > 0) {
    return value;
  }
  return null;
}

function numberOrNull(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function extractPointsArray(raw: unknown): unknown[] {
  if (!raw || typeof raw !== "object") return [];

  const r = raw as Record<string, unknown>;
  const list = r.listePointRetraitAcheminement;

  // Shape A: data.listePointRetraitAcheminement is an array
  if (Array.isArray(list)) {
    return list;
  }

  // Shape B: data.listePointRetraitAcheminement.listePointRetraitAcheminement is an array
  if (list && typeof list === "object") {
    const listObj = list as Record<string, unknown>;
    if (Array.isArray(listObj.listePointRetraitAcheminement)) {
      return listObj.listePointRetraitAcheminement;
    }

    // Shape C: data.listePointRetraitAcheminement.pointRetraitAcheminement is an array
    if (Array.isArray(listObj.pointRetraitAcheminement)) {
      return listObj.pointRetraitAcheminement;
    }
  }

  // Fallbacks for other potential shapes
  if (Array.isArray(r.pointRetraitAcheminement)) {
    return r.pointRetraitAcheminement;
  }

  if (Array.isArray(r.points)) {
    return r.points;
  }

  return [];
}

function normalizeColissimoResponse(rawInput: unknown): NormalizedColissimoResponse {
  const raw = (rawInput && typeof rawInput === "object") ? rawInput as Record<string, unknown> : {} as Record<string, unknown>;

  const wsRequestId =
    stringOrNull(
      raw?.wsRequestId ??
        raw?.idRequest ??
        raw?.requestId ??
        raw?.idRequete ??
        raw?.idRequeteWS
    ) || null;

  const qualiteReponse =
    raw?.qualiteReponse !== undefined && raw?.qualiteReponse !== null
      ? numberOrNull(raw.qualiteReponse)
      : null;

  const rawErrorCode =
    raw?.errorCode ??
    raw?.codeErreur ??
    raw?.returnCode ??
    raw?.codeErreurWS ??
    raw?.statusCode;

  const errorCode =
    typeof rawErrorCode === "string"
      ? rawErrorCode
      : rawErrorCode !== undefined && rawErrorCode !== null
      ? String(rawErrorCode)
      : "UNKNOWN";

  const errorMessage =
    stringOrNull(
      raw?.errorMessage ??
        raw?.libelleErreur ??
        raw?.message ??
        raw?.messageErreur
    ) || null;

  const pointsArray = extractPointsArray(raw);

  const points: NormalizedColissimoPoint[] = (pointsArray as Record<string, unknown>[]).map(
    (p): NormalizedColissimoPoint => ({
      id:
        stringOrNull(
          p?.identifiant ??
            p?.id ??
            p?.identifiantPointRetrait ??
            p?.num ??
            p?.code
        ) ??
        "UNKNOWN",
      name:
        stringOrNull(p?.nom ?? p?.name ?? p?.raisonSociale ?? p?.libelle) ||
        null,
      type:
        stringOrNull(
          p?.typeDePoint ??
            p?.type ??
            p?.typePointRetrait ??
            p?.typePoint ??
            p?.categorie
        ) || null,
      network:
        stringOrNull(
          p?.reseau ??
            p?.network ??
            p?.reseauDistribution ??
              p?.codeReseau
        ) || null,
      distanceMeters:
        numberOrNull(
          p?.distanceEnMetre ??
            p?.distanceMeters ??
            p?.distanceEnMetres ??
            p?.distanceMetres ??
            p?.distance
        ) || null,
      address: {
        line1:
          stringOrNull(
            p?.adresse1 ??
              p?.address1 ??
              p?.adresse ??
              p?.street ??
              p?.rue
          ) || null,
        line2:
          stringOrNull(
            p?.adresse2 ??
              p?.address2 ??
              p?.complementAdresse ??
              p?.complement
          ) || null,
        zipCode:
          stringOrNull(p?.codePostal ?? p?.zipCode ?? p?.cp ?? p?.postalCode) ||
          null,
        city:
          stringOrNull(
            p?.localite ?? p?.city ?? p?.ville ?? p?.commune
          ) || null,
        countryCode:
          stringOrNull(
            p?.codePays ?? p?.countryCode ?? p?.pays ?? p?.isoPays
          ) || null,
      },
      geo: {
        lat:
          numberOrNull(
            p?.coordGeolocalisationLatitude ??
              p?.latitude ??
              p?.lat ??
              p?.geoLatitude
          ) || null,
        lng:
          numberOrNull(
            p?.coordGeolocalisationLongitude ??
              p?.longitude ??
              p?.lng ??
              p?.geoLongitude
          ) || null,
      },
      openingHours: (() => {
        const opening: Record<string, unknown> = {};
        const fields = [
          "horairesOuvertureLundi",
          "horairesOuvertureMardi",
          "horairesOuvertureMercredi",
          "horairesOuvertureJeudi",
          "horairesOuvertureVendredi",
          "horairesOuvertureSamedi",
          "horairesOuvertureDimanche",
          "periodeActiviteHoraireDeb",
          "periodeActiviteHoraireFin",
          "listeConges",
        ] as const;

        for (const field of fields) {
          if (p && Object.prototype.hasOwnProperty.call(p, field)) {
            opening[field] = p[field];
          }
        }

        return Object.keys(opening).length > 0 ? opening : null;
      })(),
    })
  );

  return {
    wsRequestId,
    qualiteReponse,
    errorCode,
    errorMessage,
    points,
  };
}

function normalizeHttpError(
  status: number,
  message: string | null
): NormalizedColissimoResponse {
  return {
    wsRequestId: null,
    qualiteReponse: null,
    errorCode: "HTTP_ERROR",
    errorMessage: message,
    points: [],
  };
}

function normalizeNetworkError(message: string): NormalizedColissimoResponse {
  return {
    wsRequestId: null,
    qualiteReponse: null,
    errorCode: "NETWORK_ERROR",
    errorMessage: message,
    points: [],
  };
}

function validateInput(
  body: unknown
): { value?: ColissimoRelayPointInput; error?: string } {
  if (!body || typeof body !== "object") {
    return { error: "Request body must be a JSON object" };
  }

  const {
    address,
    zipCode,
    city,
    countryCode,
    weightGrams,
    shippingDate,
    filterRelay,
    optionInter,
    requestId,
    lang,
  } = body as Record<string, unknown>;

  if (typeof address !== "string" || !address.trim()) {
    return { error: '"address" is required and must be a non-empty string' };
  }
  if (typeof zipCode !== "string" || !zipCode.trim()) {
    return { error: '"zipCode" is required and must be a non-empty string' };
  }
  if (typeof city !== "string" || !city.trim()) {
    return { error: '"city" is required and must be a non-empty string' };
  }
  if (typeof weightGrams !== "number" || !Number.isFinite(weightGrams)) {
    return { error: '"weightGrams" is required and must be a number' };
  }
  if (!isValidShippingDateFormat(shippingDate)) {
    return {
      error:
        '"shippingDate" is required and must be a string in format "DD/MM/YYYY"',
    };
  }

  if (
    filterRelay !== undefined &&
    (typeof filterRelay !== "number" || !Number.isFinite(filterRelay))
  ) {
    return { error: '"filterRelay" must be a number if provided' };
  }

  if (
    optionInter !== undefined &&
    !(optionInter === 0 || optionInter === 1)
  ) {
    return { error: '"optionInter" must be 0 or 1 if provided' };
  }

  if (requestId !== undefined && typeof requestId !== "string") {
    return { error: '"requestId" must be a string if provided' };
  }

  if (lang !== undefined && typeof lang !== "string") {
    return { error: '"lang" must be a string if provided' };
  }

  if (countryCode !== undefined && typeof countryCode !== "string") {
    return { error: '"countryCode" must be a string if provided' };
  }

  return {
    value: {
      address,
      zipCode,
      city,
      countryCode: (countryCode as string | undefined) ?? "FR",
      weightGrams,
      shippingDate,
      filterRelay: (filterRelay as number | undefined) ?? 1,
      optionInter: (optionInter as 0 | 1 | undefined) ?? 0,
      requestId: requestId as string | undefined,
      lang: (lang as string | undefined) ?? "FR",
    },
  };
}

/**
 * Example:
 *
 * curl -i -X POST "http://localhost:3000/api/shipping/colissimo/points-retrait" \
 *   -H "Content-Type: application/json" \
 *   -d '{
 *     "address": "10 Rue de la Paix",
 *     "zipCode": "75002",
 *     "city": "Paris",
 *     "countryCode": "FR",
 *     "weightGrams": 500,
 *     "shippingDate": "28/01/2026",
 *     "filterRelay": 1,
 *     "optionInter": 0,
 *     "lang": "FR"
 *   }'
 */
export async function POST(request: NextRequest) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      {
        error: "Invalid JSON body",
      },
      { status: 400 }
    );
  }

  const { value, error } = validateInput(body);
  if (error || !value) {
    return NextResponse.json(
      {
        error,
      },
      { status: 400 }
    );
  }

  // Guard: ensure API key is configured and never exposed in responses
  try {
    getColissimoApiKey(process.env.COLISSIMO_WS_API_KEY);
  } catch (err) {
    return NextResponse.json(
      {
        error:
          err instanceof Error
            ? err.message
            : "Colissimo configuration error: missing COLISSIMO_WS_API_KEY",
      },
      { status: 500 }
    );
  }

  const params: ColissimoFindRelayPointsParams = {
    address: value.address,
    zipCode: value.zipCode,
    city: value.city,
    countryCode: value.countryCode ?? "FR",
    weight: value.weightGrams,
    shippingDate: value.shippingDate,
    filterRelay: value.filterRelay ?? 1,
    optionInter: value.optionInter ?? 0,
    requestId: value.requestId,
    lang: value.lang ?? "FR",
  };

  const result = await findRelayPoints<unknown>(params);

  // Network or fetch-layer error
  if (!result.ok && result.status === 0) {
    const payload = normalizeNetworkError(result.error || "Network error");
    return NextResponse.json(payload, { status: 502 });
  }

  // HTTP non-2xx from Colissimo
  if (!result.ok && result.status !== 0) {
    const payload = normalizeHttpError(
      result.status,
      result.error || `Colissimo HTTP ${result.status}`
    );
    return NextResponse.json(payload, { status: 502 });
  }

  const normalized = normalizeColissimoResponse(result.data);

  const url = new URL(request.url);
  const debugEnabled = url.searchParams.get("debug") === "1";
  const isDev = process.env.NODE_ENV !== "production";

  const isSuccess =
    normalized.errorCode === "0" || normalized.errorCode === "000";

  if (!isSuccess) {
    const body =
      debugEnabled && isDev && result.data && typeof result.data === "object"
        ? {
            ...normalized,
            debug: {
              rawKeys: Object.keys(result.data as Record<string, unknown>),
              rawPointsCount: extractPointsArray(result.data).length,
            },
          }
        : normalized;

    return NextResponse.json(body, { status: 502 });
  }

  const successBody =
    debugEnabled && isDev && result.data && typeof result.data === "object"
      ? {
          ...normalized,
          debug: {
            rawKeys: Object.keys(result.data as Record<string, unknown>),
            rawPointsCount: extractPointsArray(result.data).length,
          },
        }
      : normalized;

  return NextResponse.json(successBody);
}

