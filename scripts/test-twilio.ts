/**
 * Test Twilio webhook credentials (Auth Token for signature validation).
 * Outbound SMS uses Resend email-to-SMS — see scripts/test-email.ts if present.
 *
 * Run: npx ts-node scripts/test-twilio.ts
 *
 * @see https://www.twilio.com/docs/usage/webhooks/webhooks-security
 */
import dotenv from "dotenv";
import path from "path";
import { getTwilioCredentials, getWebhookValidationTokens } from "../src/twilio-credentials";

dotenv.config({ path: path.resolve(__dirname, "../.env") });

function main() {
  const creds = getTwilioCredentials();
  const tokens = getWebhookValidationTokens();

  if (!creds) {
    console.error(
      "Missing Twilio credentials. Set TWILIO_SID + TWILIO_CLIENT_SECRET for webhook auth. See .env.example"
    );
    process.exit(1);
  }

  console.log("Twilio inbound webhook config:");
  console.log("  Account SID:", creds.accountSid);
  console.log("  API Key auth:", creds.isApiKey);
  console.log("  Webhook validation token(s):", tokens.length);
  console.log("  TWILIO_PHONE_NUMBER:", creds.phoneNumber ?? "(not set — inbound only, no REST outbound)");

  if (tokens.length === 0) {
    console.warn(
      "Set TWILIO_AUTH_TOKEN (Auth Token from twilio.com/console) to verify inbound webhook signatures."
    );
    process.exit(1);
  }

  console.log("OK — inbound Twilio webhooks can be validated. Outbound SMS is via Resend email gateway.");
}

main();
