/**
 * Test Twilio credentials and optionally send a test SMS.
 * Run: npx ts-node scripts/test-twilio.ts
 * Or with a phone number to send a test message: npx ts-node scripts/test-twilio.ts +15551234567
 */
import dotenv from "dotenv";
import path from "path";
import twilio from "twilio";

dotenv.config({ path: path.resolve(__dirname, "../.env") });

async function main() {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER;

  if (!accountSid || !authToken) {
    console.error("Missing TWILIO_ACCOUNT_SID or TWILIO_AUTH_TOKEN in .env");
    process.exit(1);
  }

  const client = twilio(accountSid, authToken);

  // 1. Validate credentials by fetching account balance
  try {
    const balance = await client.balance.fetch();
    console.log("Twilio credentials OK. Balance:", balance.balance, balance.currency);
  } catch (err: unknown) {
    console.error("Twilio credentials failed:", err instanceof Error ? err.message : err);
    process.exit(1);
  }

  if (!twilioPhoneNumber) {
    console.log("TWILIO_PHONE_NUMBER not set. Set it in .env to send SMS.");
    process.exit(0);
  }

  const toNumber = process.argv[2];
  if (!toNumber) {
    console.log("To test sending an SMS, run: npx ts-node scripts/test-twilio.ts +15551234567");
    process.exit(0);
  }

  try {
    const msg = await client.messages.create({
      body: "Bible Verse SMS test. If you got this, Twilio is working.",
      from: twilioPhoneNumber,
      to: toNumber,
    });
    console.log("Test SMS sent. SID:", msg.sid);
  } catch (err: unknown) {
    console.error("Send failed:", err instanceof Error ? err.message : err);
    process.exit(1);
  }
}

main();
