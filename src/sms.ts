import twilio from "twilio";
import { getConfig } from "./config";
import { segmentForSms } from "./formatter";
import { toGsm7 } from "./gsm7";

export async function sendSms(to: string, body: string): Promise<boolean> {
  const { twilioAccountSid, twilioAuthToken, twilioPhoneNumber } = getConfig();

  if (!twilioAccountSid || !twilioAuthToken || !twilioPhoneNumber) {
    console.error("Twilio credentials or phone number not set");
    return false;
  }

  const segments = segmentForSms(toGsm7(body));

  try {
    const client = twilio(twilioAccountSid, twilioAuthToken);

    for (const segment of segments) {
      await client.messages.create({
        body: segment,
        from: twilioPhoneNumber,
        to,
      });
    }
    return true;
  } catch (err) {
    console.error("Twilio send error", err);
    return false;
  }
}
