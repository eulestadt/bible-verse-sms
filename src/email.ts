import sgMail from "@sendgrid/mail";
import { phoneToSmsEmail } from "./carriers";
import { getConfig } from "./config";
import { splitForSending } from "./chat-gemini";

function ensureSendGrid(): boolean {
  const { sendgridApiKey, sendgridFromEmail } = getConfig();
  if (!sendgridApiKey || !sendgridFromEmail) {
    console.error("SendGrid not configured (SENDGRID_API_KEY / SENDGRID_FROM_EMAIL)");
    return false;
  }
  sgMail.setApiKey(sendgridApiKey);
  return true;
}

export async function sendSmsViaEmail(
  phone: string,
  carrierId: string,
  body: string
): Promise<boolean> {
  if (!ensureSendGrid()) return false;

  const { sendgridFromEmail, sendgridFromName } = getConfig();
  const to = phoneToSmsEmail(phone, carrierId);
  if (!to) {
    console.error("Invalid phone or carrier for SMS email:", phone, carrierId);
    return false;
  }

  const segments = splitForSending(body);

  try {
    for (const segment of segments) {
      await sgMail.send({
        to,
        from: { email: sendgridFromEmail!, name: sendgridFromName },
        subject: "",
        text: segment,
      });
      if (segments.length > 1) {
        await delay(400);
      }
    }
    return true;
  } catch (err) {
    console.error("SendGrid send error", err);
    return false;
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
