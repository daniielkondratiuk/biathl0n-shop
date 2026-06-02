// src/server/services/smtp.ts
import "server-only";
import nodemailer, { type Transporter } from "nodemailer";
import type { SendEmailParams } from "./email";

let transporter: Transporter | null = null;

function getTransporter(): Transporter | null {
  if (transporter) {
    return transporter;
  }

  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    return null;
  }

  const port = Number(process.env.SMTP_PORT) || 465;
  const secure = port === 465;

  try {
    transporter = nodemailer.createTransport({
      host,
      port,
      // Port 465 uses implicit TLS; other ports (e.g. 587) upgrade via STARTTLS.
      secure,
      // For non-implicit-TLS ports, require STARTTLS so we never silently fall
      // back to sending credentials/body over a plaintext connection.
      requireTLS: !secure,
      auth: { user, pass },
    });
    return transporter;
  } catch (error) {
    console.error("[email] Failed to create SMTP transporter:", error);
    return null;
  }
}

export function isSmtpConfigured(): boolean {
  return Boolean(
    process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS,
  );
}

/**
 * Resolve the SMTP "from" address. Most SMTP providers (OVH included) require
 * the envelope sender to match the authenticated mailbox, so we default to
 * COMPANY_EMAIL / SMTP_USER while preserving the display name configured in
 * EMAIL_FROM (e.g. `predators Shop <...>`) for branding.
 *
 * Returns the structured `{ name, address }` form so nodemailer applies
 * RFC 5322 quoting/encoding to the display name (a bare `Name <addr>` string
 * would be mangled by special characters such as commas or quotes).
 */
function resolveSmtpFrom(): string | { name: string; address: string } {
  const address = process.env.COMPANY_EMAIL || process.env.SMTP_USER || "";
  if (!address) {
    return "";
  }

  const emailFrom = process.env.EMAIL_FROM;
  const displayName = emailFrom?.match(/^\s*"?([^"<]+?)"?\s*</)?.[1]?.trim();

  return displayName ? { name: displayName, address } : address;
}

export async function sendEmailViaSmtp(params: SendEmailParams): Promise<void> {
  const client = getTransporter();
  const from = resolveSmtpFrom();

  if (!client || !from) {
    throw new Error("SMTP not configured");
  }

  await client.sendMail({
    from,
    to: params.to,
    subject: params.subject,
    html: params.html,
    text: params.text,
    replyTo: process.env.COMPANY_EMAIL || undefined,
  });
  console.log(`[email] Email sent via SMTP to ${params.to}`);
}
