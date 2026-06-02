// src/features/invoices/pdf/invoice-pdf.ts
import "server-only";
import { readFileSync, readdirSync } from "fs";
import { join } from "path";
import { PDFDocument, PDFImage, rgb, PDFFont, RGB } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import type { InvoiceForPdf } from "../server/types";
import { parseShippingSnapshotFromNotes } from "../server/shipping-snapshot";
import { getCountryName } from "@/lib/constants/countries";

// --- DESIGN CONSTANTS ---
const COLORS = {
  primary: rgb(0.06, 0.1, 0.2), // Deep navy — headings, grand total
  text: rgb(0.1, 0.1, 0.1), // Soft near-black for body
  muted: rgb(0.42, 0.45, 0.5), // Mid grey for labels/captions
  border: rgb(0.9, 0.91, 0.92), // Hairline grey
  band: rgb(0.97, 0.97, 0.98), // Very light band for table header / totals
  paidText: rgb(0.12, 0.48, 0.3),
  paidBg: rgb(0.91, 0.95, 0.93),
  pendingText: rgb(0.7, 0.33, 0.04),
  pendingBg: rgb(0.98, 0.95, 0.9),
};

// A4 in points and layout rhythm
const PAGE_SIZE: [number, number] = [595.28, 841.89];
const MARGIN = 50;
const LINE = 14; // baseline rhythm
const FOOTER_RESERVE = 30; // bottom band kept clear for the page number

const I18N = {
  en: {
    invoice: "INVOICE",
    invoiceNo: "Invoice no.",
    date: "Invoice date",
    orderRef: "Order",
    saleDate: "Order date",
    dueDate: "Due date",
    payableOnReceipt: "Payable on receipt",
    paidOn: "Paid on",
    paidBy: "Paid by",
    status: "Status",
    from: "FROM",
    billTo: "BILL TO",
    deliveryAddress: "Delivery address",
    sameAsBilling: "Same as billing address",
    description: "Description",
    qty: "Qty",
    unitPrice: "Unit price",
    amount: "Amount",
    totalHT: "Total excl. VAT",
    totalDue: "TOTAL DUE",
    totalUpper: "TOTAL",
    vatIncludedNote: "Amounts shown include VAT.",
    vatExemptNote:
      "VAT not applicable, art. 293 B of the French General Tax Code (CGI)",
    sirenLabel: "SIREN:",
    siretLabel: "SIRET:",
    vatLabel: "Intra-EU VAT:",
    phone: "Phone:",
    email: "Email:",
    noBillingAddress: "No billing address on file",
    shippingLinePrefix: "Shipping —",
    home: "Home",
    pickupPoint: "Pickup point",
    standard: "Standard",
    express: "Express",
    statusIssued: "Unpaid",
    statusPaid: "Paid",
    statusCanceled: "Canceled",
    pageOf: "/",
    legalLines: [
      "Early-payment discount: none.",
      "Legal guarantee of conformity (French Consumer Code, art. L217-3 et seq.): 2 years, plus the guarantee against hidden defects (Civil Code, art. 1641 et seq.).",
    ],
  },
  fr: {
    invoice: "FACTURE",
    invoiceNo: "Facture n°",
    date: "Date de facture",
    orderRef: "Commande",
    saleDate: "Date de commande",
    dueDate: "Échéance",
    payableOnReceipt: "Paiement comptant à réception",
    paidOn: "Payée le",
    paidBy: "Réglée par",
    status: "Statut",
    from: "ÉMETTEUR",
    billTo: "FACTURER À",
    deliveryAddress: "Adresse de livraison",
    sameAsBilling: "Identique à l'adresse de facturation",
    description: "Désignation",
    qty: "Qté",
    unitPrice: "Prix unitaire",
    amount: "Montant",
    totalHT: "Total HT",
    totalDue: "TOTAL À PAYER",
    totalUpper: "TOTAL",
    vatIncludedNote: "Montants exprimés TTC, TVA incluse.",
    vatExemptNote: "TVA non applicable, art. 293 B du CGI",
    sirenLabel: "SIREN :",
    siretLabel: "SIRET :",
    vatLabel: "N° TVA intracom. :",
    phone: "Tél. :",
    email: "Email :",
    noBillingAddress: "Aucune adresse de facturation",
    shippingLinePrefix: "Livraison —",
    home: "Domicile",
    pickupPoint: "Point relais",
    standard: "Standard",
    express: "Express",
    statusIssued: "Non payée",
    statusPaid: "Payée",
    statusCanceled: "Annulée",
    pageOf: "/",
    legalLines: [
      "Conditions d'escompte pour paiement anticipé : néant.",
      "Garantie légale de conformité (art. L217-3 et s. du Code de la consommation) : 2 ans, ainsi que la garantie des vices cachés (art. 1641 et s. du Code civil).",
    ],
  },
} as const;

type Locale = "en" | "fr";

// DejaVuSans lacks the narrow/regular no-break spaces that Intl uses as the
// fr-FR thousands and currency separators, so they would render as .notdef
// boxes. Normalize them to a plain space (which the font does have).
function normalizeSpaces(s: string): string {
  return s.replace(/[\u00A0\u202F\u2009\u2007\u2008\u2060]/g, " ");
}

// Format money strictly from integer cents using Intl.NumberFormat
function formatMoneyFromCents(
  cents: number,
  currency: string = "EUR",
  locale: Locale = "en"
): string {
  const safeCurrency = currency || "EUR";
  const amount =
    typeof cents === "number" && !Number.isNaN(cents) ? cents / 100 : 0;

  return normalizeSpaces(
    new Intl.NumberFormat(locale === "fr" ? "fr-FR" : "en-IE", {
      style: "currency",
      currency: safeCurrency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount)
  );
}

// Format date to a locale-aware, human readable form
function formatDate(date: Date | string, locale: Locale = "en"): string {
  const d = typeof date === "string" ? new Date(date) : date;
  if (Number.isNaN(d.getTime())) return "";
  return normalizeSpaces(
    new Intl.DateTimeFormat(locale === "fr" ? "fr-FR" : "en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).format(d)
  );
}

// Safe getter for JSON snapshot fields
function safeGet(obj: unknown, key: string, fallback: string = "N/A"): string {
  if (!obj || typeof obj !== "object") return fallback;
  const value = (obj as Record<string, unknown>)[key];
  if (value === null || value === undefined) return fallback;
  return String(value);
}

// Get numeric value from snapshot (for cents)
function safeGetNumber(obj: unknown, key: string, fallback: number = 0): number {
  if (!obj || typeof obj !== "object") return fallback;
  const value = (obj as Record<string, unknown>)[key];
  if (value === null || value === undefined) return fallback;
  const num = typeof value === "number" ? value : parseFloat(String(value));
  return isNaN(num) ? fallback : num;
}

// Snapshot string value, normalized to a trimmed string or null (drops "N/A")
function field(obj: unknown, key: string): string | null {
  const s = safeGet(obj, key);
  const t = s && s !== "N/A" ? s.trim() : "";
  return t === "" ? null : t;
}

/**
 * Greedy word-wrap that measures real glyph widths. Long tokens are hard-broken
 * character-by-character to fit maxWidth. (A single glyph wider than maxWidth —
 * not possible at the sizes used here — is the only case that could still spill.)
 */
function wrapText(
  text: string,
  font: PDFFont,
  size: number,
  maxWidth: number
): string[] {
  const norm = String(text).replace(/\s+/g, " ").trim();
  if (!norm) return [];
  const words = norm.split(" ");
  const lines: string[] = [];
  let line = "";
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (font.widthOfTextAtSize(test, size) <= maxWidth) {
      line = test;
      continue;
    }
    if (line) lines.push(line);
    if (font.widthOfTextAtSize(w, size) > maxWidth) {
      let chunk = "";
      for (const ch of w) {
        if (font.widthOfTextAtSize(chunk + ch, size) <= maxWidth) {
          chunk += ch;
        } else {
          if (chunk) lines.push(chunk);
          chunk = ch;
        }
      }
      line = chunk;
    } else {
      line = w;
    }
  }
  if (line) lines.push(line);
  return lines;
}

// Detect image type by magic bytes and embed appropriately
async function embedImageByMagic(
  pdfDoc: PDFDocument,
  bytes: Uint8Array
): Promise<PDFImage> {
  if (bytes.length >= 2 && bytes[0] === 0xff && bytes[1] === 0xd8) {
    return pdfDoc.embedJpg(bytes);
  }
  return pdfDoc.embedPng(bytes);
}

/**
 * Resolve the company logo: prefer the configured remote logoUrl (fetched with a
 * short timeout), fall back to the first local brand asset. Never throws.
 */
async function loadLogo(
  pdfDoc: PDFDocument,
  logoUrl: string | null
): Promise<PDFImage | undefined> {
  if (logoUrl && /^https?:\/\//i.test(logoUrl)) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 4000);
      const res = await fetch(logoUrl, { signal: controller.signal });
      clearTimeout(timeout);
      if (res.ok) {
        const bytes = new Uint8Array(await res.arrayBuffer());
        return await embedImageByMagic(pdfDoc, bytes);
      }
    } catch (error) {
      console.warn(`[invoice-pdf] Remote logo fetch failed (${logoUrl}):`, error);
    }
  }

  try {
    const brandDir = join(process.cwd(), "src", "assets", "brand");
    const files = readdirSync(brandDir).filter((f) =>
      /\.(png|jpe?g)$/i.test(f)
    );
    if (files.length > 0) {
      const bytes = readFileSync(join(brandDir, files[0]));
      return await embedImageByMagic(pdfDoc, bytes);
    }
  } catch (error) {
    console.warn("[invoice-pdf] Local logo fallback failed:", error);
  }

  return undefined;
}

function localizedStatus(status: string, L: (typeof I18N)[Locale]): string {
  switch (status.toUpperCase()) {
    case "PAID":
      return L.statusPaid;
    case "CANCELED":
    case "CANCELLED":
    case "VOID":
      return L.statusCanceled;
    default:
      return L.statusIssued;
  }
}

/**
 * Render invoice PDF to Buffer using pdf-lib with Unicode TTF fonts.
 */
export async function renderInvoicePdfBuffer(
  invoice: InvoiceForPdf,
  locale: Locale = "en"
): Promise<Buffer> {
  const L = I18N[locale] ?? I18N.en;
  const pdfDoc = await PDFDocument.create();

  // Register fontkit for Unicode font embedding
  pdfDoc.registerFontkit(
    fontkit as unknown as Parameters<typeof pdfDoc.registerFontkit>[0]
  );

  const FONT_DIR = join(process.cwd(), "src", "assets", "fonts");
  const loadFont = (file: string): Uint8Array => {
    try {
      return readFileSync(join(FONT_DIR, file));
    } catch {
      throw new Error(
        `Invoice PDF font file not found at ${join(FONT_DIR, file)}. Please add the Unicode TTF to this path.`
      );
    }
  };

  // Embed genuine regular + bold weights (no faux bold)
  const font = await pdfDoc.embedFont(loadFont("DejaVuSans.ttf"), {
    subset: true,
  });
  let fontBold: PDFFont;
  try {
    fontBold = await pdfDoc.embedFont(loadFont("DejaVuSans-Bold.ttf"), {
      subset: true,
    });
  } catch (error) {
    console.warn("[invoice-pdf] Bold font missing, falling back to regular:", error);
    fontBold = font;
  }

  const company = (invoice.companySnapshot as Record<string, unknown>) || {};
  const logoImage = await loadLogo(pdfDoc, field(company, "logoUrl"));

  // --- MUTABLE PAGE STATE (closures below reference the *current* page) ---
  let page = pdfDoc.addPage(PAGE_SIZE);
  const { width, height } = page.getSize();
  const contentWidth = width - 2 * MARGIN;
  const leftRail = MARGIN;
  const rightRail = width - MARGIN;
  let y = height - MARGIN;

  const drawLeft = (
    text: string,
    x: number,
    yy: number,
    size: number,
    f: PDFFont = font,
    color: RGB = COLORS.text
  ) => {
    page.drawText(text, { x, y: yy, size, font: f, color });
  };

  const drawRight = (
    text: string,
    xRight: number,
    yy: number,
    size: number,
    f: PDFFont = font,
    color: RGB = COLORS.text
  ) => {
    const w = f.widthOfTextAtSize(text, size);
    page.drawText(text, { x: xRight - w, y: yy, size, font: f, color });
  };

  const hairline = (yy: number, x1 = leftRail, x2 = rightRail) => {
    page.drawLine({
      start: { x: x1, y: yy },
      end: { x: x2, y: yy },
      thickness: 0.5,
      color: COLORS.border,
    });
  };

  // ========================= HEADER =========================
  const headerTop = y;

  // Logo (left)
  let logoBottom = headerTop;
  if (logoImage) {
    const maxW = 150;
    const maxH = 60;
    const ratio = logoImage.width / logoImage.height;
    let lw = maxW;
    let lh = maxW / ratio;
    if (lh > maxH) {
      lh = maxH;
      lw = maxH * ratio;
    }
    page.drawImage(logoImage, {
      x: leftRail,
      y: headerTop - lh,
      width: lw,
      height: lh,
    });
    logoBottom = headerTop - lh;
  } else {
    // Wordmark fallback so the header is never empty
    const brand = field(company, "brandName") || field(company, "legalName") || "";
    if (brand) {
      drawLeft(brand, leftRail, headerTop - 18, 18, fontBold, COLORS.primary);
      logoBottom = headerTop - 26;
    }
  }

  // Title + meta (right)
  drawRight(L.invoice, rightRail, headerTop - 18, 22, fontBold, COLORS.primary);
  drawRight(
    `${L.invoiceNo} ${invoice.invoiceNumber}`,
    rightRail,
    headerTop - 34,
    10,
    font,
    COLORS.muted
  );

  // Meta mini-table
  const dueText = field(company, "paymentTerms") || L.payableOnReceipt;
  const issuedDate = invoice.issuedAt || invoice.createdAt;
  const metaRows: Array<[string, string]> = [
    [L.date, formatDate(issuedDate, locale)],
  ];
  if (invoice.order?.orderNumber) {
    metaRows.push([L.orderRef, invoice.order.orderNumber]);
  }
  if (invoice.order?.createdAt) {
    metaRows.push([L.saleDate, formatDate(invoice.order.createdAt, locale)]);
  }
  metaRows.push([L.dueDate, dueText]);
  if (invoice.paidAt) {
    metaRows.push([L.paidOn, formatDate(invoice.paidAt, locale)]);
    const provider = invoice.order?.payment?.provider;
    if (provider) {
      const method =
        provider === "STRIPE"
          ? locale === "fr"
            ? "Carte bancaire (Stripe)"
            : "Card (Stripe)"
          : String(provider);
      metaRows.push([L.paidBy, method]);
    }
  }

  const metaLabelX = rightRail - 200;
  let metaY = headerTop - 52;
  for (const [label, value] of metaRows) {
    drawLeft(label, metaLabelX, metaY, 9, font, COLORS.muted);
    drawRight(value, rightRail, metaY, 9, font, COLORS.text);
    metaY -= 13;
  }

  // Status badge (pill), right-aligned under the meta rows
  {
    const label = localizedStatus(invoice.status, L).toUpperCase();
    const isPaid = invoice.status.toUpperCase() === "PAID";
    const isCanceled = ["CANCELED", "CANCELLED", "VOID"].includes(
      invoice.status.toUpperCase()
    );
    const bg = isPaid ? COLORS.paidBg : isCanceled ? COLORS.band : COLORS.pendingBg;
    const fg = isPaid
      ? COLORS.paidText
      : isCanceled
        ? COLORS.muted
        : COLORS.pendingText;
    const size = 8.5;
    const padX = 9;
    const h = 16;
    const tw = fontBold.widthOfTextAtSize(label, size);
    const w = tw + padX * 2;
    const bx = rightRail - w;
    const by = metaY - 4;
    const r = h / 2;
    // Pill = center rect + rounded caps
    page.drawRectangle({ x: bx + r, y: by, width: w - 2 * r, height: h, color: bg });
    page.drawCircle({ x: bx + r, y: by + r, size: r, color: bg });
    page.drawCircle({ x: bx + w - r, y: by + r, size: r, color: bg });
    page.drawText(label, {
      x: bx + padX,
      y: by + (h - size) / 2 + 1,
      size,
      font: fontBold,
      color: fg,
    });
    metaY = by - 6;
  }

  y = Math.min(logoBottom, metaY) - 18;
  hairline(y);
  y -= 22;

  // ===================== FROM / BILL TO =====================
  const gutter = 24;
  const colWidth = (contentWidth - gutter) / 2;
  const colRightX = leftRail + colWidth + gutter;
  const captionSize = 8;
  const bodySize = 9.5;

  drawLeft(L.from, leftRail, y, captionSize, fontBold, COLORS.muted);
  drawLeft(L.billTo, colRightX, y, captionSize, fontBold, COLORS.muted);
  const blockTop = y - 14;

  // ---- FROM (seller identity) ----
  const sellerLines: Array<{ text: string; bold?: boolean }> = [];
  const legalName = field(company, "legalName");
  if (legalName) sellerLines.push({ text: legalName, bold: true });
  const brandName = field(company, "brandName");
  if (brandName && brandName !== legalName) sellerLines.push({ text: brandName });
  const addr1 = field(company, "addressLine1");
  if (addr1) sellerLines.push({ text: addr1 });
  const addr2 = field(company, "addressLine2");
  if (addr2) sellerLines.push({ text: addr2 });
  const cityLine = [field(company, "postalCode"), field(company, "city")]
    .filter(Boolean)
    .join(" ");
  if (cityLine) sellerLines.push({ text: cityLine });
  const sellerCountry = field(company, "country");
  if (sellerCountry) sellerLines.push({ text: sellerCountry });
  const siret = field(company, "siret");
  const siren = field(company, "siren");
  if (siret) sellerLines.push({ text: `${L.siretLabel} ${siret}` });
  else if (siren) sellerLines.push({ text: `${L.sirenLabel} ${siren}` });

  // VAT identity / rate resolution
  const vatId = field(company, "vatId");
  const rawVatRate = safeGetNumber(company, "vatRate", NaN);
  const hasVatRateField = Number.isFinite(rawVatRate);
  // Effective VAT rate in basis points (legacy snapshots: default to 20% when a VAT id exists)
  const vatRateBp = hasVatRateField ? rawVatRate : vatId ? 2000 : 0;
  const vatApplies =
    invoice.taxCents > 0 || (vatRateBp > 0 && Boolean(vatId));

  if (vatId && vatApplies) {
    sellerLines.push({ text: `${L.vatLabel} ${vatId}` });
  }
  const sellerEmail = field(company, "email");
  if (sellerEmail) sellerLines.push({ text: `${L.email} ${sellerEmail}` });
  const sellerPhone = field(company, "phone");
  if (sellerPhone) sellerLines.push({ text: `${L.phone} ${sellerPhone}` });

  let fromY = blockTop;
  for (const ln of sellerLines) {
    for (const wrapped of wrapText(ln.text, ln.bold ? fontBold : font, bodySize, colWidth)) {
      drawLeft(wrapped, leftRail, fromY, bodySize, ln.bold ? fontBold : font, COLORS.text);
      fromY -= LINE;
    }
  }

  // ---- BILL TO (customer + delivery) ----
  const addr = invoice.order?.address;
  const billingLines: string[] = [];
  if (addr) {
    if (addr.fullName?.trim()) billingLines.push(addr.fullName.trim());
    if (addr.line1?.trim()) billingLines.push(addr.line1.trim());
    if (addr.line2 != null && String(addr.line2).trim() !== "")
      billingLines.push(String(addr.line2).trim());
    const pc = [addr.postalCode, addr.city].filter(Boolean).join(" ").trim();
    if (pc) billingLines.push(pc);
    const countryName = getCountryName(addr.country);
    if (countryName) billingLines.push(countryName);
    if (addr.phone != null && String(addr.phone).trim() !== "")
      billingLines.push(`${L.phone} ${String(addr.phone).trim()}`);
  }
  if (billingLines.length === 0) billingLines.push(L.noBillingAddress);

  let toY = blockTop;
  billingLines.forEach((line, i) => {
    const f = i === 0 ? fontBold : font;
    for (const wrapped of wrapText(line, f, bodySize, colWidth)) {
      drawLeft(wrapped, colRightX, toY, bodySize, f, COLORS.text);
      toY -= LINE;
    }
  });

  // Delivery sub-block
  const shippingSnapshot = invoice.order?.notes
    ? parseShippingSnapshotFromNotes(invoice.order.notes)
    : null;

  toY -= 6;
  drawLeft(L.deliveryAddress, colRightX, toY, captionSize, fontBold, COLORS.muted);
  toY -= 13;

  if (shippingSnapshot?.deliveryMode === "pickup" && shippingSnapshot.pickupPoint) {
    const pp = shippingSnapshot.pickupPoint;
    const ppLines: string[] = [];
    if (pp.name?.trim()) ppLines.push(pp.name.trim());
    if (pp.addressLine1?.trim()) ppLines.push(pp.addressLine1.trim());
    const ppPc = [pp.postalCode, pp.city].filter(Boolean).join(" ").trim();
    if (ppPc) ppLines.push(ppPc);
    const ppCountry = getCountryName(pp.country);
    if (ppCountry) ppLines.push(ppCountry);
    if (ppLines.length === 0) ppLines.push("—"); // keep spacing if relay data is empty
    for (const line of ppLines) {
      for (const wrapped of wrapText(line, font, bodySize, colWidth)) {
        drawLeft(wrapped, colRightX, toY, bodySize, font, COLORS.text);
        toY -= LINE;
      }
    }
  } else {
    drawLeft(L.sameAsBilling, colRightX, toY, bodySize, font, COLORS.muted);
    toY -= LINE;
  }

  y = Math.min(fromY, toY) - 24;

  // ===================== LINE ITEMS TABLE =====================
  const productItems: unknown[] = Array.isArray(invoice.lineItemsSnapshot)
    ? [...invoice.lineItemsSnapshot]
    : [];

  const productsSubtotalCents = productItems.reduce(
    (sum: number, item) => sum + safeGetNumber(item, "totalCents", 0),
    0
  );
  const shippingCents = shippingSnapshot?.shippingCents ?? 0;

  // Build display rows (products + an optional shipping row)
  type Row = { description: string; qty: string; unit: number; total: number };
  const rows: Row[] = productItems.map((item) => {
    const variant = field(item, "variantLabel");
    const name = safeGet(item, "productName");
    return {
      description: variant ? `${name} — ${variant}` : name,
      qty: safeGet(item, "quantity", "0"),
      unit: safeGetNumber(item, "unitPriceCents", 0),
      total: safeGetNumber(item, "totalCents", 0),
    };
  });

  if (shippingSnapshot) {
    const carrierLabel =
      shippingSnapshot.carrierId === "colissimo"
        ? "Colissimo"
        : shippingSnapshot.carrierId;
    const modeKey = shippingSnapshot.deliveryMode === "home" ? "home" : "pickupPoint";
    const speedKey = shippingSnapshot.speed === "standard" ? "standard" : "express";
    rows.push({
      description: `${L.shippingLinePrefix} ${carrierLabel} (${L[modeKey]}, ${L[speedKey]})`,
      qty: "1",
      unit: shippingCents,
      total: shippingCents,
    });
  }

  // Column geometry
  const descX = leftRail + 8;
  const descWrapWidth = contentWidth * 0.56 - 12;
  const qtyRight = leftRail + contentWidth * 0.66;
  const unitRight = leftRail + contentWidth * 0.83;
  const amountRight = rightRail - 8;
  const cellSize = 9.5;
  const bottomLimit = MARGIN + FOOTER_RESERVE;

  const drawTableHeader = () => {
    page.drawRectangle({
      x: leftRail,
      y: y - 16,
      width: contentWidth,
      height: 22,
      color: COLORS.band,
    });
    const ty = y - 11;
    drawLeft(L.description, descX, ty, 8.5, fontBold, COLORS.primary);
    drawRight(L.qty, qtyRight, ty, 8.5, fontBold, COLORS.primary);
    drawRight(L.unitPrice, unitRight, ty, 8.5, fontBold, COLORS.primary);
    drawRight(L.amount, amountRight, ty, 8.5, fontBold, COLORS.primary);
    y -= 28;
  };

  const newPage = (withTableHeader = true) => {
    page = pdfDoc.addPage(PAGE_SIZE);
    y = height - MARGIN;
    if (withTableHeader) drawTableHeader();
  };

  drawTableHeader();

  for (const row of rows) {
    const descLines = wrapText(row.description, font, cellSize, descWrapWidth);
    const rowHeight = Math.max(descLines.length, 1) * LINE + 8;
    if (y - rowHeight < bottomLimit) newPage();

    descLines.forEach((ln, i) => {
      drawLeft(ln, descX, y - i * LINE, cellSize, font, COLORS.text);
    });
    drawRight(row.qty, qtyRight, y, cellSize, font, COLORS.text);
    drawRight(
      formatMoneyFromCents(row.unit, invoice.currency, locale),
      unitRight,
      y,
      cellSize,
      font,
      COLORS.text
    );
    drawRight(
      formatMoneyFromCents(row.total, invoice.currency, locale),
      amountRight,
      y,
      cellSize,
      font,
      COLORS.text
    );

    hairline(y - rowHeight + 6);
    y -= rowHeight;
  }

  // ===================== TOTALS =====================
  const grandTtcCents = productsSubtotalCents + shippingCents + invoice.taxCents;
  let htCents: number;
  let vatCents: number;
  if (invoice.taxCents > 0) {
    htCents = productsSubtotalCents + shippingCents;
    vatCents = invoice.taxCents;
  } else if (vatApplies) {
    htCents = Math.round(grandTtcCents / (1 + vatRateBp / 10000));
    vatCents = grandTtcCents - htCents;
  } else {
    htCents = grandTtcCents;
    vatCents = 0;
  }

  // Effective rate label, e.g. "TVA 20%". Derive from amounts when stored explicitly.
  const ratePctNumber = vatApplies
    ? hasVatRateField || invoice.taxCents === 0
      ? vatRateBp / 100
      : htCents > 0
        ? Math.round((vatCents / htCents) * 1000) / 10
        : vatRateBp / 100
    : 0;
  const ratePct = Number.isInteger(ratePctNumber)
    ? String(ratePctNumber)
    : ratePctNumber.toFixed(1);
  const vatRowLabel = locale === "fr" ? `TVA ${ratePct} %` : `VAT ${ratePct}%`;

  const totalsW = 230;
  const totalsLabelLeftX = rightRail - totalsW;
  const totalsValueRightX = rightRail;

  y -= 16;
  // Ensure totals block fits; otherwise move to a fresh page
  const totalsNeeded = vatApplies ? 3 * LINE + 34 : LINE + 34;
  if (y - totalsNeeded < bottomLimit) newPage(false);

  if (vatApplies) {
    drawLeft(L.totalHT, totalsLabelLeftX, y, 10, font, COLORS.muted);
    drawRight(
      formatMoneyFromCents(htCents, invoice.currency, locale),
      totalsValueRightX,
      y,
      10,
      font,
      COLORS.text
    );
    y -= LINE + 2;
    drawLeft(vatRowLabel, totalsLabelLeftX, y, 10, font, COLORS.muted);
    drawRight(
      formatMoneyFromCents(vatCents, invoice.currency, locale),
      totalsValueRightX,
      y,
      10,
      font,
      COLORS.text
    );
    y -= LINE + 6;
  }

  // Grand total band
  hairline(y + 6, totalsLabelLeftX, totalsValueRightX);
  const bandH = 26;
  page.drawRectangle({
    x: totalsLabelLeftX,
    y: y - bandH + 8,
    width: totalsW,
    height: bandH,
    color: COLORS.band,
  });
  const grandLabel = vatApplies ? L.totalDue : L.totalUpper;
  drawLeft(grandLabel, totalsLabelLeftX + 8, y - 2, 11, fontBold, COLORS.primary);
  drawRight(
    formatMoneyFromCents(grandTtcCents, invoice.currency, locale),
    totalsValueRightX - 8,
    y - 2,
    12,
    fontBold,
    COLORS.primary
  );
  y -= bandH + 6;

  // VAT note under totals (left-aligned, small)
  const vatNoteText = vatApplies
    ? L.vatIncludedNote
    : field(company, "vatNote") || L.vatExemptNote;
  for (const wrapped of wrapText(vatNoteText, font, 9, contentWidth)) {
    if (y - LINE < bottomLimit) newPage(false);
    drawLeft(wrapped, leftRail, y, 9, font, COLORS.muted);
    y -= LINE;
  }

  // ===================== LEGAL FOOTER =====================
  const footerLines: string[] = [...L.legalLines];
  const legalFooter = field(company, "legalFooter");
  if (legalFooter) {
    for (const part of legalFooter.split(/\r?\n/)) {
      if (part.trim()) footerLines.push(part.trim());
    }
  }

  y -= 12;
  if (y - LINE < bottomLimit) newPage(false);
  hairline(y + 4);
  y -= 8;
  for (const raw of footerLines) {
    for (const wrapped of wrapText(raw, font, 7.5, contentWidth)) {
      if (y - 11 < bottomLimit) newPage(false);
      drawLeft(wrapped, leftRail, y, 7.5, font, COLORS.muted);
      y -= 11;
    }
  }

  // ===================== PAGE NUMBERS (second pass) =====================
  const pages = pdfDoc.getPages();
  if (pages.length > 1) {
    pages.forEach((p, i) => {
      const label = `${i + 1} ${L.pageOf} ${pages.length}`;
      const w = font.widthOfTextAtSize(label, 8);
      p.drawText(label, {
        x: p.getWidth() - MARGIN - w,
        y: 34,
        size: 8,
        font,
        color: COLORS.muted,
      });
    });
  }

  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
}
