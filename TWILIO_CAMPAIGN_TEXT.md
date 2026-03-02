# Twilio A2P Campaign — Copy-Paste Text

Use this text when re-registering your A2P campaign. GitHub username: **eulestadt** (URLs below use this).

**Landing page (for reviewer verification):** The full call-to-action, required disclosures, and a **sample message flow** (screenshots of the opt-in conversation) are published at the landing page below. Point reviewers there to verify the CTA.

**Landing page URL:** `https://bible.phoenixwang.com/`

---

## Campaign description

**Describe what you will be using this campaign for.**

```
Bible Verse SMS is an on-demand text service. Users text our number with a Bible reference (e.g., John 3:16) or partial quote and receive a single reply with the requested verse in their chosen translation (KJV, ESV, NIV, NASB, or NLT). There is no subscription or recurring messaging; each message is a direct reply to the user's request.
```

---

## Sample messages (use all 5)

These match the actual SMS output (reference + version, then content; non-KJV include abbreviated copyright line). No API.Bible attribution.

**Sample message #1**

```
John 3:16 KJV
For God so loved the world, that he gave his only begotten Son, that whosoever believeth in him should not perish, but have everlasting life.
```

**Sample message #2**

```
Psalm 23:1-3 ESV
1 The Lord is my shepherd; I shall not want. 2 He makes me lie down in green pastures. He leads me beside still waters. 3 He restores my soul. He leads me in paths of righteousness for his name's sake.
ESV (c) 2011 Crossway. All rights reserved.
```

**Sample message #3**

```
Romans 8:28 NIV
And we know that in all things God works for the good of those who love him, who have been called according to his purpose.
NIV (c) 2011 Biblica. All rights reserved.
```

**Sample message #4**

```
Proverbs 3:5-6 KJV
5 Trust in the Lord with all thine heart; and lean not unto thine own understanding. 6 In all thy ways acknowledge him, and he shall direct thy paths.
```

**Sample message #5**

```
Matthew 11:28 ESV
Come to me, all who labor and are heavy laden, and I will give you rest.
ESV (c) 2011 Crossway. All rights reserved.
```

---

## Message contents (checkboxes)

- **Messages will include embedded links.** → **No**
- **Messages will include phone numbers.** → **No**
- **Messages include content related to direct lending or other loan arrangement.** → **No**
- **Messages include age-gated content** → **No**

---

## How do end-users consent to receive messages? (40–2048 characters)

**Updated CTA with explicit YES opt-in. Paste this into the form.**

```
End users consent to receive messages from Bible Verse SMS via a text-in + explicit YES opt-in flow. A user first texts our dedicated Bible Verse SMS phone number with a Bible reference (e.g., "John 3:16") or a partial quote. We do not send the verse immediately. Instead, we send an opt-in confirmation SMS that explains the program, states that replies are automated and one-time, discloses that message and data rates may apply, and provides STOP/HELP instructions. The user must explicitly reply YES to that opt-in message to confirm consent before we send the requested verse. This text-in + YES reply is the only opt-in method for this campaign; there is no web form, in-store, verbal, or other consent method.

After a number has replied YES once, that number is considered opted in. Message frequency: On-demand only. We do not send recurring or subscription messages. Each outbound message is a single automated reply to one user request, and the user controls frequency entirely by how often they text us with new references.

Brand: Bible Verse SMS. Required disclosures: Message and data rates may apply. Terms and Conditions: https://bible.phoenixwang.com/terms. Privacy Policy: https://bible.phoenixwang.com/privacy. Opt-out: Reply STOP to stop receiving messages; reply HELP for help and support information. Twilio manages STOP and HELP keywords and confirmation messages for this number.

The complete CTA, step-by-step opt-in flow, and a sample messaging chain (for verification) are published on our landing page: https://bible.phoenixwang.com/
```

---

## Opt-in Message

**Put this in the “Opt-in Message” field. It matches the first SMS we send before the user replies YES.**

```
Bible Verse SMS: automated one-time verse reply per request. By replying YES, you consent to receive an automated SMS with the requested verse. Msg&Data Rates May Apply. Reply STOP to opt out, HELP for help.
```

---

## Opt-in Keywords

**Put this in the “Opt-in Keywords” field.**

```
YES
```

---

## Privacy Policy URL

**Use your Railway app URL (hosted with the app).**

```
https://bible.phoenixwang.com/privacy
```

---

## Terms and Conditions URL

**Use your Railway app URL (hosted with the app).**

```
https://bible.phoenixwang.com/terms
```

---

## What to tell Twilio / where to point reviewers

- **Landing page:** Use **https://bible.phoenixwang.com/** as the single URL where reviewers can verify the CTA. The page includes: (1) a clear “How you consent (call to action)” section with the full opt-in flow and disclosures, and (2) a “Sample conversation” section with a visual message chain (user → opt-in CTA → user replies YES → verse reply).
- In the **“How do end-users consent?”** field, paste the long CTA block above; it now ends with a sentence pointing to the landing page for verification.
- If Twilio has a **“Message Flow / CTA”** note field or support ticket, add: *“Full CTA and sample message flow are published at https://bible.phoenixwang.com/ for reviewer verification.”*

---

## Summary of fixes

1. **CTA / consent description** — Rewritten to clearly state: (a) the only opt-in method is text-in to your number, (b) no other methods (web, in-store, etc.), (c) on-demand only / no recurring, (d) brand name, (e) message and data rates may apply, (f) links to Terms and Privacy, (g) STOP and HELP opt-out. This addresses error 30909 (CTA incomplete or verification issue).

2. **Landing page for verification** — The website at the landing URL now includes the full CTA text and a sample messaging chain so reviewers can verify the flow without logging in. The consent answer above points to this URL.

3. **Terms URL** — Use TERMS.md for Terms and Conditions, not PRIVACY.md.

4. **Sample messages** — Five samples matching actual SMS output (reference + version, content; non-KJV use abbreviated copyright line only, no API.Bible attribution).

5. **Campaign description** — Clarifies on-demand, no subscription, and what the service does.

6. **Privacy & Terms URLs** — Served by your Railway app at `https://bible.phoenixwang.com/privacy` and `/terms`.
