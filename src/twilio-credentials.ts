import twilio, { Twilio } from "twilio";

/**
 * Resolve Twilio credentials from environment variables.
 *
 * @see https://www.twilio.com/docs/usage/requests-to-twilio — Account SID + Auth Token, or API Key + Secret
 * @see https://www.twilio.com/docs/iam/api-keys — recommended API Key authentication for production
 * @see https://www.twilio.com/docs/usage/webhooks/webhooks-security — Auth Token for X-Twilio-Signature validation
 */
export interface TwilioCredentials {
  accountSid: string;
  /** Auth Token from the Twilio Console; used to validate inbound webhook signatures. */
  authToken: string | undefined;
  phoneNumber: string | undefined;
  isApiKey: boolean;
}

function trimEnv(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed || undefined;
}

function readSid(): string | undefined {
  return trimEnv(
    process.env.TWILIO_SID ??
      process.env.TWILIO_API_KEY ??
      process.env.TWILIO_ACCOUNT_SID
  );
}

function readSecret(): string | undefined {
  return trimEnv(
    process.env.TWILIO_CLIENT_SECRET ??
      process.env.TWILIO_Client ??
      process.env.TWILIO_API_SECRET ??
      process.env.TWILIO_AUTH_TOKEN
  );
}

function readAccountSid(): string | undefined {
  return (
    process.env.TWILIO_ACCOUNT_SID ??
    (readSid()?.startsWith("AC") ? readSid() : undefined)
  );
}

function readAuthToken(): string | undefined {
  const sid = readSid();
  const secret = readSecret();
  // Webhook signatures require the account Auth Token — not an API Key Secret.
  return trimEnv(process.env.TWILIO_AUTH_TOKEN) ?? (sid?.startsWith("AC") ? secret : undefined);
}

function readApiKey(): string | undefined {
  const sid = readSid();
  return process.env.TWILIO_API_KEY ?? (sid?.startsWith("SK") ? sid : undefined);
}

function readApiSecret(): string | undefined {
  return process.env.TWILIO_API_SECRET ?? (readApiKey() ? readSecret() : undefined);
}

export function getTwilioCredentials(): TwilioCredentials | null {
  const phoneNumber = process.env.TWILIO_PHONE_NUMBER;
  const accountSid = readAccountSid();
  const authToken = readAuthToken();
  const apiKey = readApiKey();
  const apiSecret = readApiSecret();
  const isApiKey = Boolean(apiKey);

  if (apiKey && apiSecret && accountSid) {
    return { accountSid, authToken, phoneNumber, isApiKey: true };
  }

  if (accountSid && (authToken || readSecret())) {
    return {
      accountSid,
      authToken: authToken ?? readSecret(),
      phoneNumber,
      isApiKey: false,
    };
  }

  return null;
}

/** Create an authenticated Twilio REST client per https://www.twilio.com/docs/usage/requests-to-twilio */
export function createTwilioClient(): Twilio | null {
  const accountSid = readAccountSid();
  const authToken = readAuthToken();
  const apiKey = readApiKey();
  const apiSecret = readApiSecret();

  if (apiKey && apiSecret && accountSid) {
    return twilio(apiKey, apiSecret, { accountSid });
  }

  if (accountSid && (authToken ?? readSecret())) {
    return twilio(accountSid, authToken ?? readSecret()!);
  }

  return null;
}

export function isTwilioSmsConfigured(): boolean {
  const creds = getTwilioCredentials();
  return Boolean(creds && creds.phoneNumber && createTwilioClient());
}

function headerValue(
  headers: Record<string, string | string[] | undefined>,
  name: string
): string | undefined {
  const raw = headers[name];
  if (Array.isArray(raw)) return raw[0];
  return raw;
}

export interface TwilioWebhookRequest {
  protocol: string;
  originalUrl: string;
  headers: Record<string, string | string[] | undefined>;
  body: Record<string, string>;
}

/** Candidate URLs Twilio may have signed — must match the webhook URL in Twilio Console exactly. */
export function buildTwilioWebhookUrls(req: TwilioWebhookRequest): string[] {
  const path = req.originalUrl.split("?")[0];
  const urls = new Set<string>();

  const explicit = trimEnv(process.env.TWILIO_WEBHOOK_URL);
  if (explicit) urls.add(explicit.split("?")[0]);

  const forwardedProto = headerValue(req.headers, "x-forwarded-proto");
  const forwardedHost = headerValue(req.headers, "x-forwarded-host");
  const host = headerValue(req.headers, "host");

  for (const h of [forwardedHost, host]) {
    if (!h) continue;
    urls.add(`https://${h}${path}`);
    const proto = forwardedProto ?? req.protocol;
    if (proto) urls.add(`${proto}://${h}${path}`);
  }

  return [...urls];
}

export function validateTwilioWebhook(
  authToken: string,
  signature: string | undefined,
  url: string,
  params: Record<string, string>
): boolean {
  if (!signature) return false;
  return twilio.validateRequest(authToken.trim(), signature, url, params);
}

/** Try each candidate URL — fixes 403 when Twilio posts to a custom domain behind a proxy. */
export function validateTwilioIncomingRequest(
  req: TwilioWebhookRequest,
  authToken: string
): { valid: boolean; triedUrls: string[] } {
  const signature = headerValue(req.headers, "x-twilio-signature");
  const triedUrls = buildTwilioWebhookUrls(req);
  const params = req.body ?? {};
  const token = authToken.trim();

  const valid = triedUrls.some((url) => validateTwilioWebhook(token, signature, url, params));
  return { valid, triedUrls };
}
