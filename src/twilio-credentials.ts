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

function readSid(): string | undefined {
  return (
    process.env.TWILIO_SID ??
    process.env.TWILIO_API_KEY ??
    process.env.TWILIO_ACCOUNT_SID
  );
}

function readSecret(): string | undefined {
  return (
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
  return process.env.TWILIO_AUTH_TOKEN ?? (sid?.startsWith("AC") ? secret : undefined);
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

export function validateTwilioWebhook(
  authToken: string,
  signature: string | undefined,
  url: string,
  params: Record<string, string>
): boolean {
  if (!signature) return false;
  return twilio.validateRequest(authToken, signature, url, params);
}

export function isTwilioSmsConfigured(): boolean {
  const creds = getTwilioCredentials();
  return Boolean(creds && creds.phoneNumber && createTwilioClient());
}
