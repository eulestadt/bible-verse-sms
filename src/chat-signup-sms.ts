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
import { sendSms } from "./sms";
import { normalizeZip } from "./zip";

const CARRIER_PROMPT =
  "Reply carrier: verizon, att, tmobile, sprint, cricket, metro, boost, uscellular, googlefi, virgin";

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

async function completeSmsSignup(phone: string, zipCode: string, carrierId: string): Promise<boolean> {
  const sub = subscribe(phone, carrierId, zipCode);
  if (!sub) {
    await sendSms(phone, `Bad carrier. ${CARRIER_PROMPT}`);
    return true;
  }

  clearPendingSmsSignup(phone);
  const sent = await sendSmsViaEmail(sub.phone, sub.carrierId, CHAT_WELCOME_SMS);
  if (!sent) {
    await sendSms(phone, "Signup saved but welcome text failed. Text us to try chat.");
  }
  return true;
}

/**
 * SMS signup: text a ZIP (then carrier), or "ZIP CARRIER" in one message.
 * Returns true when the message was consumed by the signup flow.
 */
export async function tryHandleChatSignupSms(from: string, body: string): Promise<boolean> {
  if (!isEmailConfigured()) return false;

  const phone = normalizePhone(from);
  if (!phone) return false;

  const existing = getSubscription(phone);
  if (existing?.active) return false;

  const pending = getPendingSmsSignup(phone);
  const carrierOnly = resolveCarrierId(body.trim());
  if (pending && carrierOnly) {
    await completeSmsSignup(phone, pending.zipCode, carrierOnly);
    return true;
  }

  const parsed = parseZipSignupMessage(body);
  if (!parsed) return false;

  if (parsed.carrierId) {
    await completeSmsSignup(phone, parsed.zipCode, parsed.carrierId);
    return true;
  }

  if (!normalizeZip(parsed.zipCode)) return false;

  setPendingSmsSignup(phone, parsed.zipCode);
  await sendSms(from, CARRIER_PROMPT);
  return true;
}
