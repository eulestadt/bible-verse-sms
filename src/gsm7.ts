/**
 * Normalize text to GSM-7 so SMS stays 160 chars per segment (1120-bit payload).
 * Non-GSM characters force UCS-2 (70 chars/segment) — we replace common Unicode instead.
 * See sms-encoding.ts for 8-bit (140) and UCS-2 (70) limits.
 */
const REPLACEMENTS: Array<[RegExp | string, string]> = [
  ["\u2019", "'"],   // RIGHT SINGLE QUOTATION MARK (curly apostrophe)
  ["\u2018", "'"],   // LEFT SINGLE QUOTATION MARK
  ["\u201C", '"'],   // LEFT DOUBLE QUOTATION MARK
  ["\u201D", '"'],   // RIGHT DOUBLE QUOTATION MARK
  ["\u2014", "-"],   // EM DASH
  ["\u2013", "-"],   // EN DASH
  ["\u2026", "..."], // HORIZONTAL ELLIPSIS
  ["\u00A9", "(c)"], // COPYRIGHT SIGN
  ["\u00A0", " "],   // NO-BREAK SPACE
];

export function toGsm7(text: string): string {
  let out = text;
  for (const [from, to] of REPLACEMENTS) {
    out = out.split(from as string).join(to);
  }
  return out;
}
