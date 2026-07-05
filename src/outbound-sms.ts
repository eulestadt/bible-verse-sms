import { normalizePhone } from "./carriers";
import { getSubscription } from "./chat-store";
import { isEmailConfigured, sendSmsViaEmail } from "./email";

/** Outbound SMS via carrier email gateway (Resend). Requires an active subscription with carrier. */
export async function replyViaEmailGateway(from: string, text: string): Promise<boolean> {
  const phone = normalizePhone(from);
  if (!phone || !isEmailConfigured()) return false;

  const sub = getSubscription(phone);
  if (!sub?.active) return false;

  return sendSmsViaEmail(phone, sub.carrierId, text);
}
