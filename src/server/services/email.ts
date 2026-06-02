// src/server/services/email.ts
import "server-only";
import { isSmtpConfigured, sendEmailViaSmtp } from "./smtp";
import { isResendConfigured, sendEmailViaResend } from "./resend";

export interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
  text: string;
}

/**
 * Send a transactional email.
 *
 * Primary transport is SMTP (OVH); Resend is kept as a fallback. Behaviour:
 *  - SMTP succeeds                         -> returns true.
 *  - SMTP fails, Resend configured         -> falls back to Resend.
 *  - SMTP fails, Resend NOT configured     -> throws (so the caller does not
 *    treat a failed delivery as success and the email can be retried later).
 *  - No transport configured at all        -> logs and returns false (the
 *    caller can then skip marking the email as sent).
 *
 * The boolean return tells callers whether a transport actually delivered the
 * email, so idempotency flags (e.g. invoice.emailSentAt) are only set on a
 * real send rather than on a silently-skipped no-op.
 */
export async function sendEmail(params: SendEmailParams): Promise<boolean> {
  const resendConfigured = isResendConfigured();

  if (isSmtpConfigured()) {
    try {
      await sendEmailViaSmtp(params);
      return true;
    } catch (error) {
      if (!resendConfigured) {
        // No fallback available — propagate the failure instead of swallowing
        // it, otherwise the caller would mark the email as sent though nothing
        // was delivered.
        throw error;
      }
      // NOTE: nodemailer can reject *after* the SMTP server already accepted
      // the message (e.g. a timeout while reading the final response), so this
      // fallback can, in rare cases, deliver the same email twice. We accept
      // that trade-off in favour of availability; if duplicates become a
      // problem, gate the fallback on error.code (only retry connection/auth
      // failures that prove the message was never accepted).
      console.error(
        `[email] SMTP delivery to ${params.to} failed, falling back to Resend:`,
        error,
      );
    }
  }

  if (resendConfigured) {
    await sendEmailViaResend(params);
    return true;
  }

  console.warn(
    `[email] No email transport configured (SMTP or Resend), skipping email to ${params.to}`,
  );
  return false;
}
