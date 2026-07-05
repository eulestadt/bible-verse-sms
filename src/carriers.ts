import { toGsm7 } from "./gsm7";
import {
  DEFAULT_SMS_SEGMENT,
  GSM7_CHARS_PER_SEGMENT,
  MAX_SMS_SEGMENTS,
  MMS_EMAIL_TEXT_MAX,
} from "./sms-encoding";

export interface Carrier {
  id: string;
  name: string;
  /** Fast SMS email gateway (e.g. Verizon @vtext.com). */
  gateway: string;
  /** Slower MMS gateway for longer text (e.g. Verizon @vzwpix.com). */
  mmsGateway?: string;
  /** Text appended by SMS gateways; reduces usable chars per 160-char segment. */
  smsSuffix?: string;
  /** Extra gateway domains that may appear on inbound reply emails. */
  inboundGateways?: string[];
}

/** US carrier email-to-SMS/MMS gateways. */
export const CARRIERS: Carrier[] = [
  {
    id: "verizon",
    name: "Verizon",
    gateway: "vtext.com",
    mmsGateway: "vzwpix.com",
    smsSuffix: "(Message)",
    inboundGateways: ["vtext.com", "vzwpix.com"],
  },
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
  if (carrier.mmsGateway) byGateway.set(carrier.mmsGateway.toLowerCase(), carrier);
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

/** GSM-7 chars that fit one SMS after carrier suffix (e.g. Verizon "(Message)"). */
export function getSmsBodyLimit(carrierId?: string): number {
  const carrier = carrierId ? getCarrierById(carrierId) : undefined;
  const suffixLen = carrier?.smsSuffix?.length ?? 0;
  return GSM7_CHARS_PER_SEGMENT - suffixLen;
}

/** Prefer this limit in AI prompts (one fast SMS segment). */
export function getSmsSegmentLimit(carrierId?: string): number {
  return carrierId ? getSmsBodyLimit(carrierId) : GSM7_CHARS_PER_SEGMENT;
}

/** Max total characters for one reply. */
export function getSmsMaxChars(carrierId?: string): number {
  const carrier = carrierId ? getCarrierById(carrierId) : undefined;
  if (carrier?.mmsGateway) return MMS_EMAIL_TEXT_MAX;
  return getSmsBodyLimit(carrierId) * MAX_SMS_SEGMENTS;
}

export function hasMmsFallback(carrierId?: string): boolean {
  return Boolean(carrierId && getCarrierById(carrierId)?.mmsGateway);
}

/** Pick vtext for short Verizon text, vzwpix when over one SMS segment. */
export function pickOutboundGateway(carrier: Carrier, normalizedBody: string): string {
  if (carrier.mmsGateway) {
    const smsLimit = GSM7_CHARS_PER_SEGMENT - (carrier.smsSuffix?.length ?? 0);
    if (normalizedBody.length <= smsLimit) return carrier.gateway;
    return carrier.mmsGateway;
  }
  return carrier.gateway;
}

export function usesMmsGateway(carrierId: string, normalizedBody: string): boolean {
  const carrier = getCarrierById(carrierId);
  if (!carrier?.mmsGateway) return false;
  return pickOutboundGateway(carrier, normalizedBody) === carrier.mmsGateway;
}

/** Normalize to 10-digit US number; returns null if invalid. */
export function normalizePhone(input: string): string | null {
  const digits = input.replace(/\D/g, "");
  if (digits.length === 10) return digits;
  if (digits.length === 11 && digits.startsWith("1")) return digits.slice(1);
  return null;
}

export function phoneToSmsEmail(phone: string, carrierId: string, body?: string): string | null {
  const normalized = normalizePhone(phone);
  const carrier = getCarrierById(carrierId);
  if (!normalized || !carrier) return null;
  const gateway =
    body !== undefined
      ? pickOutboundGateway(carrier, toGsm7(body.replace(/\s+/g, " ").trim()))
      : carrier.gateway;
  return `${normalized}@${gateway}`;
}

/** Extract 10-digit phone from carrier gateway email (e.g. 5551234567@vzwpix.com). */
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

export { DEFAULT_SMS_SEGMENT };
