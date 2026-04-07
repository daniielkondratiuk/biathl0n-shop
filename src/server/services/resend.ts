// src/server/services/resend.ts
import "server-only";
import { Resend } from "resend";

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

export interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
  text: string;
}

export async function sendEmail(params: SendEmailParams): Promise<void> {
  const client = getResendClient();
  const from = process.env.EMAIL_FROM;

  if (!client || !from) {
    console.warn("[email] Resend not configured, skipping");
    return;
  }

  try {
    await client.emails.send({
      from,
      to: params.to,
      subject: params.subject,
      html: params.html,
      text: params.text,
    });
    console.log(`[email] Email sent successfully to ${params.to}`);
  } catch (error) {
    console.error(`[email] Failed to send email to ${params.to}:`, error);
    throw error;
  }
}

