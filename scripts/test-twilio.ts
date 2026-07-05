/**
 * Test Twilio credentials and optionally send a test SMS.
 * Run: npx ts-node scripts/test-twilio.ts
 * Or with a phone number to send a test message: npx ts-node scripts/test-twilio.ts +15551234567
 *
 * @see https://www.twilio.com/docs/usage/requests-to-twilio
 */
import dotenv from "dotenv";
import path from "path";
import { createTwilioClient, getTwilioCredentials, isTwilioSmsConfigured } from "../src/twilio-credentials";

dotenv.config({ path: path.resolve(__dirname, "../.env") });

async function main() {
  const creds = getTwilioCredentials();
  const client = createTwilioClient();
  const phoneNumber = creds?.phoneNumber;

  if (!client || !creds) {
    console.error(
      "Missing Twilio credentials. Set TWILIO_SID + TWILIO_CLIENT_SECRET (and TWILIO_ACCOUNT_SID if using an API Key). See .env.example"
    );
    process.exit(1);
  }

  if (creds.isApiKey) {
    console.log("Using API Key auth (SK...) with account", creds.accountSid);
  } else {
    console.log("Using Account SID + Auth Token auth");
  }

  // 1. Validate credentials by fetching account balance
  try {
    const balance = await client.balance.fetch();
    console.log("Twilio credentials OK. Balance:", balance.balance, balance.currency);
  } catch (err: unknown) {
    console.error("Twilio credentials failed:", err instanceof Error ? err.message : err);
    process.exit(1);
  }

  if (!phoneNumber) {
    console.log("TWILIO_PHONE_NUMBER not set. Set it in .env to send SMS.");
    process.exit(0);
  }

  if (!isTwilioSmsConfigured()) {
    console.warn("TWILIO_PHONE_NUMBER is set but full SMS config is incomplete.");
  }

  const toNumber = process.argv[2];
  if (!toNumber) {
    console.log("To test sending an SMS, run: npx ts-node scripts/test-twilio.ts +15551234567");
    process.exit(0);
  }

  try {
    const msg = await client.messages.create({
      body: "Bible Verse SMS test. If you got this, Twilio is working.",
      from: phoneNumber,
      to: toNumber,
    });
    console.log("Test SMS sent. SID:", msg.sid);
  } catch (err: unknown) {
    console.error("Send failed:", err instanceof Error ? err.message : err);
    process.exit(1);
  }
}

main();
