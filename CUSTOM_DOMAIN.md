# Using a Custom Domain (e.g. phoenixwang.com) with Bible Verse SMS

You can serve the app and its pages (landing, privacy, terms) from your own domain so Twilio and users see URLs like `https://bible.phoenixwang.com` instead of the Railway default.

**Recommendation:** Use a **subdomain** (e.g. `bible.phoenixwang.com` or `sms.phoenixwang.com`) for this app so you can keep `phoenixwang.com` for your main site or email. You can also use the root domain if you prefer.

---

## 1. Add the custom domain in Railway

1. Open [Railway](https://railway.app) → your project → the **Bible Verse SMS** service.
2. Go to **Settings** → **Networking** / **Domains**.
3. Click **Add domain** or **Custom domain**.
4. Enter your domain:
   - **Subdomain:** `bible.phoenixwang.com` (or `sms.phoenixwang.com`, etc.)
   - **Root domain:** `phoenixwang.com` (see DNS note below for root)
5. Railway will show the DNS records you need to add (usually a **CNAME** and a target like `your-app.up.railway.app`).

---

## 2. Configure DNS at your domain registrar

Where you manage DNS for **phoenixwang.com** (e.g. Cloudflare, Namecheap, Google Domains, etc.):

### If using a subdomain (e.g. `bible.phoenixwang.com`)

- Add a **CNAME** record:
  - **Name/Host:** `bible` (or the subdomain you chose)
  - **Target/Value:** the hostname Railway gave you (e.g. `bible-verse-sms-production.up.railway.app`)
  - **TTL:** 300 or Auto

### If using the root domain (`phoenixwang.com`)

- **Standard DNS:** You cannot put a CNAME at the root (`@`). Use Railway’s instructions if they provide **A** records (IPs), or use a provider that supports **CNAME flattening** (e.g. Cloudflare) so the root can point to Railway’s hostname.
- **Cloudflare:** Add a CNAME for `@` with “Proxy” off initially so SSL can provision; Railway’s docs often recommend disabling proxy until the cert is active.

Wait for DNS to propagate (often 5–30 minutes; up to 48 hours). Railway will issue HTTPS automatically once DNS is correct.

---

## 3. Update Twilio

After the custom domain is live and HTTPS works:

### Phone number webhook

1. **Twilio Console** → **Phone Numbers** → **Manage** → select your number.
2. **Messaging** → **A MESSAGE COMES IN**.
3. Set the URL to:  
   `https://bible.phoenixwang.com/sms/incoming`  
   (or `https://phoenixwang.com/sms/incoming` if you used the root).
4. Method: **POST**. Save.

### A2P 10DLC campaign (if you use it)

1. **Regulatory Compliance** → **A2P 10DLC** → **Campaigns** → your campaign.
2. Update:
   - **Privacy Policy URL:** `https://bible.phoenixwang.com/privacy`
   - **Terms and Conditions URL:** `https://bible.phoenixwang.com/terms`
3. In **End User Consent** / **How do end-users consent?**, update any pasted URLs to use the new domain (e.g. landing: `https://bible.phoenixwang.com/`).
4. Resubmit or save the campaign if required.

---

## 4. Update this repo’s URLs

Replace the old Railway base URL with your custom domain in:

- **[TWILIO_CAMPAIGN_TEXT.md](TWILIO_CAMPAIGN_TEXT.md)** — All campaign and landing URLs use `https://bible.phoenixwang.com`.
- **[README.md](README.md)** — Any example URLs under “Test on Railway” and “Website (Railway)” so they reflect your domain.

The app code uses **relative** paths (`/`, `/privacy`, `/terms`), so no code changes are required for the site to work under the new domain.

---

## 5. Verify

1. Open `https://bible.phoenixwang.com/` (or your chosen hostname) — you should see the Bible Verse SMS landing page.
2. Open `https://bible.phoenixwang.com/privacy` and `/terms` — both should load.
3. Send an SMS to your Twilio number — the webhook should be called and you should get a reply.

If something fails, check Railway logs and Twilio webhook logs (Phone Numbers → your number → Logs) to confirm the request hits the correct URL.
