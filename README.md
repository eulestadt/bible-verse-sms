# Bible Verse SMS

Text a phone number with a Bible reference (e.g. "John 3:16") or a partial quote; get back the verse. Uses **Gemini** to resolve references, **API.Bible** for text (default **KJV**; request ESV, NIV, NASB), and **Twilio** for SMS.

## Setup

1. Copy `.env.example` to `.env` and set:
   - **Twilio:** `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER`
   - **Gemini:** `GEMINI_API_KEY`
   - **API.Bible:** `API_BIBLE_KEY` (from [scripture.api.bible](https://scripture.api.bible))
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

## Usage

- **John 3:16** → KJV verse.
- **Psalm 23:1-3** → range in KJV.
- **John 3:16 ESV** or **Psalm 23 in NIV** → that version.
- **for God so loved the world** → Gemini finds the reference, returns KJV by default.
- **John 3:16 with context** → verse plus surrounding verses.

## Security

Incoming Twilio webhooks are validated with `X-Twilio-Signature` when `TWILIO_AUTH_TOKEN` is set.

## Privacy Policy & Terms (A2P)

For Twilio A2P Campaign registration, use direct links to this repo. After publishing to GitHub, use (replace `YOUR_USERNAME` and repo name if different):

- **Privacy Policy URL:**  
  `https://github.com/YOUR_USERNAME/bible-verse-sms/blob/main/PRIVACY.md`
- **Terms and Conditions URL:**  
  `https://github.com/YOUR_USERNAME/bible-verse-sms/blob/main/TERMS.md`

Documents: [PRIVACY.md](PRIVACY.md) | [TERMS.md](TERMS.md)
