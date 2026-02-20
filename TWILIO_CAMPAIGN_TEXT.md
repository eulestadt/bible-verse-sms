# Twilio A2P Campaign — Copy-Paste Text

Use this text when re-registering your A2P campaign. GitHub username: **eulestadt** (URLs below use this).

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

**This is the Call to Action (CTA) that was rejected. Use the full text below so reviewers can verify consent.**

```
End users consent to receive messages from Bible Verse SMS by initiating contact with our number: they send a text message (SMS) to our dedicated Bible Verse SMS phone number with a Bible reference (e.g., "John 3:16") or a partial quote. This is the only opt-in method for this campaign; there is no web form, in-store, verbal, or other consent method. By sending that first message, the user is requesting a one-time reply and consents to receive our reply message.

Message frequency: On-demand only. We do not send recurring or subscription messages. Each outbound message is a single reply to one user message. The user controls frequency by how often they text.

Brand: Bible Verse SMS. Required disclosures: Message and data rates may apply. Terms and Conditions: https://bible-verse-sms-production.up.railway.app/terms. Privacy Policy: https://bible-verse-sms-production.up.railway.app/privacy. Opt-out: Reply STOP to stop receiving messages; reply HELP for help and support information. Twilio manages STOP and HELP keywords and confirmation messages for this number.
```

---

## Privacy Policy URL

**Use your Railway app URL (hosted with the app).**

```
https://bible-verse-sms-production.up.railway.app/privacy
```

---

## Terms and Conditions URL

**Use your Railway app URL (hosted with the app).**

```
https://bible-verse-sms-production.up.railway.app/terms
```

---

## Summary of fixes

1. **CTA / consent description** — Rewritten to clearly state: (a) the only opt-in method is text-in to your number, (b) no other methods (web, in-store, etc.), (c) on-demand only / no recurring, (d) brand name, (e) message and data rates may apply, (f) links to Terms and Privacy, (g) STOP and HELP opt-out. This addresses error 30909 (CTA incomplete or verification issue).

2. **Terms URL** — Use TERMS.md for Terms and Conditions, not PRIVACY.md.

3. **Sample messages** — Five samples matching actual SMS output (reference + version, content; non-KJV use abbreviated copyright line only, no API.Bible attribution).

4. **Campaign description** — Clarifies on-demand, no subscription, and what the service does.

5. **Privacy & Terms URLs** — Served by your Railway app at `https://bible-verse-sms-production.up.railway.app/privacy` and `/terms`.
