import type { BiblePassageResult } from "./bible-api";
import { getSmsBodyLimit, hasMmsFallback } from "./carriers";
import { toGsm7 } from "./gsm7";
import {
  DEFAULT_SMS_SEGMENT,
  GSM7_CHARS_PER_SEGMENT,
  MAX_SMS_SEGMENTS,
  MMS_EMAIL_TEXT_MAX,
} from "./sms-encoding";

/**
 * Format verse + version label + optional context + attribution for SMS.
 * Long replies are sent as multiple segments (Twilio handles concatenation).
 */
export function formatReply(
  passage: BiblePassageResult | null,
  withContext: boolean
): string {
  if (!passage) {
    return "Sorry, I couldn’t find that verse. Try a reference like “John 3:16” or “Psalm 23:1” (add “ESV” or “NIV” for another version).";
  }

  const versionLabel = passage.version || "KJV";
  const content = passage.content.replace(/\s*\[[^\]]*\]\s*/g, " ").replace(/\s+/g, " ").trim();
  let body = `${passage.reference} ${versionLabel}\n${content}`;

  if (passage.copyright) {
    body += `\n${passage.copyright}`;
  }

  return body.trim();
}

/**
 * Split long message into segments (each <= maxSegment).
 * Uses GSM-7 segment size (160 chars) unless a lower limit is passed for carrier suffix overhead.
 */
export function segmentForSms(text: string, maxSegment = GSM7_CHARS_PER_SEGMENT): string[] {
  if (text.length <= maxSegment) return [text];
  const segments: string[] = [];
  let remaining = text;
  while (remaining.length > 0) {
    if (remaining.length <= maxSegment) {
      segments.push(remaining);
      break;
    }
    const chunk = remaining.slice(0, maxSegment);
    const lastSpace = chunk.lastIndexOf(" ");
    const cut = lastSpace > maxSegment * 0.5 ? lastSpace : maxSegment;
    segments.push(remaining.slice(0, cut).trim());
    remaining = remaining.slice(cut).trim();
  }
  return segments;
}

/** Split for outbound email-to-SMS/MMS. Verizon: one vtext SMS if short, else one vzwpix MMS. */
export function splitForSending(
  text: string,
  carrierId?: string,
  maxSegments = MAX_SMS_SEGMENTS
): string[] {
  const normalized = toGsm7(text.replace(/\s+/g, " ").trim());

  if (carrierId && hasMmsFallback(carrierId)) {
    const smsLimit = getSmsBodyLimit(carrierId);
    if (normalized.length <= smsLimit) return [normalized];
    return [normalized.slice(0, MMS_EMAIL_TEXT_MAX)];
  }

  const maxSegment = carrierId ? getSmsBodyLimit(carrierId) : DEFAULT_SMS_SEGMENT;
  return segmentForSms(normalized, maxSegment).slice(0, maxSegments);
}
