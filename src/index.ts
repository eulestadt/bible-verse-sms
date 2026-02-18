import express, { Request, Response } from "express";
import twilio from "twilio";
import { getConfig } from "./config";
import { fetchPassage } from "./bible-api";
import { resolveReferenceAndVersion } from "./gemini";
import { formatReply } from "./formatter";
import { sendSms } from "./sms";

const app = express();

// Twilio sends application/x-www-form-urlencoded
app.use(express.urlencoded({ extended: false }));

// Health check (for Railway / monitoring; optional)
app.get("/", (_req: Request, res: Response) => {
  res.status(200).send("Bible Verse SMS is running. Webhook: POST /sms/incoming");
});
app.get("/health", (_req: Request, res: Response) => {
  res.status(200).json({ ok: true, service: "bible-verse-sms" });
});

function validateTwilioSignature(req: Request, authToken: string): boolean {
  const signature = req.headers["x-twilio-signature"] as string | undefined;
  if (!signature) return false;
  const url = `${req.protocol}://${req.get("host") ?? ""}${req.originalUrl}`;
  return twilio.validateRequest(authToken, signature, url, req.body);
}

async function handleIncomingSms(from: string, body: string) {
  const config = getConfig();
  const { reference, version, withContext } = await resolveReferenceAndVersion(
    body,
    config.includeContextDefault
  );

  if (reference === "UNKNOWN") {
    await sendSms(from, "Reply with a Bible reference (e.g. John 3:16) or a bit of the verse. Add a version like ESV or NIV, or we’ll use KJV.");
    return;
  }

  const passage = await fetchPassage(reference, version, withContext);
  const replyText = formatReply(passage, withContext);
  await sendSms(from, replyText);
}

app.post("/sms/incoming", (req: Request, res: Response) => {
  const config = getConfig();

  if (config.twilioAuthToken && !validateTwilioSignature(req, config.twilioAuthToken)) {
    res.status(403).send("Forbidden");
    return;
  }

  const from = req.body?.From;
  const body = (req.body?.Body ?? "").trim();

  if (!from) {
    res.status(400).send("Missing From");
    return;
  }

  res.status(200).type("text/xml").send("<Response></Response>");

  const bodyUpper = body.toUpperCase();
  if (bodyUpper === "STOP") {
    setImmediate(() =>
      sendSms(from, "You have been unsubscribed from Bible Verse SMS. You will not receive further messages. Text again anytime to get verses.").catch(() => {})
    );
    return;
  }
  if (bodyUpper === "HELP") {
    setImmediate(() =>
      sendSms(from, "Bible Verse SMS: Text a reference (e.g. John 3:16) or part of a verse. Add ESV or NIV for other versions. Reply STOP to opt out. Support: see repo/terms where this service is documented.").catch(() => {})
    );
    return;
  }

  if (!body) {
    setImmediate(() =>
      sendSms(from, "Text a Bible reference (e.g. John 3:16) or a bit of the verse. Add ESV or NIV for another version. Text HELP for help, STOP to opt out.").catch(() => {})
    );
    return;
  }

  setImmediate(() => {
    handleIncomingSms(from, body).catch((err) => {
      console.error("handleIncomingSms error", err);
      sendSms(from, "Something went wrong. Please try again with a reference like John 3:16.").catch(() => {});
    });
  });
});

const config = getConfig();
app.listen(config.port, () => {
  console.log(`Bible Verse SMS webhook listening on port ${config.port}. POST /sms/incoming`);
});
