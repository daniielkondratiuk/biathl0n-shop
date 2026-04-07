import { NextResponse } from "next/server";

export async function POST() {
  const apiKey = process.env.COLISSIMO_WS_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "Missing COLISSIMO_WS_API_KEY" },
      { status: 500 }
    );
  }

  const baseUrl =
    process.env.COLISSIMO_WS_BASE_URL || "https://ws.colissimo.fr";

  const now = new Date();
  const depositDate = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0"),
  ].join("-");

  const body = {
    outputFormat: { x: 0, y: 0, outputPrintingType: "PDF_10x15_300dpi" },
    letter: {
      service: {
        productCode: "DOM",
        depositDate,
        orderNumber: "predators-TEST-OK-API",
      },
      parcel: { weight: 0.25 },
      sender: {
        address: {
          companyName: "predators",
          line2: "1 RUE DE LA FONDERIE",
          countryCode: "FR",
          zipCode: "67000",
          city: "STRASBOURG",
        },
      },
      addressee: {
        address: {
          lastName: "CLIENT",
          firstName: "TEST",
          line2: "1 RUE DU DOME",
          countryCode: "FR",
          zipCode: "67000",
          city: "STRASBOURG",
        },
      },
    },
  };

  const response = await fetch(
    `${baseUrl}/sls-ws/SlsServiceWSRest/3.1/generateLabel`,
    {
      method: "POST",
      headers: {
        Accept: "multipart/related, application/json",
        "Content-Type": "application/json",
        apikey: apiKey,
      },
      body: JSON.stringify(body),
    }
  );

  const contentType = response.headers.get("content-type") ?? "";
  const buf = Buffer.from(await response.arrayBuffer());
  const snippet = buf.toString("latin1").slice(0, 300);

  console.log("[test/colissimo] status:", response.status);
  console.log("[test/colissimo] content-type:", contentType);
  console.log("[test/colissimo] body (first 300 latin1):", snippet);

  return NextResponse.json({
    status: response.status,
    contentType,
  });
}
