import type { BiblePassageResult } from "./bible-api";
import { getSmsSegmentLimit } from "./carriers";

const MAX_SMS_SEGMENT = 160;
const MAX_SMS_SEGMENTS = 4;

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
  // Strip [...] (e.g. verse numbers) from content to maximize space for verse text
  const content = passage.content.replace(/\s*\[[^\]]*\]\s*/g, " ").replace(/\s+/g, " ").trim();
  // Compact format: reference + version, single newline, then content
  let body = `${passage.reference} ${versionLabel}\n${content}`;

  if (passage.copyright) {
    body += `\n${passage.copyright}`;
  }

  return body.trim();
}

/**
 * Split long message into segments (each <= maxSegment) if needed.
 * Twilio sends each as a separate SMS; email-to-SMS should pass a lower maxSegment
 * when the carrier appends text (e.g. Verizon adds "(Message)").
 */
export function segmentForSms(text: string, maxSegment = MAX_SMS_SEGMENT): string[] {
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

/** Split for outbound email-to-SMS; respects carrier suffix overhead. */
export function splitForSending(
  text: string,
  carrierId?: string,
  maxSegments = MAX_SMS_SEGMENTS
): string[] {
  const normalized = text.replace(/\s+/g, " ").trim();
  const maxSegment = carrierId ? getSmsSegmentLimit(carrierId) : MAX_SMS_SEGMENT;
  return segmentForSms(normalized, maxSegment).slice(0, maxSegments);
}
