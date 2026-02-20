# Bible Verse SMS

Text a phone number with a Bible reference (e.g. "John 3:16") or a partial quote; get back the verse. Uses **Gemini** to resolve references, **API.Bible** for text (default **KJV**; request ESV, NIV, NASB, or NLT), and **Twilio** for SMS.

## Setup

1. Copy `.env.example` to `.env` and set:
   - **Twilio:** `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER`
   - **Gemini:** `GEMINI_API_KEY`
   - **API.Bible:** `API_BIBLE_KEY` from [scripture.api.bible](https://scripture.api.bible) → sign in → Dashboard → API key. Paste the key with no extra spaces or newlines. If you get 401 "bad api-key", create a new key there and replace; ensure your app is approved for the key.
2. In Twilio Console, set your phone number’s "A MESSAGE COMES IN" webhook to:  
   `https://your-host/sms/incoming` (POST).
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

1. **Confirm the app is up** — Open your Railway URL in a browser or run `curl https://YOUR-RAILWAY-URL.up.railway.app/`. You should see: `Bible Verse SMS is running. Webhook: POST /sms/incoming`. Or hit `/health` for `{"ok":true,"service":"bible-verse-sms"}`.
2. **Point Twilio at Railway** — Twilio Console → Phone Numbers → your number → Messaging. Set **A MESSAGE COMES IN** to `https://YOUR-RAILWAY-URL.up.railway.app/sms/incoming` (HTTP POST). Save.
3. **Send a real SMS** — From your phone, text your Twilio number: e.g. `John 3:16`, `HELP`, or `Psalm 23:1-3 ESV`. If you get a reply, the full flow is working.
4. **If it fails** — Check Railway logs (Deployments → View logs). Confirm all env vars are set (Twilio, Gemini, API.Bible) and the webhook URL is correct and uses `https://`.

## Usage

- **John 3:16** → KJV verse.
- **Psalm 23:1-3** → range in KJV.
- **John 3:16 ESV** or **Psalm 23 in NIV** → that version.
- **for God so loved the world** → Gemini finds the reference, returns KJV by default.
- **John 3:16 with context** → verse plus surrounding verses.

## Security

Incoming Twilio webhooks are validated with `X-Twilio-Signature` when `TWILIO_AUTH_TOKEN` is set.

## Website (Railway)

When hosted on Railway, the app serves:

- **/** — Landing page describing the texting service
- **/privacy** — Privacy policy (from [PRIVACY.md](PRIVACY.md))
- **/terms** — Terms and conditions (from [TERMS.md](TERMS.md))

Use these URLs for Twilio A2P registration:

- **Privacy Policy URL:** `https://bible-verse-sms-production.up.railway.app/privacy`
- **Terms and Conditions URL:** `https://bible-verse-sms-production.up.railway.app/terms`

Documents in repo: [PRIVACY.md](PRIVACY.md) | [TERMS.md](TERMS.md)

### Using Twilio while A2P registration is in progress

You can run the service and use your Twilio number **while your A2P campaign is pending**. Messaging often works for low volume and testing; some US carriers may filter or block outbound replies until the campaign is approved. Finish campaign registration when Twilio requests it and use the Privacy Policy and Terms URLs above. Once approved, deliverability to US numbers should improve.
