import { getCarrierById, normalizePhone } from "./carriers";

const ONE_HOUR_MS = 60 * 60 * 1000;

export interface ChatSubscription {
  phone: string;
  carrierId: string;
  consentedAt: number;
  active: boolean;
}

export interface ChatMessage {
  role: "user" | "assistant";
  text: string;
  timestamp: number;
}

const subscriptions = new Map<string, ChatSubscription>();
const conversations = new Map<string, ChatMessage[]>();

export function subscribe(phone: string, carrierId: string): ChatSubscription | null {
  const normalized = normalizePhone(phone);
  if (!normalized || !getCarrierById(carrierId)) return null;

  const sub: ChatSubscription = {
    phone: normalized,
    carrierId: carrierId.toLowerCase(),
    consentedAt: Date.now(),
    active: true,
  };
  subscriptions.set(normalized, sub);
  return sub;
}

export function getSubscription(phone: string): ChatSubscription | undefined {
  const normalized = normalizePhone(phone);
  if (!normalized) return undefined;
  return subscriptions.get(normalized);
}

export function unsubscribe(phone: string): boolean {
  const normalized = normalizePhone(phone);
  if (!normalized) return false;
  const sub = subscriptions.get(normalized);
  if (!sub) return false;
  sub.active = false;
  conversations.delete(normalized);
  return true;
}

export function addMessage(phone: string, role: "user" | "assistant", text: string): void {
  const normalized = normalizePhone(phone);
  if (!normalized) return;
  const list = conversations.get(normalized) ?? [];
  list.push({ role, text, timestamp: Date.now() });
  conversations.set(normalized, list);
}

/** Messages from the last hour only — cheap context that still feels conversational. */
export function getRecentHistory(phone: string): ChatMessage[] {
  const normalized = normalizePhone(phone);
  if (!normalized) return [];
  const cutoff = Date.now() - ONE_HOUR_MS;
  return (conversations.get(normalized) ?? []).filter((m) => m.timestamp > cutoff);
}
