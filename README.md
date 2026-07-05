# Bible Verse SMS

Text a phone number with a Bible reference (e.g. "John 3:16") or a partial quote; get back the verse. Uses **Gemini** to resolve references, **API.Bible** for text (default **KJV**; request ESV, NIV, NASB, or NLT), and **Twilio** for SMS.

## Setup

1. Copy `.env.example` to `.env` and set:
   - **Twilio:** `TWILIO_SID`, `TWILIO_CLIENT_SECRET`, `TWILIO_PHONE_NUMBER` — see [Twilio API authentication](https://www.twilio.com/docs/usage/requests-to-twilio). If `TWILIO_SID` is an API Key (`SK...`), also set `TWILIO_ACCOUNT_SID` and `TWILIO_AUTH_TOKEN` (for webhook signature validation per [webhook security](https://www.twilio.com/docs/usage/webhooks/webhooks-security)). Legacy names `TWILIO_ACCOUNT_SID` / `TWILIO_AUTH_TOKEN` still work.
   - **Gemini:** `GEMINI_API_KEY`
   - **API.Bible:** `API_BIBLE_KEY` from [scripture.api.bible](https://scripture.api.bible) → sign in → Dashboard → API key. Paste the key with no extra spaces or newlines. If you get 401 "bad api-key", create a new key there and replace; ensure your app is approved for the key.
2. In Twilio Console, set your phone number’s "A MESSAGE COMES IN" webhook to:  
   `https://your-host/sms/incoming` (POST). Set **`TWILIO_WEBHOOK_URL`** in Railway to that same exact URL if you use a custom domain (avoids 403 signature errors). See [webhook security](https://www.twilio.com/docs/usage/webhooks/webhooks-security).
3. Optional: `INCLUDE_CONTEXT_DEFAULT=true` to add ±2 verses by default; or text "with context" in a message.
4. Optional: `PORT=3000` (default 3000).

## Run

```bash
npm install
npm run build
npm start
```

For development: `npm run dev` (uses ts-node).

### Test Twilio integration

From the project root with `.env` set:

```bash
# Check credentials (no SMS sent)
npm run test:twilio

# Send a test SMS to your phone (use E.164, e.g. +15551234567)
npm run test:twilio -- +15551234567
```

If credentials are valid you’ll see “Twilio credentials OK.” Sending a test SMS confirms outbound messaging works. To test the full flow (webhook → verse reply), text your Twilio number something like “John 3:16”.

### Test on Railway

1. **Confirm the app is up** — Open https://bible.phoenixwang.com/ in a browser or run `curl https://bible.phoenixwang.com/`. You should see the landing page. Or hit `/health` for `{"ok":true,"service":"bible-verse-sms"}`.
2. **Point Twilio at the app** — Twilio Console → Phone Numbers → your number → Messaging. Set **A MESSAGE COMES IN** to `https://bible.phoenixwang.com/sms/incoming` (HTTP POST). Save.
3. **Send a real SMS** — From your phone, text your Twilio number: e.g. `John 3:16`, `HELP`, or `Psalm 23:1-3 ESV`. If you get a reply, the full flow is working.
4. **If it fails** — Check Railway logs (Deployments → View logs). Confirm all env vars are set (Twilio, Gemini, API.Bible) and the webhook URL is correct and uses `https://`.

#### Railway variable names (important)

Railpack treats service variables as **build secrets**. Use **underscores only** — no spaces or mixed case like `TWILIO_Client Secret`. If a deploy fails with `secret TWILIO_Client not found`, delete any misnamed Twilio variables and recreate them as:

- `TWILIO_SID`
- `TWILIO_CLIENT_SECRET` (Auth Token or API Key Secret)
- `TWILIO_PHONE_NUMBER`

Then redeploy. If the error persists after fixing names, add `NO_CACHE=1` once and redeploy to clear a stale build plan.

## Usage

- **John 3:16** → KJV verse.
- **Psalm 23:1-3** → range in KJV.
- **John 3:16 ESV** or **Psalm 23 in NIV** → that version.
- **for God so loved the world** → Gemini finds the reference, returns KJV by default.
- **John 3:16 with context** → verse plus surrounding verses.

## Security

Incoming Twilio webhooks are validated with `X-Twilio-Signature` when `TWILIO_AUTH_TOKEN` (or `TWILIO_CLIENT_SECRET` with Account SID auth) is set — see [webhook security](https://www.twilio.com/docs/usage/webhooks/webhooks-security).

## Website (Railway)

When hosted on Railway, the app serves:

- **/** — Landing page describing the texting service
- **/privacy** — Privacy policy (from [PRIVACY.md](PRIVACY.md))
- **/terms** — Terms and conditions (from [TERMS.md](TERMS.md))

Use these URLs for Twilio A2P registration:

- **Privacy Policy URL:** `https://bible.phoenixwang.com/privacy`
- **Terms and Conditions URL:** `https://bible.phoenixwang.com/terms`

Documents in repo: [PRIVACY.md](PRIVACY.md) | [TERMS.md](TERMS.md)

## AI Chat (hybrid Twilio + email-to-SMS)

AI Chat uses a hybrid path so you can chat without relying on carrier email replies (which many carriers no longer support) or Twilio 10DLC for outbound:

1. **Sign up** on the landing page (`/#ai-chat`) with your phone number and carrier.
2. **Text the Twilio number** (same number as Bible Verse SMS) to send messages — inbound arrives via Twilio webhook.
3. **Replies** are sent through your carrier's email-to-SMS gateway via **Resend** (outbound only).

Set these env vars in addition to Twilio:

- `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `RESEND_WEBHOOK_SECRET`
- Optional: `RESEND_INBOUND_ADDRESS`, `RESEND_FROM_NAME`

The Resend inbound webhook (`POST /email/incoming`) is still supported as a fallback if carrier email replies work for you, but the recommended flow is to text the Twilio number after signing up.

### Using Twilio while A2P registration is in progress

You can run the service and use your Twilio number **while your A2P campaign is pending**. Messaging often works for low volume and testing; some US carriers may filter or block outbound replies until the campaign is approved. Finish campaign registration when Twilio requests it and use the Privacy Policy and Terms URLs above. Once approved, deliverability to US numbers should improve.
