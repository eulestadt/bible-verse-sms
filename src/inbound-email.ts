import { Resend } from "resend";
import { phoneFromGatewayEmail } from "./carriers";
import {
  addMessage,
  getRecentHistory,
  getSubscription,
  unsubscribe,
} from "./chat-store";
import { generateChatReply } from "./chat-gemini";
import { getConfig } from "./config";
import { sendSmsViaEmail } from "./email";

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

function normalizeInboundBody(textBody: string): string {
  let body = textBody.trim();
  const quoteIdx = body.search(/\nOn .+ wrote:\s*\n/i);
  if (quoteIdx > 0) body = body.slice(0, quoteIdx).trim();
  return body
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .join(" ")
    .slice(0, 500);
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

  const sub = getSubscription(phone);
  if (!sub || !sub.active) {
    console.warn("Inbound chat from unregistered phone:", phone);
    return;
  }

  const body = normalizeInboundBody(textBody);
  const bodyUpper = body.toUpperCase();

  if (bodyUpper === "STOP") {
    unsubscribe(phone);
    await sendSmsViaEmail(
      phone,
      sub.carrierId,
      "You have been unsubscribed from AI Chat. Sign up again on our website to restart."
    );
    return;
  }
  if (bodyUpper === "HELP") {
    await sendSmsViaEmail(
      phone,
      sub.carrierId,
      "AI Chat: Text anything to chat with AI. Replies are automated. Msg&Data rates may apply. Reply STOP to opt out."
    );
    return;
  }
  if (!body) return;

  const history = getRecentHistory(phone);
  addMessage(phone, "user", body);

  try {
    const reply = await generateChatReply(body, history);
    addMessage(phone, "assistant", reply);
    await sendSmsViaEmail(phone, sub.carrierId, reply);
  } catch (err) {
    console.error("Chat reply error", err);
    await sendSmsViaEmail(phone, sub.carrierId, "Something went wrong. Please try again in a moment.");
  }
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
