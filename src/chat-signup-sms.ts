import { normalizePhone, resolveCarrierId } from "./carriers";
import {
  CHAT_WELCOME_SMS,
  clearPendingSmsSignup,
  getPendingSmsSignup,
  getSubscription,
  setPendingSmsSignup,
  subscribe,
} from "./chat-store";
import { isEmailConfigured, sendSmsViaEmail } from "./email";
import { normalizeZip } from "./zip";

const CARRIER_PROMPT =
  "Reply carrier: verizon, att, tmobile, sprint, cricket, metro, boost, uscellular, googlefi, virgin";

export interface ChatSignupSmsResult {
  handled: boolean;
  /** Reply via TwiML in the webhook response (no REST API). */
  twimlReply?: string;
}

/** Parse "17055" or "17055 verizon" from an SMS body. */
export function parseZipSignupMessage(body: string): { zipCode: string; carrierId?: string } | null {
  const trimmed = body.trim();
  const combined = trimmed.match(/^(\d{5})(?:-\d{4})?\s+(.+)$/i);
  if (combined) {
    const zipCode = combined[1];
    const carrierId = resolveCarrierId(combined[2]);
    return carrierId ? { zipCode, carrierId } : { zipCode };
  }
  if (/^\d{5}(?:-\d{4})?$/.test(trimmed)) {
    return { zipCode: trimmed.slice(0, 5) };
  }
  return null;
}

async function completeSmsSignup(
  phone: string,
  zipCode: string,
  carrierId: string
): Promise<ChatSignupSmsResult> {
  const sub = subscribe(phone, carrierId, zipCode);
  if (!sub) {
    return { handled: true, twimlReply: `Bad carrier. ${CARRIER_PROMPT}` };
  }

  clearPendingSmsSignup(phone);
  const sent = await sendSmsViaEmail(sub.phone, sub.carrierId, CHAT_WELCOME_SMS);
  if (!sent) {
    console.error("Welcome email-to-SMS failed after signup", { phone, carrierId });
  }
  return { handled: true };
}

/**
 * SMS signup: text a ZIP (then carrier), or "ZIP CARRIER" in one message.
 * Outbound replies use the email gateway once carrier is known; carrier prompt uses TwiML (no email address yet).
 */
export async function tryHandleChatSignupSms(from: string, body: string): Promise<ChatSignupSmsResult> {
  if (!isEmailConfigured()) return { handled: false };

  const phone = normalizePhone(from);
  if (!phone) return { handled: false };

  const existing = getSubscription(phone);
  if (existing?.active) return { handled: false };

  const pending = getPendingSmsSignup(phone);
  const carrierOnly = resolveCarrierId(body.trim());
  if (pending && carrierOnly) {
    return completeSmsSignup(phone, pending.zipCode, carrierOnly);
  }

  const parsed = parseZipSignupMessage(body);
  if (!parsed) return { handled: false };

  if (parsed.carrierId) {
    return completeSmsSignup(phone, parsed.zipCode, parsed.carrierId);
  }

  if (!normalizeZip(parsed.zipCode)) return { handled: false };

  setPendingSmsSignup(phone, parsed.zipCode);
  return { handled: true, twimlReply: CARRIER_PROMPT };
}
