import express, { Request, Response } from "express";
import twilio from "twilio";
import { getConfig } from "./config";
import { fetchPassage } from "./bible-api";
import { resolveReferenceAndVersion } from "./gemini";
import { formatReply } from "./formatter";
import { sendSms } from "./sms";
import { LANDING_HTML, getPrivacyHtml, getTermsHtml } from "./views";

const app = express();

// Trust proxy (Railway, etc.) so req.protocol is https when Twilio calls us
app.set("trust proxy", 1);

// Twilio sends application/x-www-form-urlencoded
app.use(express.urlencoded({ extended: false }));

// Public site (Railway): landing, privacy, terms
app.get("/", (_req: Request, res: Response) => {
  res.status(200).type("text/html").send(LANDING_HTML);
});
app.get("/privacy", (_req: Request, res: Response) => {
  const html = getPrivacyHtml();
  if (!html) {
    res.status(404).send("Privacy policy not found.");
    return;
  }
  res.status(200).type("text/html").send(html);
});
app.get("/terms", (_req: Request, res: Response) => {
  const html = getTermsHtml();
  if (!html) {
    res.status(404).send("Terms not found.");
    return;
  }
  res.status(200).type("text/html").send(html);
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
    await sendSms(from, "Reply with a Bible reference (e.g. John 3:16) or a bit of the verse. Add a version like ESV, NIV, or NLT, or we’ll use KJV.");
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
      sendSms(from, "Bible Verse SMS: Text a reference (e.g. John 3:16) or part of a verse. Add ESV, NIV, or NLT for other versions. Reply STOP to opt out. Support: see repo/terms where this service is documented.").catch(() => {})
    );
    return;
  }

  if (!body) {
    setImmediate(() =>
      sendSms(from, "Text a Bible reference (e.g. John 3:16) or a bit of the verse. Add ESV, NIV, or NLT for another version. Text HELP for help, STOP to opt out.").catch(() => {})
    );
    return;
  }

  setImmediate(() => {
    handleIncomingSms(from, body).catch((err) => {
      const msg = err instanceof Error ? err.message : String(err);
      const stack = err instanceof Error ? err.stack : undefined;
      console.error("handleIncomingSms error", { message: msg, stack, body });
      sendSms(from, "Something went wrong. Please try again with a reference like John 3:16.").catch(() => {});
    });
  });
});

const config = getConfig();
app.listen(config.port, () => {
  console.log(`Bible Verse SMS webhook listening on port ${config.port}. POST /sms/incoming`);
  if (config.apiBibleKey) {
    console.log(`API_BIBLE_KEY: set, length=${config.apiBibleKey.length}`);
  } else {
    console.warn("API_BIBLE_KEY: not set");
  }
});
