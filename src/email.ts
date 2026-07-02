import { Resend } from "resend";
import { phoneToSmsEmail } from "./carriers";
import { getConfig } from "./config";
import { splitForSending } from "./chat-gemini";

const SMS_SUBJECT = "Message";

function getResendClient(): Resend | null {
  const { resendApiKey } = getConfig();
  if (!resendApiKey) return null;
  return new Resend(resendApiKey);
}

export function isEmailConfigured(): boolean {
  const { resendApiKey, resendFromEmail } = getConfig();
  return Boolean(resendApiKey && resendFromEmail);
}

function formatFromAddress(email: string, name: string): string {
  return `${name} <${email}>`;
}

async function sendResendEmail(to: string, text: string): Promise<boolean> {
  const resend = getResendClient();
  const { resendFromEmail, resendFromName, resendInboundAddress } = getConfig();
  if (!resend || !resendFromEmail) {
    console.error("Resend not configured (RESEND_API_KEY + RESEND_FROM_EMAIL)");
    return false;
  }

  const { error } = await resend.emails.send({
    from: formatFromAddress(resendFromEmail, resendFromName),
    to: [to],
    replyTo: resendInboundAddress,
    subject: SMS_SUBJECT,
    text,
    tags: [{ name: "service", value: "ai-chat" }],
  });

  if (error) {
    console.error("Resend send error", error);
    return false;
  }
  return true;
}

export async function sendSmsViaEmail(
  phone: string,
  carrierId: string,
  body: string
): Promise<boolean> {
  if (!isEmailConfigured()) return false;

  const to = phoneToSmsEmail(phone, carrierId);
  if (!to) {
    console.error("Invalid phone or carrier for SMS email:", phone, carrierId);
    return false;
  }

  const segments = splitForSending(body);

  try {
    for (const segment of segments) {
      const sent = await sendResendEmail(to, segment);
      if (!sent) return false;
      if (segments.length > 1) {
        await delay(400);
      }
    }
    return true;
  } catch (err) {
    console.error("Resend send error", err);
    return false;
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
