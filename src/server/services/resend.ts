// src/server/services/resend.ts
import "server-only";
import { Resend } from "resend";
import type { SendEmailParams } from "./email";

let resendClient: Resend | null = null;

function getResendClient(): Resend | null {
  if (resendClient) {
    return resendClient;
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return null;
  }

  try {
    resendClient = new Resend(apiKey);
    return resendClient;
  } catch (error) {
    console.error("[email] Failed to create Resend client:", error);
    return null;
  }
}

export function isResendConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM);
}

export async function sendEmailViaResend(
  params: SendEmailParams,
): Promise<void> {
  const client = getResendClient();
  const from = process.env.EMAIL_FROM;

  if (!client || !from) {
    throw new Error("Resend not configured");
  }

  try {
    await client.emails.send({
      from,
      to: params.to,
      subject: params.subject,
      html: params.html,
      text: params.text,
    });
    console.log(`[email] Email sent via Resend to ${params.to}`);
  } catch (error) {
    console.error(`[email] Failed to send email via Resend to ${params.to}:`, error);
    throw error;
  }
}

