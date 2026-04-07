// app/api/shipping/colissimo/tracking/route.ts
import { NextRequest, NextResponse } from "next/server";

const COLISSIMO_TIMELINE_URL =
  "https://ws.colissimo.fr/tracking-timeline-ws/rest/tracking/timelineCompany";

async function fetchTracking(parcelNumber: string, lang: string) {
  const apiKey = process.env.COLISSIMO_WS_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "COLISSIMO_WS_API_KEY missing" },
      { status: 503 },
    );
  }

  const res = await fetch(COLISSIMO_TIMELINE_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      login: "",
      password: "",
      apiKey,
      parcelNumber,
      lang,
    }),
  });

  const text = await res.text();
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    data = text;
  }

  if (!res.ok) {
    return NextResponse.json(
      { error: "Upstream error", status: res.status, body: data },
      { status: 502 },
    );
  }

  return NextResponse.json(data, { status: 200 });
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const parcelNumber = searchParams.get("id") || searchParams.get("parcelNumber") || searchParams.get("trackingNumber");
    const lang = searchParams.get("lang") || "fr_FR";

    if (!parcelNumber) {
      return NextResponse.json(
        { error: "Missing parcelNumber" },
        { status: 400 },
      );
    }

    return await fetchTracking(parcelNumber, lang);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const parcelNumber = body.parcelNumber || body.trackingNumber;
    const lang = body.lang || "fr_FR";

    if (!parcelNumber) {
      return NextResponse.json(
        { error: "Missing parcelNumber" },
        { status: 400 },
      );
    }

    return await fetchTracking(parcelNumber, lang);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 },
    );
  }
}
