// src/server/integrations/colissimo-sls.ts
/**
 * Colissimo SLS (Shipping Label Service) — generateLabel v3.1
 *
 * REST endpoint:
 * https://ws.colissimo.fr/sls-ws/SlsServiceWSRest/3.1/generateLabel
 */

function getSlsUrl(): string {
  const base = process.env.COLISSIMO_WS_BASE_URL ?? "https://ws.colissimo.fr";
  return `${base}/sls-ws/SlsServiceWSRest/3.1/generateLabel`;
}

/**
 * Convert grams to kilograms for Colissimo SLS `parcel.weight`.
 * SLS expects kg as a number with up to 2 decimals, range 0.01–30.00.
 * Invalid / NaN / ≤0 inputs default to 0.50 kg.
 */
function gramsToSlsKg(weightGrams: number): number {
  if (!Number.isFinite(weightGrams) || weightGrams <= 0) {
    return 0.5;
  }
  const kg = Math.round((weightGrams / 1000) * 100) / 100; // round to 2 decimals
  return Math.min(Math.max(kg, 0.01), 30.0);
}

/**
 * Split a full name into { firstName, lastName } for Colissimo addressee.
 * SLS requires both fields to be non-empty.
 */
function splitFullName(fullName: string): { firstName: string; lastName: string } {
  const tokens = fullName.trim().replace(/\s+/g, " ").split(" ");
  if (tokens.length === 0 || (tokens.length === 1 && tokens[0] === "")) {
    return { firstName: "TEST", lastName: "CLIENT" };
  }
  if (tokens.length === 1) {
    return { firstName: ".", lastName: tokens[0] };
  }
  const lastName = tokens[tokens.length - 1];
  const firstName = tokens.slice(0, -1).join(" ");
  return { firstName, lastName };
}

/** Trim a string, return null if empty/nullish. */
function safeTrim(value: string | null | undefined): string | null {
  if (value == null) return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export interface ColissimoLabelResult {
  trackingNumber: string | null;
  labelPdfBase64: string | null;
  errorCode: string;
  errorMessage: string | null;
}

export interface ColissimoSender {
  companyName: string;
  line1: string;
  line2?: string | null;
  zipCode: string;
  city: string;
  countryCode: string;
  phoneNumber: string | null;
  email: string | null;
}

interface ColissimoLabelParams {
  orderId: string;
  orderNumber: string;
  sender: ColissimoSender;
  recipient: {
    fullName: string;
    phone?: string | null;
    line1: string;
    line2?: string | null;
    postalCode: string;
    city: string;
    country: string;
  };
  deliveryMode: "home" | "pickup";
  pickupPointId?: string | null;
  weightGrams: number;
  /** Shipping speed from SHIPPING_SNAPSHOT. Defaults to "standard" if missing. */
  speed?: "standard" | "express" | string;
}

// ---------------------------------------------------------------------------
// Deterministic productCode resolution (no env vars)
// ---------------------------------------------------------------------------

type ColissimoSpeed = "standard" | "express";
type ColissimoDeliveryMode = "home" | "pickup";

function normalizeCountryCode(cc: string | null | undefined): string {
  return (cc || "FR").trim().toUpperCase();
}

/**
 * ProductCode mapping based on the Colissimo SLS doc table:
 * - France:
 *   - home standard => DOM
 *   - home express  => J+1
 *   - pickup any    => HD
 * - International:
 *   - pickup (OOH)  => HD  (generic OOH national+international)
 *   - home standard => DOM (International Home - without signature)
 *   - home express  => DOS (International Home - with signature)
 *
 * "express" maps to faster/signature service; Colissimo uses DOS for intl signature.
 * Mapping is explicit and conservative — no guessing beyond documented codes.
 */
function resolveProductCode(args: {
  deliveryMode: ColissimoDeliveryMode;
  speed: ColissimoSpeed;
  recipientCountry: string | null | undefined;
}): string {
  const country = normalizeCountryCode(args.recipientCountry);
  const isFrance = country === "FR";

  // Out-of-home deliveries: generic HD (applies to all OOH, national+international)
  if (args.deliveryMode === "pickup") {
    return "HD";
  }

  // Home delivery — France
  if (isFrance) {
    return args.speed === "express" ? "J+1" : "DOM";
  }

  // Home delivery — International
  return args.speed === "express" ? "DOS" : "DOM";
}

// ---------------------------------------------------------------------------
// Multipart / JSON response parser for SLS v3.1
// ---------------------------------------------------------------------------

interface SlsParsedResponse {
  json: Record<string, unknown> | null;
  pdfBase64: string | null;
  contentType: string;
  status: number;
}

async function parseSlsResponse(
  response: Response
): Promise<SlsParsedResponse> {
  const status = response.status;
  const contentType = response.headers.get("content-type") ?? "";
  const ct = contentType.toLowerCase();

  // ---- multipart/related (Buffer-safe parsing) ----
  if (ct.includes("multipart/related")) {
    const boundaryMatch = contentType.match(/boundary="?([^";]+)"?/i);
    if (!boundaryMatch) {
      return { json: null, pdfBase64: null, contentType, status };
    }
    const delimiterBuf = Buffer.from(`--${boundaryMatch[1]}`);
    const buf = Buffer.from(await response.arrayBuffer());

    let json: Record<string, unknown> | null = null;
    let pdfBase64: string | null = null;

    // Find all delimiter positions using Buffer.indexOf
    const offsets: number[] = [];
    let pos = 0;
    while (pos <= buf.length - delimiterBuf.length) {
      const idx = buf.indexOf(delimiterBuf, pos);
      if (idx === -1) break;
      offsets.push(idx);
      pos = idx + delimiterBuf.length;
    }

    for (let i = 0; i < offsets.length; i++) {
      const afterDelim = offsets[i] + delimiterBuf.length;

      // Closing delimiter: --boundary--
      if (
        afterDelim + 1 < buf.length &&
        buf[afterDelim] === 0x2d &&
        buf[afterDelim + 1] === 0x2d
      ) {
        continue;
      }

      const partEnd = i + 1 < offsets.length ? offsets[i + 1] : buf.length;
      let partBuf = buf.subarray(afterDelim, partEnd);

      // Strip leading CRLF or LF after delimiter
      if (partBuf.length >= 2 && partBuf[0] === 0x0d && partBuf[1] === 0x0a) {
        partBuf = partBuf.subarray(2);
      } else if (partBuf.length >= 1 && partBuf[0] === 0x0a) {
        partBuf = partBuf.subarray(1);
      }

      // Find header/body separator (CRLFCRLF preferred, LFLF fallback)
      const crlfcrlf = Buffer.from("\r\n\r\n");
      const lflf = Buffer.from("\n\n");
      let sepIdx = partBuf.indexOf(crlfcrlf);
      let sepLen = sepIdx !== -1 ? 4 : 0;
      if (sepIdx === -1) {
        sepIdx = partBuf.indexOf(lflf);
        sepLen = sepIdx !== -1 ? 2 : 0;
      }
      if (sepIdx === -1) continue;

      const headersStr = partBuf.subarray(0, sepIdx).toString("latin1").toLowerCase();
      let bodyBuf = partBuf.subarray(sepIdx + sepLen);

      // Strip trailing CRLF or LF (just before next boundary)
      if (
        bodyBuf.length >= 2 &&
        bodyBuf[bodyBuf.length - 2] === 0x0d &&
        bodyBuf[bodyBuf.length - 1] === 0x0a
      ) {
        bodyBuf = bodyBuf.subarray(0, bodyBuf.length - 2);
      } else if (bodyBuf.length >= 1 && bodyBuf[bodyBuf.length - 1] === 0x0a) {
        bodyBuf = bodyBuf.subarray(0, bodyBuf.length - 1);
      }

      if (headersStr.includes("application/json")) {
        const jsonText = bodyBuf.toString("utf8").trim();
        if (jsonText) {
          try {
            json = JSON.parse(jsonText) as Record<string, unknown>;
          } catch {
            // ignore malformed JSON part
          }
        }
      } else if (
        headersStr.includes("application/octet-stream") ||
        headersStr.includes("content-id: <label>") ||
        headersStr.includes("application/pdf") ||
        (headersStr.includes("filename") && headersStr.includes(".pdf"))
      ) {
        if (bodyBuf.length > 0) {
          pdfBase64 = bodyBuf.toString("base64");
        }
      }
    }

    return { json, pdfBase64, contentType, status };
  }

  // ---- application/json ----
  if (ct.includes("application/json")) {
    const text = await response.text();
    if (!text.trim()) {
      return { json: null, pdfBase64: null, contentType, status };
    }
    try {
      const json = JSON.parse(text) as Record<string, unknown>;
      return { json, pdfBase64: null, contentType, status };
    } catch {
      return { json: null, pdfBase64: null, contentType, status };
    }
  }

  // ---- unknown content-type ----
  return { json: null, pdfBase64: null, contentType, status };
}

// ---------------------------------------------------------------------------
// SLS error message extraction helper
// ---------------------------------------------------------------------------

/** Extract a concise error string from SLS parsed JSON messages[] array. Max ~300 chars. */
function extractSlsMessages(json: Record<string, unknown> | null): string | null {
  if (!json) return null;
  const messages = json.messages;
  if (!Array.isArray(messages) || messages.length === 0) return null;

  const parts: string[] = [];
  for (const m of messages) {
    if (m == null || typeof m !== "object") continue;
    const rec = m as Record<string, unknown>;
    const t = rec.type ?? "";
    const id = rec.id ?? "";
    const content = rec.messageContent ?? "";
    parts.push(`${t} ${id}: ${content}`.trim());
  }
  if (parts.length === 0) return null;
  const joined = parts.join(" | ");
  return joined.length > 300 ? joined.slice(0, 297) + "..." : joined;
}

// ---------------------------------------------------------------------------
// Attempt list for productCode fallbacks
// ---------------------------------------------------------------------------

/**
 * Build the ordered list of productCodes to attempt.
 * If initial is DOM, no fallbacks needed — DOM is the base service.
 */
function getAttemptCodes(
  deliveryMode: ColissimoDeliveryMode,
  speed: ColissimoSpeed,
  recipientCountry: string | null | undefined
): string[] {
  const initial = resolveProductCode({ deliveryMode, speed, recipientCountry });
  if (initial === "DOM") return ["DOM"];

  const country = normalizeCountryCode(recipientCountry);
  const isFrance = country === "FR";

  if (deliveryMode === "pickup") {
    return ["HD", "DOM"];
  }
  if (speed === "express") {
    if (isFrance) return ["J+1", "COLR", "DOM"];
    return ["DOS", "DOM"];
  }
  return [initial];
}

// ---------------------------------------------------------------------------
// Main label generation with attempt loop
// ---------------------------------------------------------------------------

/**
 * Creates a Colissimo shipping label for an order using the SLS API.
 * Handles both application/json and multipart/related responses.
 *
 * Tries deterministic productCodes in order. If the contract rejects
 * the intended code (400/403), retries with fallbacks including DOM.
 * Accepts the first successful response regardless of which code won.
 */
export async function createColissimoLabelFromOrder(
  params: ColissimoLabelParams
): Promise<ColissimoLabelResult> {
  const apiKey = process.env.COLISSIMO_WS_API_KEY;

  if (!apiKey) {
    return {
      trackingNumber: null,
      labelPdfBase64: null,
      errorCode: "MISSING_API_KEY",
      errorMessage:
        "Missing required environment variable COLISSIMO_WS_API_KEY for Colissimo SLS integration",
    };
  }

  const weightKg = gramsToSlsKg(params.weightGrams);
  const url = getSlsUrl();

  // depositDate = today in YYYY-MM-DD
  const now = new Date();
  const depositDate = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0"),
  ].join("-");

  const { firstName, lastName } = splitFullName(params.recipient.fullName);

  // Resolve speed once
  const normalizedSpeed: ColissimoSpeed =
    typeof params.speed === "string" && params.speed.trim().toLowerCase() === "express"
      ? "express"
      : "standard";

  // Build base body template (productCode set per attempt)
  const baseBody = {
    outputFormat: {
      x: 0,
      y: 0,
      outputPrintingType: "PDF_10x15_300dpi",
    },
    letter: {
      service: {
        productCode: "", // placeholder
        depositDate,
        orderNumber: params.orderNumber,
        commercialName: safeTrim(params.sender.companyName) ?? "predators",
        refClient: params.orderNumber,
        ...(params.deliveryMode === "pickup" && params.pickupPointId
          ? { pickupLocationId: params.pickupPointId }
          : {}),
      },
      parcel: {
        weight: weightKg,
      },
      sender: {
        address: {
          companyName: params.sender.companyName,
          line2: params.sender.line1,
          countryCode: "FR",
          zipCode: params.sender.zipCode.trim(),
          city: params.sender.city.trim().toUpperCase(),
          ...(safeTrim(params.sender.email) ? { email: safeTrim(params.sender.email) } : {}),
          ...(safeTrim(params.sender.phoneNumber) ? { phoneNumber: safeTrim(params.sender.phoneNumber) } : {}),
        },
      },
      addressee: {
        address: {
          lastName,
          firstName,
          line2: params.recipient.line1,
          countryCode: normalizeCountryCode(params.recipient.country),
          zipCode: params.recipient.postalCode.trim(),
          city: params.recipient.city.trim().toUpperCase(),
        },
      },
    },
  };

  // ---- Internal fetch helper ----
  interface SlsCallResult {
    parsed: SlsParsedResponse;
    responseOk: boolean;
    status: number;
    contentType: string;
    productCode: string;
  }

  async function callSls(code: string): Promise<SlsCallResult> {
    const reqBody = {
      ...baseBody,
      letter: {
        ...baseBody.letter,
        service: { ...baseBody.letter.service, productCode: code },
      },
    };

    console.log("[Colissimo SLS] request", { orderNumber: params.orderNumber, weightKg, productCode: code });

    const response = await fetch(url, {
      method: "POST",
      headers: {
        Accept: "multipart/related, application/json",
        "Content-Type": "application/json",
        apikey: apiKey!,
      },
      body: JSON.stringify(reqBody),
    });

    const ct = response.headers.get("content-type") ?? "";
    console.log("[Colissimo SLS] response", { status: response.status, contentType: ct, productCode: code });

    const parsed = await parseSlsResponse(response);
    return { parsed, responseOk: response.ok, status: response.status, contentType: ct, productCode: code };
  }

  // ---- Extract tracking + PDF from a parsed response ----
  function extractResult(parsed: SlsParsedResponse): { trackingNumber: string; labelPdfBase64: string } | null {
    const raw = parsed.json;

    // v3.1 nests under labelV31Response; prefer parcelNumber over partner
    const labelV31 = raw?.labelV31Response as Record<string, unknown> | undefined;
    const labelV2 = raw?.labelV2Response as Record<string, unknown> | undefined;
    const letterResp = raw?.letter as Record<string, unknown> | undefined;
    const rawTrackingNumber =
      labelV31?.parcelNumber ??
      raw?.codeBarre ??
      raw?.parcelNumber ??
      raw?.trackingNumber ??
      labelV31?.parcelNumberPartner ??
      labelV2?.parcelNumber ??
      labelV2?.parcelNumberPartner ??
      letterResp?.parcelNumber ??
      letterResp?.parcelNumberPartner ??
      raw?.parcelNumberPartner ??
      null;
    // Sanitize: SLS may include whitespace/newlines in tracking values
    const trackingNumber = rawTrackingNumber
      ? String(rawTrackingNumber).replace(/\s+/g, "")
      : null;

    // extract label PDF: prefer multipart binary, fallback to JSON fields
    const labelPdfFromJson =
      raw?.pdfEtiquette ??
      raw?.label ??
      raw?.labelPdf ??
      raw?.outputPrinting ??
      null;
    const labelPdfBase64 =
      parsed.pdfBase64 ??
      (typeof labelPdfFromJson === "string" ? labelPdfFromJson : null);

    if (trackingNumber && labelPdfBase64) {
      return { trackingNumber, labelPdfBase64 };
    }
    return null;
  }

  // ---- Check for SLS ERROR in messages[] ----
  function findSlsError(json: Record<string, unknown> | null): string | null {
    if (!json) return null;
    const messages = json.messages;
    if (!Array.isArray(messages)) return null;
    const err = messages.find(
      (m: unknown) =>
        m !== null &&
        typeof m === "object" &&
        (m as Record<string, unknown>).type === "ERROR"
    ) as Record<string, unknown> | undefined;
    if (!err) return null;
    const parts: string[] = [];
    if (err.id) parts.push(`[${err.id}]`);
    if (err.messageContent) parts.push(String(err.messageContent));
    return parts.length > 0 ? parts.join(" ") : "Unknown SLS error";
  }

  // ---- Execute attempt loop ----
  const attemptCodes = getAttemptCodes(
    params.deliveryMode,
    normalizedSpeed,
    params.recipient.country
  );
  const attemptedCodes: string[] = [];
  let lastSlsMessages: string | null = null;
  let lastStatus = 0;

  try {
    for (const code of attemptCodes) {
      attemptedCodes.push(code);
      const call = await callSls(code);
      lastStatus = call.status;
      lastSlsMessages = extractSlsMessages(call.parsed.json) ?? lastSlsMessages;

      // 400/403 → try next code
      if (call.status === 400 || call.status === 403) {
        continue;
      }

      // Empty / unparseable response → stop (non-retryable)
      if (!call.parsed.json && !call.parsed.pdfBase64) {
        const isMultipart = call.contentType.toLowerCase().includes("multipart");
        return {
          trackingNumber: null,
          labelPdfBase64: null,
          errorCode: isMultipart ? "PARSE_ERROR" : "EMPTY_RESPONSE",
          errorMessage: `No JSON or PDF extracted | status=${call.status} | code=${code}`,
        };
      }

      // Non-OK and not 400/403 → stop
      if (!call.responseOk) {
        const raw = call.parsed.json;
        const errorCode =
          (raw &&
            (raw.errorCode ??
              raw.codeErreur ??
              raw.returnCode ??
              raw.statusCode)) ??
          "HTTP_ERROR";
        const httpMsg = raw
          ? String(raw.errorMessage ?? raw.libelleErreur ?? `Colissimo SLS HTTP ${call.status}`)
          : `Colissimo SLS HTTP ${call.status} | code=${code}`;
        return {
          trackingNumber: null,
          labelPdfBase64: null,
          errorCode: String(errorCode),
          errorMessage: httpMsg,
        };
      }

      // OK — check for structured SLS ERROR messages
      const slsError = findSlsError(call.parsed.json);
      if (slsError) {
        return {
          trackingNumber: null,
          labelPdfBase64: null,
          errorCode: "SLS_ERROR",
          errorMessage: slsError,
        };
      }

      // OK — try to extract tracking + PDF
      const extracted = extractResult(call.parsed);
      if (!extracted) {
        return {
          trackingNumber: null,
          labelPdfBase64: null,
          errorCode: "INCOMPLETE_RESPONSE",
          errorMessage: `OK response but missing tracking or PDF | code=${code}`,
        };
      }

      // Success — accept first working productCode
      return {
        trackingNumber: extracted.trackingNumber,
        labelPdfBase64: extracted.labelPdfBase64,
        errorCode: "0",
        errorMessage: null,
      };
    }

    // All attempt codes exhausted (all returned 400/403)
    const attemptsStr = attemptedCodes.join("->");
    return {
      trackingNumber: null,
      labelPdfBase64: null,
      errorCode: "SLS_ERROR",
      errorMessage: `All productCodes rejected. attempts=${attemptsStr} lastStatus=${lastStatus}${lastSlsMessages ? ` messages=${lastSlsMessages}` : ""}`,
    };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Unknown Colissimo SLS error";
    return {
      trackingNumber: null,
      labelPdfBase64: null,
      errorCode: "NETWORK_ERROR",
      errorMessage: message,
    };
  }
}

export function getColissimoSenderFromCompanyProfile(profile: {
  legalName: string | null;
  brandName: string | null;
  email: string | null;
  phone: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  postalCode: string | null;
  city: string | null;
  country: string | null;
}): ColissimoSender {
  return {
    companyName: profile.brandName || profile.legalName || "Unknown Sender",
    line1: profile.addressLine1 || "",
    line2: profile.addressLine2,
    zipCode: profile.postalCode || "",
    city: profile.city || "",
    countryCode: profile.country || "FR",
    phoneNumber: profile.phone || null,
    email: profile.email || null,
  };
}
