import { createTwilioClient, getTwilioCredentials, isTwilioSmsConfigured } from "./twilio-credentials";
import { segmentForSms } from "./formatter";
import { toGsm7 } from "./gsm7";

export async function sendSms(to: string, body: string): Promise<boolean> {
  const creds = getTwilioCredentials();
  const client = createTwilioClient();
  const phoneNumber = creds?.phoneNumber;

  if (!client || !phoneNumber || !isTwilioSmsConfigured()) {
    console.error("Twilio credentials or phone number not set");
    return false;
  }

  const segments = segmentForSms(toGsm7(body));

  try {
    for (const segment of segments) {
      await client.messages.create({
        body: segment,
        from: phoneNumber,
        to,
      });
    }
    return true;
  } catch (err) {
    console.error("Twilio send error", err);
    return false;
  }
}
