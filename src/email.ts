import { phoneToSmsEmail } from "./carriers";
import { getConfig } from "./config";
import { splitForSending } from "./chat-gemini";

/** Twilio Email API — https://www.twilio.com/docs/email/api/getting-started */
const TWILIO_EMAIL_API = "https://comms.twilio.com/v1/Emails";

/** Carriers reject empty subjects; a single dot satisfies min-length requirements. */
const SMS_SUBJECT = ".";

function getEmailAuth(): { sid: string; secret: string } | null {
  const { twilioAccountSid, twilioAuthToken } = getConfig();
  if (!twilioAccountSid || !twilioAuthToken) return null;
  return { sid: twilioAccountSid, secret: twilioAuthToken };
}

export function isEmailConfigured(): boolean {
  const { sendgridFromEmail } = getConfig();
  return Boolean(getEmailAuth() && sendgridFromEmail);
}

async function sendTwilioEmail(to: string, text: string): Promise<boolean> {
  const auth = getEmailAuth();
  const { sendgridFromEmail, sendgridFromName } = getConfig();
  if (!auth || !sendgridFromEmail) {
    console.error("Twilio Email not configured (TWILIO_ACCOUNT_SID + TWILIO_AUTH_TOKEN + SENDGRID_FROM_EMAIL)");
    return false;
  }

  const credentials = Buffer.from(`${auth.sid}:${auth.secret}`).toString("base64");

  try {
    const res = await fetch(TWILIO_EMAIL_API, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${credentials}`,
      },
      body: JSON.stringify({
        from: { address: sendgridFromEmail, name: sendgridFromName },
        to: [{ address: to }],
        content: {
          subject: SMS_SUBJECT,
          text,
        },
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error("Twilio Email API error", res.status, errText);
      return false;
    }
    return true;
  } catch (err) {
    console.error("Twilio Email send error", err);
    return false;
  }
}

export async function sendSmsViaEmail(
  phone: string,
  carrierId: string,
  body: string
): Promise<boolean> {
  if (!isEmailConfigured()) return false;

  const to = phoneToSmsEmail(phone, carrierId);
  if (!to) {
    console.error("Invalid phone or carrier for SMS email:", phone, carrierId);
    return false;
  }

  const segments = splitForSending(body);

  try {
    for (const segment of segments) {
      const sent = await sendTwilioEmail(to, segment);
      if (!sent) return false;
      if (segments.length > 1) {
        await delay(400);
      }
    }
    return true;
  } catch (err) {
    console.error("Twilio Email send error", err);
    return false;
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
