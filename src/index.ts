import express, { Request, Response } from "express";
import twilio from "twilio";
import { CARRIERS } from "./carriers";
import { subscribe } from "./chat-store";
import { getConfig } from "./config";
import { isEmailConfigured, sendSmsViaEmail } from "./email";
import { parseResendWebhookEvent, processResendInboundEmail } from "./inbound-email";
import { fetchPassage } from "./bible-api";
import { resolveReferenceAndVersion } from "./gemini";
import { formatReply } from "./formatter";
import { sendSms } from "./sms";
import { getLandingHtml, getPrivacyHtml, getTermsHtml } from "./views";

// In-memory opt-in state for CTA/consent flow.
// For low-volume, this is sufficient to demonstrate that users explicitly opt in
// before receiving automated verse replies. State resets on deploy/restart.
const consentedNumbers = new Set<string>();
const pendingFirstRequest = new Map<string, string>();

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

  const { phone, carrier, consent } = req.body ?? {};
  if (!phone || !carrier) {
    res.status(400).json({ error: "Phone number and carrier are required." });
    return;
  }
  if (consent !== true && consent !== "true") {
    res.status(400).json({ error: "You must consent to receive automated messages." });
    return;
  }

  const sub = subscribe(String(phone), String(carrier));
  if (!sub) {
    res.status(400).json({ error: "Invalid phone number or carrier." });
    return;
  }

  const welcome =
    "You're signed up for AI Chat via text! Reply to this message to start a conversation. Msg&Data rates may apply. Reply STOP to opt out, HELP for help.";

  const sent = await sendSmsViaEmail(sub.phone, sub.carrierId, welcome);
  if (!sent) {
    res.status(502).json({ error: "Could not send welcome message. Check your phone and carrier." });
    return;
  }

  res.json({ ok: true, message: "Check your phone for a welcome text. Reply to start chatting!" });
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

  // CTA / Opt-In: require explicit YES before sending automated verse replies.
  // First-time users (not yet opted in) receive an opt-in prompt; only after
  // they reply YES do we send the requested verse and mark the number as opted in.
  if (!consentedNumbers.has(from)) {
    if (bodyUpper === "YES") {
      const pending = pendingFirstRequest.get(from);
      consentedNumbers.add(from);
      pendingFirstRequest.delete(from);

      const effectiveBody = (pending ?? "").trim();

      if (!effectiveBody) {
        setImmediate(() =>
          sendSms(
            from,
            "You are opted in to Bible Verse SMS. Text a Bible reference (e.g. John 3:16) or part of a verse to get a one-time automated reply. Msg&Data Rates May Apply. Reply STOP to opt out, HELP for help."
          ).catch(() => {})
        );
        return;
      }

      setImmediate(() => {
        handleIncomingSms(from, effectiveBody).catch((err) => {
          const msg = err instanceof Error ? err.message : String(err);
          const stack = err instanceof Error ? err.stack : undefined;
          console.error("handleIncomingSms error after opt-in", { message: msg, stack, effectiveBody });
          sendSms(from, "Something went wrong. Please try again with a reference like John 3:16.").catch(() => {});
        });
      });
      return;
    }

    // Not yet opted in and not replying YES: store this as the requested verse
    // and send a clear opt-in CTA explaining automation, rates, and STOP/HELP.
    pendingFirstRequest.set(from, body);
    setImmediate(() =>
      sendSms(
        from,
        "Bible Verse SMS: automated one-time verse reply per request. By replying YES, you consent to receive an automated SMS with the requested verse. Msg&Data Rates May Apply. Reply STOP to opt out, HELP for help."
      ).catch(() => {})
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
  console.log(`Bible Verse SMS webhook listening on port ${config.port}. POST /sms/incoming, POST /email/incoming`);
  if (config.apiBibleKey) {
    console.log(`API_BIBLE_KEY: set, length=${config.apiBibleKey.length}`);
  } else {
    console.warn("API_BIBLE_KEY: not set");
  }
  if (isEmailConfigured()) {
    console.log("Resend: configured for AI Chat email-to-SMS");
    if (!config.resendWebhookSecret) {
      console.warn("RESEND_WEBHOOK_SECRET not set; inbound webhooks will not be signature-verified");
    }
  } else {
    console.warn("Resend: not configured (AI Chat signup disabled)");
  }
});
