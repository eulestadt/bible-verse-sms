import { Resend } from "resend";
import { phoneFromGatewayEmail } from "./carriers";
import { processInboundChat } from "./inbound-chat";
import { getConfig } from "./config";

export interface ResendWebhookHeaders {
  id: string;
  timestamp: string;
  signature: string;
}

export function parseResendWebhookEvent(
  payload: string,
  headers: ResendWebhookHeaders
): { type: string; data: { email_id: string; from?: string; to?: string[] } } {
  const { resendApiKey, resendWebhookSecret } = getConfig();
  if (!resendApiKey) {
    throw new Error("Resend API key not configured");
  }

  const resend = new Resend(resendApiKey);

  if (resendWebhookSecret) {
    return resend.webhooks.verify({
      payload,
      headers,
      webhookSecret: resendWebhookSecret,
    }) as { type: string; data: { email_id: string; from?: string; to?: string[] } };
  }

  console.warn("RESEND_WEBHOOK_SECRET not set; processing inbound email without verification");
  return JSON.parse(payload);
}

function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}

function isForInboundAddress(recipients: string[], inboundAddress: string): boolean {
  const target = inboundAddress.toLowerCase();
  return recipients.some((recipient) => recipient.toLowerCase().includes(target));
}

export async function processInboundChatEmail(fromField: string, textBody: string): Promise<void> {
  const phone = phoneFromGatewayEmail(fromField);
  if (!phone) {
    console.warn("Could not parse phone from inbound email:", fromField);
    return;
  }

  await processInboundChat(phone, textBody);
}

export async function processResendInboundEmail(emailId: string): Promise<void> {
  const { resendApiKey, resendInboundAddress } = getConfig();
  if (!resendApiKey) return;

  const resend = new Resend(resendApiKey);
  const { data: email, error } = await resend.emails.receiving.get(emailId);
  if (error || !email) {
    console.error("Failed to fetch received email", error);
    return;
  }

  const recipients = [...(email.to ?? []), ...(email.cc ?? [])];
  if (!isForInboundAddress(recipients, resendInboundAddress)) {
    console.warn("Inbound email not addressed to", resendInboundAddress, recipients);
    return;
  }

  const textBody = email.text?.trim() || stripHtml(email.html ?? "");
  await processInboundChatEmail(email.from, textBody);
}
