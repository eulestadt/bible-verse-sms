import express, { Request, Response } from "express";
import { CARRIERS } from "./carriers";
import { tryHandleChatSignupSms } from "./chat-signup-sms";
import { CHAT_WELCOME_SMS, subscribe } from "./chat-store";
import { getConfig } from "./config";
import { isEmailConfigured, sendSmsViaEmail } from "./email";
import { tryHandleChatSms } from "./inbound-chat";
import { parseResendWebhookEvent, processResendInboundEmail } from "./inbound-email";
import { replyViaEmailGateway } from "./outbound-sms";
import { getTwilioCredentials, getWebhookValidationTokens, validateTwilioIncomingRequest } from "./twilio-credentials";
import { twimlEmpty, twimlMessage } from "./twiml";
import { normalizeZip } from "./zip";
import { getLandingHtml, getPrivacyHtml, getTermsHtml } from "./views";

const SIGNUP_HINT =
  "Sign up: text your ZIP and carrier in one message (e.g. 02116 verizon). Carriers: verizon, att, tmobile, sprint, cricket, metro, boost, uscellular, googlefi, virgin.";

const app = express();

// Trust proxy (Railway, etc.) so req.protocol is https when Twilio calls us
app.set("trust proxy", 1);

// Resend inbound webhook must read the raw body for signature verification
app.post("/email/incoming", express.raw({ type: "application/json" }), (req: Request, res: Response) => {
  if (!isEmailConfigured()) {
    res.status(503).send("Email chat not configured");
    return;
  }

  const payload = req.body instanceof Buffer ? req.body.toString("utf8") : String(req.body ?? "");

  let event: { type: string; data: { email_id: string } };
  try {
    event = parseResendWebhookEvent(payload, {
      id: String(req.headers["svix-id"] ?? ""),
      timestamp: String(req.headers["svix-timestamp"] ?? ""),
      signature: String(req.headers["svix-signature"] ?? ""),
    });
  } catch (err) {
    console.error("Resend webhook verification failed", err);
    res.status(400).send("Invalid webhook");
    return;
  }

  res.status(200).send("OK");

  if (event.type !== "email.received") return;

  setImmediate(() => {
    processResendInboundEmail(event.data.email_id).catch((err) => {
      console.error("processResendInboundEmail error", err);
    });
  });
});

// Twilio sends application/x-www-form-urlencoded
app.use(express.urlencoded({ extended: false }));
app.use(express.json());

// Public site (Railway): landing, privacy, terms
app.get("/", (_req: Request, res: Response) => {
  res.status(200).type("text/html").send(getLandingHtml());
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
  res.status(200).json({ ok: true, service: "bible-verse-sms", chat: true });
});

app.get("/api/chat/carriers", (_req: Request, res: Response) => {
  res.json(CARRIERS.map(({ id, name }) => ({ id, name })));
});

app.post("/api/chat/signup", async (req: Request, res: Response) => {
  if (!isEmailConfigured()) {
    res.status(503).json({ error: "Email chat is not configured yet." });
    return;
  }

  const { phone, carrier, zip, consent } = req.body ?? {};
  if (!phone || !carrier || !zip) {
    res.status(400).json({ error: "Phone number, carrier, and ZIP code are required." });
    return;
  }
  if (!normalizeZip(String(zip))) {
    res.status(400).json({ error: "Enter a valid 5-digit US ZIP code." });
    return;
  }
  if (consent !== true && consent !== "true") {
    res.status(400).json({ error: "You must consent to receive automated messages." });
    return;
  }

  const sub = subscribe(String(phone), String(carrier), String(zip));
  if (!sub) {
    res.status(400).json({ error: "Invalid phone number, carrier, or ZIP code." });
    return;
  }

  const sent = await sendSmsViaEmail(sub.phone, sub.carrierId, CHAT_WELCOME_SMS);
  if (!sent) {
    res.status(502).json({ error: "Could not send welcome message. Check your phone and carrier." });
    return;
  }

  res.json({ ok: true, message: "Check your phone for a welcome text, then text our number to start chatting!" });
});

/** Reply via email gateway when subscribed; otherwise TwiML (no carrier email address yet). */
async function replyOrTwiml(from: string, text: string): Promise<string> {
  if (await replyViaEmailGateway(from, text)) return twimlEmpty();
  return twimlMessage(text);
}

app.post("/sms/incoming", async (req: Request, res: Response) => {
  const creds = getTwilioCredentials();
  const isApiKey = creds?.isApiKey ?? false;
  const webhookTokens = getWebhookValidationTokens();
  const skipValidation = process.env.TWILIO_SKIP_WEBHOOK_VALIDATION === "true";

  if (skipValidation) {
    console.warn(
      "TWILIO_SKIP_WEBHOOK_VALIDATION=true — inbound SMS accepted without signature check. Remove for production."
    );
  } else if (webhookTokens.length > 0) {
    const { valid, triedUrls, paramCount } = validateTwilioIncomingRequest({
      protocol: req.protocol,
      originalUrl: req.originalUrl,
      headers: req.headers,
      body: req.body ?? {},
    });
    if (!valid) {
      console.warn("Twilio webhook signature validation failed", {
        triedUrls,
        paramCount,
        from: req.body?.From,
        host: req.get("host"),
        forwardedHost: req.get("x-forwarded-host"),
        tokenSources: webhookTokens.length,
        hint:
          "Set TWILIO_AUTH_TOKEN to your Auth Token from twilio.com/console (Account Dashboard). " +
          "It is NOT an API Key Secret or OAuth Client Secret. See https://www.twilio.com/docs/usage/webhooks/webhooks-security",
      });
      res.status(403).send("Forbidden");
      return;
    }
  } else if (isApiKey) {
    console.warn(
      "TWILIO_AUTH_TOKEN not set; skipping webhook signature validation. Add your Auth Token from twilio.com/console for production. See https://www.twilio.com/docs/usage/webhooks/webhooks-security"
    );
  }

  const from = req.body?.From;
  const body = (req.body?.Body ?? "").trim();

  if (!from) {
    res.status(400).send("Missing From");
    return;
  }

  try {
    if (await tryHandleChatSms(from, body)) {
      res.status(200).type("text/xml").send(twimlEmpty());
      return;
    }

    const signup = await tryHandleChatSignupSms(from, body);
    if (signup.handled) {
      res
        .status(200)
        .type("text/xml")
        .send(signup.twimlReply ? twimlMessage(signup.twimlReply) : twimlEmpty());
      return;
    }

    if (!body) {
      res.status(200).type("text/xml").send(await replyOrTwiml(from, SIGNUP_HINT));
      return;
    }

    res.status(200).type("text/xml").send(await replyOrTwiml(from, SIGNUP_HINT));
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("SMS incoming handler error", { message: msg, body });
    res.status(200).type("text/xml").send(twimlMessage("Something went wrong. Please try again."));
  }
});

const config = getConfig();
app.listen(config.port, () => {
  console.log(`Bible Verse SMS webhook listening on port ${config.port}. POST /sms/incoming, POST /email/incoming`);
  if (config.apiBibleKey) {
    console.log(`API_BIBLE_KEY: set, length=${config.apiBibleKey.length}`);
  } else {
    console.warn("API_BIBLE_KEY: not set");
  }
  if (isEmailConfigured()) {
    console.log("Resend: configured for outbound SMS (email-to-SMS); inbound via Twilio /sms/incoming");
    if (!config.resendWebhookSecret) {
      console.warn("RESEND_WEBHOOK_SECRET not set; inbound webhooks will not be signature-verified");
    }
  } else {
    console.warn("Resend: not configured (AI Chat signup disabled)");
  }
  const webhookTokens = getWebhookValidationTokens();
  if (process.env.TWILIO_SKIP_WEBHOOK_VALIDATION === "true") {
    console.warn("TWILIO_SKIP_WEBHOOK_VALIDATION=true — Twilio webhook signatures are NOT verified");
  } else if (webhookTokens.length > 0) {
    console.log(
      `Twilio webhook validation: ${webhookTokens.length} token(s), URL=${process.env.TWILIO_WEBHOOK_URL ?? "auto"}`
    );
  } else {
    console.warn("Twilio webhook validation disabled — set TWILIO_AUTH_TOKEN (Auth Token from twilio.com/console)");
  }
});
