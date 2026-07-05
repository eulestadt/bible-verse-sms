import {
  DEFAULT_SMS_SEGMENT,
  GSM7_CHARS_PER_SEGMENT,
  MAX_SMS_SEGMENTS,
  MMS_EMAIL_TEXT_MAX,
} from "./sms-encoding";

export interface Carrier {
  id: string;
  name: string;
  gateway: string;
  /** Use carrier MMS email gateway (e.g. Verizon @vzwpix.com) for longer text without SMS suffix overhead. */
  mms?: boolean;
  /** Text appended by SMS gateways (not MMS); reduces usable chars per 160-char segment. */
  smsSuffix?: string;
  /** Extra gateway domains that may appear on inbound reply emails. */
  inboundGateways?: string[];
}

/** US carrier email-to-SMS/MMS gateways. */
export const CARRIERS: Carrier[] = [
  {
    id: "verizon",
    name: "Verizon",
    gateway: "vzwpix.com",
    mms: true,
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

/** Max characters per outbound chunk for a carrier (GSM-7 segment or MMS email body). */
export function getSmsSegmentLimit(carrierId?: string): number {
  const carrier = carrierId ? getCarrierById(carrierId) : undefined;
  if (carrier?.mms) return MMS_EMAIL_TEXT_MAX;
  const suffixLen = carrier?.smsSuffix?.length ?? 0;
  return GSM7_CHARS_PER_SEGMENT - suffixLen;
}

/** Max total characters for one reply (segments × limit, or single MMS body). */
export function getSmsMaxChars(carrierId?: string): number {
  const carrier = carrierId ? getCarrierById(carrierId) : undefined;
  if (carrier?.mms) return MMS_EMAIL_TEXT_MAX;
  return getSmsSegmentLimit(carrierId) * MAX_SMS_SEGMENTS;
}

export function isMmsCarrier(carrierId?: string): boolean {
  return Boolean(carrierId && getCarrierById(carrierId)?.mms);
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
