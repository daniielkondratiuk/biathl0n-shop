// src/features/invoices/pdf/invoice-pdf.ts
import "server-only";
import { readFileSync } from "fs";
import { join } from "path";
import { PDFDocument, rgb, PDFFont } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import type { InvoiceForPdf } from "../server/types";
import { parseShippingSnapshotFromNotes } from "../server/shipping-snapshot";
import { getCountryName } from "@/lib/constants/countries";

// --- DESIGN CONSTANTS ---
const COLORS = {
  primary: rgb(0.1, 0.15, 0.3), // Deep Navy Blue
  text: rgb(0.15, 0.15, 0.15), // Soft Black
  muted: rgb(0.5, 0.5, 0.5),   // Grey for labels
  border: rgb(0.9, 0.9, 0.9),  // Light grey for lines
  accentBg: rgb(0.96, 0.97, 0.98), // Very light blue/grey for table headers
};

const I18N = {
  en: {
    invoice: "INVOICE",
    date: "Date:",
    paidOn: "Paid on:",
    status: "Status:",
    from: "FROM",
    billTo: "BILL TO",
    billingAddress: "Billing address",
    shippingAddress: "Shipping address",
    description: "Description",
    qty: "Qty",
    unitPrice: "Unit Price",
    total: "Total",
    subtotal: "Subtotal",
    vat: "VAT",
    totalUpper: "TOTAL",
    paymentTerms: "Payment Terms:",
    phone: "Phone:",
    email: "Email:",
    vatLabel: "VAT:",
    noBillingAddress: "No billing address on file",
    shippingLinePrefix: "Shipping —",
    home: "Home",
    pickupPoint: "Pickup point",
    standard: "Standard",
    express: "Express",
  },
  fr: {
    invoice: "FACTURE",
    date: "Date :",
    paidOn: "Payée le :",
    status: "Statut :",
    from: "ÉMETTEUR",
    billTo: "FACTURER À",
    billingAddress: "Adresse de facturation",
    shippingAddress: "Adresse de livraison",
    description: "Description",
    qty: "Qté",
    unitPrice: "Prix unitaire",
    total: "Total",
    subtotal: "Sous-total",
    vat: "TVA",
    totalUpper: "TOTAL",
    paymentTerms: "Modalités de paiement :",
    phone: "Téléphone :",
    email: "Email :",
    vatLabel: "TVA :",
    noBillingAddress: "Aucune adresse de facturation",
    shippingLinePrefix: "Livraison —",
    home: "Domicile",
    pickupPoint: "Point relais",
    standard: "Standard",
    express: "Express",
  },
} as const;

// Format money strictly from integer cents using Intl.NumberFormat
function formatMoneyFromCents(
  cents: number,
  currency: string = "EUR",
  locale: "en" | "fr" = "en"
): string {
  const safeCurrency = currency || "EUR";
  const amount =
    typeof cents === "number" && !Number.isNaN(cents) ? cents / 100 : 0;

  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: safeCurrency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

// Format date to YYYY-MM-DD
function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
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

/**
 * Render invoice PDF to Buffer using pdf-lib with Unicode TTF font.
 */
export async function renderInvoicePdfBuffer(
  invoice: InvoiceForPdf,
  locale: "en" | "fr" = "en"
): Promise<Buffer> {
  const L = I18N[locale] ?? I18N.en;
  const pdfDoc = await PDFDocument.create();

  // Register fontkit for Unicode font embedding
  pdfDoc.registerFontkit(fontkit as unknown as Parameters<typeof pdfDoc.registerFontkit>[0]);

  // Path to a Unicode TTF font (must exist in the repo)
  const FONT_PATH = join(process.cwd(), "src", "assets", "fonts", "DejaVuSans.ttf");

  let fontBytes: Uint8Array;
  try {
    fontBytes = readFileSync(FONT_PATH);
  } catch {
    throw new Error(
      `Invoice PDF font file not found at ${FONT_PATH}. Please add a Unicode TTF (e.g. DejaVuSans.ttf) to this path.`
    );
  }

  // Embed Unicode font (supports Cyrillic, Latin, numbers)
  const unicodeFont = await pdfDoc.embedFont(fontBytes, { subset: true });
  // In a real scenario, you might load a separate Bold font file, but using the same one is safe for logic
  const unicodeFontBold = unicodeFont; 

  // Load and embed company logo
  const LOGO_PATH = join(process.cwd(), "src", "assets", "brand", "predators.png");
  let logoImage;
  try {
    const logoBytes = readFileSync(LOGO_PATH);
    logoImage = await pdfDoc.embedPng(logoBytes);
  } catch {
    console.warn(`Company logo not found at ${LOGO_PATH}, continuing without logo`);
  }

  const page = pdfDoc.addPage([595, 842]); // A4 size in points
  const { width, height } = page.getSize();
  
  const margin = 40;
  const pageWidth = width - 2 * margin;
  let yPos = height - margin;

  // --- HELPER: Right Aligned Text ---
  const drawTextRight = (text: string, xRight: number, y: number, size: number, font: PDFFont, color = COLORS.text) => {
    const textWidth = font.widthOfTextAtSize(text, size);
    page.drawText(text, { x: xRight - textWidth, y, size, font, color });
  };

  // --- HEADER SECTION ---
  
  // 1. Logo (Left)
  if (logoImage) {
    const logoMaxWidth = 140; 
    const logoMaxHeight = 70;
    const logoAspectRatio = logoImage.width / logoImage.height;
    
    let logoWidth = logoMaxWidth;
    let logoHeight = logoMaxWidth / logoAspectRatio;
    if (logoHeight > logoMaxHeight) {
      logoHeight = logoMaxHeight;
      logoWidth = logoMaxHeight * logoAspectRatio;
    }
    
    page.drawImage(logoImage, {
      x: margin, // Logo on Left
      y: yPos - logoHeight,
      width: logoWidth,
      height: logoHeight,
    });
  }

  // 2. Invoice Details (Right Aligned)
  const fontSizeLarge = 24;
  const fontSize = 10;
  const fontSizeSmall = 9;
  const lineHeight = 14;

  let headerY = yPos - 10;

  drawTextRight(L.invoice, width - margin, headerY, fontSizeLarge, unicodeFontBold, COLORS.primary);
  headerY -= 25;

  drawTextRight(`#${invoice.invoiceNumber}`, width - margin, headerY, 12, unicodeFont, COLORS.muted);
  headerY -= 20;

  // Invoice Meta Data Block
  const metaLabelX = width - margin - 80;
  
  drawTextRight(L.date, metaLabelX, headerY, fontSizeSmall, unicodeFont, COLORS.muted);
  const issuedDate = invoice.issuedAt || invoice.createdAt;
  drawTextRight(formatDate(issuedDate), width - margin, headerY, fontSizeSmall, unicodeFont, COLORS.text);
  headerY -= lineHeight;

  if (invoice.paidAt) {
    drawTextRight(L.paidOn, metaLabelX, headerY, fontSizeSmall, unicodeFont, COLORS.muted);
    drawTextRight(formatDate(invoice.paidAt), width - margin, headerY, fontSizeSmall, unicodeFont, COLORS.text);
    headerY -= lineHeight;
  }

  drawTextRight(L.status, metaLabelX, headerY, fontSizeSmall, unicodeFont, COLORS.muted);
  // Colorize status
  const statusColor = invoice.status === 'PAID' ? rgb(0, 0.6, 0) : COLORS.text;
  drawTextRight(invoice.status.toUpperCase(), width - margin, headerY, fontSizeSmall, unicodeFontBold, statusColor);
  
  // Reset Y Position to below the logo/header
  yPos = Math.min(yPos - 80, headerY - 30);

  // --- DATA PREPARATION ---
  
  const company = (invoice.companySnapshot as Record<string, unknown>) || {};
  const lineItems: unknown[] = Array.isArray(invoice.lineItemsSnapshot) ? [...invoice.lineItemsSnapshot] : [];
  
  const shippingSnapshot = parseShippingSnapshotFromNotes(invoice.order.notes);
  
  if (shippingSnapshot) {
    const carrierLabel = shippingSnapshot.carrierId === "colissimo" ? "Colissimo" : shippingSnapshot.carrierId;
    const deliveryModeKey = shippingSnapshot.deliveryMode === "home" ? "home" : "pickupPoint";
    const speedKey = shippingSnapshot.speed === "standard" ? "standard" : "express";
    const shippingDescription = `${L.shippingLinePrefix} ${carrierLabel} (${L[deliveryModeKey]}, ${L[speedKey]})`;
    
    lineItems.push({
      productName: shippingDescription,
      variantLabel: null,
      quantity: 1,
      unitPriceCents: shippingSnapshot.shippingCents,
      totalCents: shippingSnapshot.shippingCents,
    });
  }

  // --- ADDRESSES SECTION ---

  const colWidth = (pageWidth - 20) / 2;
  const leftX = margin;
  const rightX = margin + colWidth + 20;
  
  // Section Headers
  page.drawText(L.from, { x: leftX, y: yPos, size: 8, font: unicodeFontBold, color: COLORS.muted });
  page.drawText(L.billTo, { x: rightX, y: yPos, size: 8, font: unicodeFontBold, color: COLORS.muted });
  yPos -= 15;

  const addressStartY = yPos;

  // FROM Content
  let fromY = addressStartY;
  
  const companyLines = [
    { text: safeGet(company, "legalName"), bold: true },
    { text: safeGet(company, "brandName") !== "N/A" ? safeGet(company, "brandName") : null, bold: false },
    { text: safeGet(company, "addressLine1"), bold: false },
    { text: safeGet(company, "addressLine2") !== "N/A" ? safeGet(company, "addressLine2") : null, bold: false },
    { text: `${safeGet(company, "postalCode")} ${safeGet(company, "city")}`, bold: false },
    { text: safeGet(company, "country"), bold: false },
    { text: `${L.email} ${safeGet(company, "email")}`, bold: false },
    { text: safeGet(company, "phone") !== "N/A" ? `${L.phone} ${safeGet(company, "phone")}` : null, bold: false },
    { text: safeGet(company, "vatId") !== "N/A" ? `${L.vatLabel} ${safeGet(company, "vatId")}` : null, bold: false },
  ].filter(l => l.text);

  for (const line of companyLines) {
    if (line.text) {
      page.drawText(line.text, { 
        x: leftX, 
        y: fromY, 
        size: fontSize, 
        font: line.bold ? unicodeFontBold : unicodeFont, 
        color: COLORS.text 
      });
      fromY -= lineHeight;
    }
  }

  // TO Content: Billing address (always), Shipping address (pickup or same as billing)
  let toY = addressStartY;

  const addr = invoice.order.address;
  const billingLines: string[] = [];
  if (addr) {
    if (addr.fullName?.trim()) billingLines.push(addr.fullName.trim());
    if (addr.line1?.trim()) billingLines.push(addr.line1.trim());
    if (addr.line2 != null && String(addr.line2).trim() !== "") billingLines.push(addr.line2.trim());
    const pc = [addr.postalCode, addr.city].filter(Boolean).join(" ").trim();
    if (pc) billingLines.push(pc);
    const countryName = getCountryName(addr.country);
    if (countryName) billingLines.push(countryName);
    if (addr.phone != null && String(addr.phone).trim() !== "") billingLines.push(`Phone: ${addr.phone.trim()}`);
  }
  if (billingLines.length === 0) billingLines.push(L.noBillingAddress);

  page.drawText(L.billingAddress, {
    x: rightX,
    y: toY,
    size: 8,
    font: unicodeFontBold,
    color: COLORS.muted,
  });
  toY -= 12;

  for (const line of billingLines) {
    page.drawText(line, {
      x: rightX,
      y: toY,
      size: fontSize,
      font: unicodeFont,
      color: COLORS.text,
    });
    toY -= lineHeight;
  }

  // Shipping address block: pickup when pickup, else same as billing
  toY -= lineHeight * 0.5;
  page.drawText(L.shippingAddress, {
    x: rightX,
    y: toY,
    size: 8,
    font: unicodeFontBold,
    color: COLORS.muted,
  });
  toY -= 12;

  if (shippingSnapshot?.deliveryMode === "pickup" && shippingSnapshot.pickupPoint) {
    const pp = shippingSnapshot.pickupPoint;
    const shippingLines: string[] = [];
    if (pp.name?.trim()) shippingLines.push(pp.name.trim());
    if (pp.addressLine1?.trim()) shippingLines.push(pp.addressLine1.trim());
    const ppPc = [pp.postalCode, pp.city].filter(Boolean).join(" ").trim();
    if (ppPc) shippingLines.push(ppPc);
    const ppCountry = getCountryName(pp.country);
    if (ppCountry) shippingLines.push(ppCountry);
    for (const line of shippingLines) {
      page.drawText(line, {
        x: rightX,
        y: toY,
        size: fontSize,
        font: unicodeFont,
        color: COLORS.text,
      });
      toY -= lineHeight;
    }
  } else {
    for (const line of billingLines) {
      page.drawText(line, {
        x: rightX,
        y: toY,
        size: fontSize,
        font: unicodeFont,
        color: COLORS.text,
      });
      toY -= lineHeight;
    }
  }

  yPos = Math.min(fromY, toY) - 40;

  // --- ITEMS TABLE ---

  // Layout Columns
  const col1X = margin + 10; // Description (Left aligned)
  const col2X = margin + pageWidth * 0.55; // Qty (Right aligned)
  const col3X = margin + pageWidth * 0.75; // Unit (Right aligned)
  const col4X = margin + pageWidth - 10;   // Total (Right aligned)

  // Header Background
  page.drawRectangle({
    x: margin,
    y: yPos - 5,
    width: pageWidth,
    height: 25,
    color: COLORS.accentBg,
  });

  // Table Headers
  const headerYPos = yPos + 3;
  page.drawText(L.description, { x: col1X, y: headerYPos, size: 9, font: unicodeFontBold, color: COLORS.primary });
  drawTextRight(L.qty, col2X, headerYPos, 9, unicodeFontBold, COLORS.primary);
  drawTextRight(L.unitPrice, col3X, headerYPos, 9, unicodeFontBold, COLORS.primary);
  drawTextRight(L.total, col4X, headerYPos, 9, unicodeFontBold, COLORS.primary);

  yPos -= 25;

  // Table Rows
  for (const item of lineItems) {
    // Page break check
    if (yPos < 100) {
      pdfDoc.addPage([595, 842]);
      yPos = height - margin;
      // Redraw headers on new page
      page.drawRectangle({ x: margin, y: yPos - 5, width: pageWidth, height: 25, color: COLORS.accentBg });
      page.drawText(L.description, { x: col1X, y: yPos + 3, size: 9, font: unicodeFontBold, color: COLORS.primary });
      drawTextRight(L.qty, col2X, yPos + 3, 9, unicodeFontBold, COLORS.primary);
      drawTextRight(L.unitPrice, col3X, yPos + 3, 9, unicodeFontBold, COLORS.primary);
      drawTextRight(L.total, col4X, yPos + 3, 9, unicodeFontBold, COLORS.primary);
      yPos -= 25;
    }
    
    const description = `${safeGet(item, "productName")}${safeGet(item, "variantLabel") !== "N/A" ? ` - ${safeGet(item, "variantLabel")}` : ""}`;
    const quantity = safeGet(item, "quantity", "0");
    const unitPriceCents = safeGetNumber(item, "unitPriceCents", 0);
    const totalCents = safeGetNumber(item, "totalCents", 0);
    
    // Text Wrapping for Description
    // Basic approximate char wrapping (assuming avg char width ~5 for size 10)
    const maxChars = 45; 
    const descLines = description.length > maxChars 
      ? [description.substring(0, maxChars), description.substring(maxChars)] 
      : [description];
    
    // Draw Description
    for (let i = 0; i < descLines.length; i++) {
      page.drawText(descLines[i], {
        x: col1X,
        y: yPos - (i * lineHeight),
        size: fontSize,
        font: unicodeFont,
        color: COLORS.text
      });
    }
    
    // Draw Numbers (Right Aligned)
    drawTextRight(quantity, col2X, yPos, fontSize, unicodeFont);
    drawTextRight(formatMoneyFromCents(unitPriceCents, invoice.currency, locale), col3X, yPos, fontSize, unicodeFont);
    drawTextRight(formatMoneyFromCents(totalCents, invoice.currency, locale), col4X, yPos, fontSize, unicodeFont); // Bold total?

    const rowHeight = (lineHeight * Math.max(1, descLines.length)) + 10;
    
    // Light separator line
    page.drawLine({
        start: { x: margin, y: yPos - rowHeight + 8 },
        end: { x: margin + pageWidth, y: yPos - rowHeight + 8 },
        thickness: 0.5,
        color: COLORS.border,
    });

    yPos -= rowHeight;
  }

  yPos -= 10;

  // --- TOTALS SECTION ---
  
  // Calculate Totals
  const productsSubtotalCents = lineItems
    .filter((item) => !safeGet(item, "productName").startsWith("Shipping —"))
    .reduce((sum: number, item) => sum + safeGetNumber(item, "totalCents", 0), 0);
  const shippingCents = shippingSnapshot?.shippingCents ?? 0;
  const computedSubtotalCents = productsSubtotalCents + shippingCents;
  const computedTotalCents = computedSubtotalCents + invoice.taxCents;

  const totalsRightX = margin + pageWidth - 10;
  const totalsLabelX = totalsRightX - 100;

  // Subtotal
  drawTextRight(L.subtotal, totalsLabelX, yPos, fontSize, unicodeFont, COLORS.muted);
  drawTextRight(formatMoneyFromCents(computedSubtotalCents, invoice.currency, locale), totalsRightX, yPos, fontSize, unicodeFont, COLORS.text);
  yPos -= lineHeight + 5;

  // VAT
  drawTextRight(L.vat, totalsLabelX, yPos, fontSize, unicodeFont, COLORS.muted);
  drawTextRight(formatMoneyFromCents(invoice.taxCents, invoice.currency, locale), totalsRightX, yPos, fontSize, unicodeFont, COLORS.text);
  yPos -= lineHeight + 5;

  // Grand Total Background
  page.drawRectangle({
    x: totalsLabelX - 60,
    y: yPos - 10,
    width: 200, // Extend to right edge approx
    height: 30,
    color: COLORS.accentBg,
  });

  // Grand Total Text
  const totalY = yPos - 2;
  drawTextRight(L.totalUpper, totalsLabelX, totalY, 12, unicodeFontBold, COLORS.primary);
  drawTextRight(formatMoneyFromCents(computedTotalCents, invoice.currency, locale), totalsRightX, totalY, 12, unicodeFontBold, COLORS.primary);

  // --- FOOTER SECTION ---
  // Positioned at bottom of page
  const footerY = 50; 
  let currentFooterY = footerY + 30;

  // Horizontal Footer Line
  page.drawLine({
    start: { x: margin, y: currentFooterY },
    end: { x: width - margin, y: currentFooterY },
    thickness: 1,
    color: COLORS.border,
  });
  
  currentFooterY -= 15;

  // Helper for centered text
  const drawCenteredMuted = (text: string, y: number) => {
    const widthText = unicodeFont.widthOfTextAtSize(text, 8);
    page.drawText(text, {
        x: (width - widthText) / 2,
        y: y,
        size: 8,
        font: unicodeFont,
        color: COLORS.muted
    });
  };

  const footerText = safeGet(company, "legalFooter");
  if (footerText !== "N/A") {
      drawCenteredMuted(footerText.substring(0, 120), currentFooterY); // Limit length to avoid overflow
      currentFooterY -= 10;
  }

  const vatNote = safeGet(company, "vatNote");
  if (vatNote !== "N/A") {
      drawCenteredMuted(vatNote.substring(0, 120), currentFooterY);
      currentFooterY -= 10;
  }
  
  if (safeGet(company, "paymentTerms") !== "N/A") {
      drawCenteredMuted(`${L.paymentTerms} ${safeGet(company, "paymentTerms")}`, currentFooterY);
  }

  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
}