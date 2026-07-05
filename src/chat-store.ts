import { getCarrierById, normalizePhone } from "./carriers";
import { normalizeZip } from "./zip";

const ONE_HOUR_MS = 60 * 60 * 1000;
const PENDING_SIGNUP_MS = 30 * 60 * 1000;

export interface ChatSubscription {
  phone: string;
  carrierId: string;
  zipCode: string;
  consentedAt: number;
  active: boolean;
}

export interface ChatMessage {
  role: "user" | "assistant";
  text: string;
  timestamp: number;
}

export interface PendingSmsSignup {
  zipCode: string;
  createdAt: number;
}

const subscriptions = new Map<string, ChatSubscription>();
const conversations = new Map<string, ChatMessage[]>();
const pendingSmsSignups = new Map<string, PendingSmsSignup>();

export function subscribe(phone: string, carrierId: string, zipCode: string): ChatSubscription | null {
  const normalized = normalizePhone(phone);
  const zip = normalizeZip(zipCode);
  if (!normalized || !getCarrierById(carrierId) || !zip) return null;

  const sub: ChatSubscription = {
    phone: normalized,
    carrierId: carrierId.toLowerCase(),
    zipCode: zip,
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
  pendingSmsSignups.delete(normalized);
  return true;
}

export function setPendingSmsSignup(phone: string, zipCode: string): void {
  const normalized = normalizePhone(phone);
  const zip = normalizeZip(zipCode);
  if (!normalized || !zip) return;
  pendingSmsSignups.set(normalized, { zipCode: zip, createdAt: Date.now() });
}

export function getPendingSmsSignup(phone: string): PendingSmsSignup | undefined {
  const normalized = normalizePhone(phone);
  if (!normalized) return undefined;
  const pending = pendingSmsSignups.get(normalized);
  if (!pending) return undefined;
  if (Date.now() - pending.createdAt > PENDING_SIGNUP_MS) {
    pendingSmsSignups.delete(normalized);
    return undefined;
  }
  return pending;
}

export function clearPendingSmsSignup(phone: string): void {
  const normalized = normalizePhone(phone);
  if (normalized) pendingSmsSignups.delete(normalized);
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

export const CHAT_WELCOME_SMS = "Signed up! Text to chat. STOP to quit.";
