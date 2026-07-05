/**
 * SMS segment sizes (max payload 1120 bits per segment in GSM 03.40).
 * Character counts vary by encoding:
 *   GSM-7 (7-bit) → 160 chars
 *   8-bit         → 140 chars
 *   UCS-2 (16-bit) → 70 chars
 *
 * We normalize outbound text to GSM-7 (see gsm7.ts) so Twilio and most gateways use 160/segment.
 */
export const GSM7_CHARS_PER_SEGMENT = 160;
export const EIGHT_BIT_CHARS_PER_SEGMENT = 140;
export const UCS2_CHARS_PER_SEGMENT = 70;

/** Max concatenated SMS segments we send in one reply. */
export const MAX_SMS_SEGMENTS = 4;

/** Conservative limit for carrier email-to-MMS (e.g. Verizon @vzwpix.com). */
export const MMS_EMAIL_TEXT_MAX = 1000;

export const DEFAULT_SMS_SEGMENT = GSM7_CHARS_PER_SEGMENT;
export const DEFAULT_SMS_MAX_CHARS = GSM7_CHARS_PER_SEGMENT * MAX_SMS_SEGMENTS;
