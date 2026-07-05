const EMPTY = '<?xml version="1.0" encoding="UTF-8"?><Response></Response>';

function escapeXml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/** TwiML reply in the webhook response — no Twilio REST client required. */
export function twimlMessage(body: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?><Response><Message>${escapeXml(body)}</Message></Response>`;
}

export function twimlEmpty(): string {
  return EMPTY;
}
