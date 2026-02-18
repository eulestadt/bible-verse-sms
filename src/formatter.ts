import type { BiblePassageResult } from "./bible-api";

const MAX_SMS_SEGMENT = 160;

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
 * Split long message into segments (each <= MAX_SMS_SEGMENT) if needed.
 * Twilio sends each as a separate SMS; for very long passages we don't split mid-word.
 */
export function segmentForSms(text: string): string[] {
  if (text.length <= MAX_SMS_SEGMENT) return [text];
  const segments: string[] = [];
  let remaining = text;
  while (remaining.length > 0) {
    if (remaining.length <= MAX_SMS_SEGMENT) {
      segments.push(remaining);
      break;
    }
    const chunk = remaining.slice(0, MAX_SMS_SEGMENT);
    const lastSpace = chunk.lastIndexOf(" ");
    const cut = lastSpace > MAX_SMS_SEGMENT * 0.5 ? lastSpace : MAX_SMS_SEGMENT;
    segments.push(remaining.slice(0, cut).trim());
    remaining = remaining.slice(cut).trim();
  }
  return segments;
}
