import {
  EMAIL_SMS_CHARS_PER_SEGMENT,
  EMAIL_SMS_MAX_CHARS,
  MAX_SMS_SEGMENTS,
} from "./sms-encoding";

export interface Carrier {
  id: string;
  name: string;
  gateway: string;
  /** Extra gateway domains that may appear on inbound reply emails. */
  inboundGateways?: string[];
}

/** US carrier email-to-SMS gateways. */
export const CARRIERS: Carrier[] = [
  { id: "verizon", name: "Verizon", gateway: "vtext.com" },
  { id: "att", name: "AT&T", gateway: "txt.att.net" },
  { id: "tmobile", name: "T-Mobile", gateway: "tmomail.net" },
  { id: "sprint", name: "Sprint / T-Mobile legacy", gateway: "messaging.sprintpcs.com" },
  { id: "uscellular", name: "US Cellular", gateway: "email.uscc.net" },
  { id: "cricket", name: "Cricket", gateway: "sms.cricketwireless.net" },
  { id: "metro", name: "Metro by T-Mobile", gateway: "mymetropcs.com" },
  { id: "boost", name: "Boost Mobile", gateway: "sms.myboostmobile.com" },
  { id: "virgin", name: "Virgin Mobile", gateway: "vmobl.com" },
  { id: "googlefi", name: "Google Fi", gateway: "msg.fi.google.com" },
];

const byId = new Map(CARRIERS.map((c) => [c.id, c]));
const byGateway = new Map<string, Carrier>();

for (const carrier of CARRIERS) {
  byGateway.set(carrier.gateway.toLowerCase(), carrier);
  for (const alias of carrier.inboundGateways ?? []) {
    byGateway.set(alias.toLowerCase(), carrier);
  }
}

export function getCarrierById(id: string): Carrier | undefined {
  return byId.get(id.toLowerCase());
}

export function getCarrierByGateway(gateway: string): Carrier | undefined {
  return byGateway.get(gateway.toLowerCase());
}

/** Chars per email-to-SMS segment (120 — below 160 GSM-7 limit; room for carrier suffix). */
export function getSmsSegmentLimit(_carrierId?: string): number {
  return EMAIL_SMS_CHARS_PER_SEGMENT;
}

/** Max total characters for one email-to-SMS reply. */
export function getSmsMaxChars(_carrierId?: string): number {
  return EMAIL_SMS_MAX_CHARS;
}

/** Normalize to 10-digit US number; returns null if invalid. */
export function normalizePhone(input: string): string | null {
  const digits = input.replace(/\D/g, "");
  if (digits.length === 10) return digits;
  if (digits.length === 11 && digits.startsWith("1")) return digits.slice(1);
  return null;
}

export function phoneToSmsEmail(phone: string, carrierId: string): string | null {
  const normalized = normalizePhone(phone);
  const carrier = getCarrierById(carrierId);
  if (!normalized || !carrier) return null;
  return `${normalized}@${carrier.gateway}`;
}

/** Extract 10-digit phone from carrier gateway email (e.g. 5551234567@vtext.com). */
export function phoneFromGatewayEmail(email: string): string | null {
  const angleMatch = email.match(/<([^>]+)>/);
  const addr = (angleMatch ? angleMatch[1] : email).trim().toLowerCase();
  const match = addr.match(/(\d{10,11})@([\w.-]+)/i);
  if (!match) return null;
  let digits = match[1];
  if (digits.length === 11 && digits.startsWith("1")) digits = digits.slice(1);
  if (digits.length !== 10) return null;
  const gateway = match[2].toLowerCase();
  if (!byGateway.has(gateway)) return null;
  return digits;
}

export { MAX_SMS_SEGMENTS };
