import { readFileSync } from "fs";
import path from "path";
import { marked } from "marked";

// Repo root: cwd when running from project root (e.g. Railway); fallback to parent of dist/
function getRoot(): string {
  const cwd = process.cwd();
  const fromDist = path.join(cwd, "..");
  for (const dir of [cwd, fromDist]) {
    try {
      readFileSync(path.join(dir, "PRIVACY.md"), "utf-8");
      return dir;
    } catch {
      continue;
    }
  }
  return cwd;
}

const ROOT = getRoot();

function readMd(name: string): string | null {
  try {
    return readFileSync(path.join(ROOT, name), "utf-8");
  } catch {
    return null;
  }
}

function layout(title: string, bodyHtml: string, active: "home" | "privacy" | "terms"): string {
  const nav = `
    <nav class="nav">
      <a href="/" class="${active === "home" ? "active" : ""}">Home</a>
      <a href="/privacy" class="${active === "privacy" ? "active" : ""}">Privacy</a>
      <a href="/terms" class="${active === "terms" ? "active" : ""}">Terms</a>
    </nav>`;
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(title)} — Bible Verse SMS</title>
  <style>
    :root { --bg: #f8f9fa; --card: #ffffff; --text: #1a1a1a; --muted: #5c5c5c; --accent: #2d6a2d; --border: #e2e2e2; }
    * { box-sizing: border-box; }
    body { font-family: "Segoe UI", system-ui, sans-serif; background: var(--bg); color: var(--text); line-height: 1.6; margin: 0; min-height: 100vh; }
    .wrap { max-width: 640px; margin: 0 auto; padding: 1.5rem; }
    .nav { display: flex; gap: 1rem; margin-bottom: 2rem; padding-bottom: 1rem; border-bottom: 1px solid var(--border); }
    .nav a { color: var(--muted); text-decoration: none; }
    .nav a:hover, .nav a.active { color: var(--accent); }
    h1 { font-size: 1.5rem; margin: 0 0 1rem; color: var(--text); }
    .doc { color: var(--muted); }
    .doc h2 { font-size: 1.1rem; margin: 1.5rem 0 0.5rem; color: var(--text); }
    .doc h3 { font-size: 1rem; margin: 1rem 0 0.25rem; }
    .doc p { margin: 0.5rem 0; }
    .doc ul { margin: 0.5rem 0; padding-left: 1.25rem; }
    .doc hr { border: none; border-top: 1px solid var(--border); margin: 1rem 0; }
    .hero { text-align: center; padding: 2rem 0; }
    .hero h1 { font-size: 1.75rem; }
    .hero p { color: var(--muted); margin: 0.5rem 0; }
    .cta { background: var(--card); border: 1px solid var(--border); border-radius: 8px; padding: 1.25rem; margin: 1.5rem 0; }
    .cta strong { color: var(--accent); }
    footer { margin-top: 2rem; padding-top: 1rem; border-top: 1px solid var(--border); font-size: 0.875rem; color: var(--muted); }
    footer a { color: var(--accent); }
  </style>
</head>
<body>
  <div class="wrap">
    ${nav}
    <main class="doc">${bodyHtml}</main>
    <footer>
      <a href="/privacy">Privacy</a> · <a href="/terms">Terms</a>
    </footer>
  </div>
</body>
</html>`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

let cachedPrivacy: string | null = null;
let cachedTerms: string | null = null;

export function getPrivacyHtml(): string | null {
  if (cachedPrivacy !== null) return cachedPrivacy;
  const md = readMd("PRIVACY.md");
  if (!md) return null;
  cachedPrivacy = layout("Privacy Policy", marked.parse(md) as string, "privacy");
  return cachedPrivacy;
}

export function getTermsHtml(): string | null {
  if (cachedTerms !== null) return cachedTerms;
  const md = readMd("TERMS.md");
  if (!md) return null;
  cachedTerms = layout("Terms and Conditions", marked.parse(md) as string, "terms");
  return cachedTerms;
}

// Exact opt-in CTA SMS text (must match src/index.ts) for sample flow and CTA section
const OPT_IN_CTA_MESSAGE =
  "Bible Verse SMS: automated one-time verse reply per request. By replying YES, you consent to receive an automated SMS with the requested verse. Msg&Data Rates May Apply. Reply STOP to opt out, HELP for help.";

export function getLandingHtml(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="description" content="Bible Verse SMS: text a Bible reference to get the verse. On-demand, one reply per request. Reply YES to opt in. Msg&amp;Data rates may apply.">
  <title>Bible Verse SMS — Text for a Verse</title>
  <style>
    :root { --bg: #f8f9fa; --card: #ffffff; --text: #1a1a1a; --muted: #5c5c5c; --accent: #2d6a2d; --border: #e2e2e2; }
    * { box-sizing: border-box; }
    body { font-family: "Segoe UI", system-ui, sans-serif; background: var(--bg); color: var(--text); line-height: 1.6; margin: 0; min-height: 100vh; }
    .wrap { max-width: 640px; margin: 0 auto; padding: 1.5rem 1.75rem; }
    .nav { display: flex; gap: 1.25rem; margin-bottom: 2rem; padding-bottom: 1rem; border-bottom: 1px solid var(--border); }
    .nav a { color: var(--muted); text-decoration: none; font-size: 0.9375rem; }
    .nav a:hover, .nav a.active { color: var(--accent); }
    h1 { font-size: 1.5rem; margin: 0 0 0.5rem; }
    p { color: var(--muted); margin: 0.5rem 0; }
    .cta { background: var(--card); border: 1px solid var(--border); border-radius: 8px; padding: 1.25rem; margin: 1.5rem 0; }
    .cta strong { color: var(--accent); }
    .card { background: var(--card); border: 1px solid var(--border); border-radius: 10px; padding: 1.25rem 1.5rem; margin: 1rem 0; }
    .card strong { color: var(--accent); }
    .example { font-family: ui-monospace, monospace; font-size: 0.9rem; color: var(--muted); }
    .consent-list { margin: 0.75rem 0; padding-left: 1.25rem; color: var(--muted); font-size: 0.9375rem; }
    .consent-list li { margin: 0.35rem 0; }
    .consent-list a { color: var(--accent); text-decoration: none; }
    .consent-list a:hover { text-decoration: underline; }
    .sample-conversation { background: var(--card); border: 1px solid var(--border); border-radius: 10px; padding: 1.25rem; margin: 1rem 0; }
    .sample-conversation h3 { font-size: 0.8125rem; margin: 0 0 1rem; color: var(--muted); font-weight: 500; text-transform: uppercase; letter-spacing: 0.05em; }
    .msg { max-width: 85%; margin-bottom: 0.75rem; padding: 0.65rem 0.9rem; border-radius: 14px; font-size: 0.9rem; line-height: 1.4; }
    .msg-user { margin-left: auto; background: var(--accent); color: #fff; }
    .msg-service { margin-right: auto; background: var(--border); color: var(--text); }
    .msg-service .opt-in { font-size: 0.85rem; color: var(--muted); }
    .hero { text-align: center; padding: 2rem 0 2.5rem; }
    .hero h1 { font-size: 1.75rem; margin: 0 0 0.5rem; font-weight: 600; letter-spacing: -0.02em; }
    .hero .phone { font-size: 1.25rem; font-weight: 600; margin: 0.25rem 0; }
    .hero .phone a { color: var(--accent); text-decoration: none; }
    .hero .phone a:hover { text-decoration: underline; }
    .hero .tagline { color: var(--muted); font-size: 1.0625rem; margin: 0; }
    section { margin-bottom: 2.5rem; }
    section h2 { font-size: 1.125rem; margin: 0 0 0.75rem; color: var(--text); font-weight: 600; }
    section p { color: var(--muted); margin: 0.5rem 0; font-size: 0.9375rem; }
    footer { margin-top: 2.5rem; padding-top: 1.25rem; border-top: 1px solid var(--border); font-size: 0.875rem; color: var(--muted); }
    footer a { color: var(--accent); text-decoration: none; }
    footer a:hover { text-decoration: underline; }
  </style>
</head>
<body>
  <div class="wrap">
    <nav class="nav">
      <a href="/" class="active">Home</a>
      <a href="/privacy">Privacy</a>
      <a href="/terms">Terms</a>
    </nav>
    <header class="hero">
      <h1>Bible Verse SMS</h1>
      <p class="phone"><a href="tel:+17172971356">(717) 297-1356</a></p>
      <p class="tagline">Text a Bible reference to get the verse back. No app, no sign-up. Message and data rates may apply.</p>
    </header>

    <section>
      <h2>Sample conversation</h2>
      <p>Example of the opt-in flow: first-time users see the opt-in message and must reply YES before receiving the verse.</p>
      <div class="sample-conversation">
        <h3>Example message flow</h3>
        <div class="msg msg-user">John 3:16</div>
        <div class="msg msg-service"><span class="opt-in">${OPT_IN_CTA_MESSAGE}</span></div>
        <div class="msg msg-user">YES</div>
        <div class="msg msg-service">John 3:16 KJV — For God so loved the world, that he gave his only begotten Son, that whosoever believeth in him should not perish, but have everlasting life.</div>
      </div>
    </section>

    <section>
      <h2>How it works</h2>
      <div class="card">
        <p>Send a message with a reference (e.g. <span class="example">John 3:16</span>) or part of a verse. You’ll get <strong>one automated reply per request</strong>—no subscription, no recurring messages. Add <span class="example">ESV</span>, <span class="example">NIV</span>, <span class="example">NASB</span>, or <span class="example">NLT</span> for another translation; we default to KJV.</p>
        <p class="example" style="margin-top: 0.75rem;">John 3:16 · Psalm 23:1-3 · Romans 8:28 ESV · for God so loved the world</p>
      </div>
    </section>

    <section>
      <h2>How you consent (call to action)</h2>
      <p>End users consent to receive messages from <strong>Bible Verse SMS</strong> only by this text-in flow:</p>
      <ul class="consent-list">
        <li>Text our dedicated number with a Bible reference (e.g. &quot;John 3:16&quot;) or a partial quote. We do <strong>not</strong> send the verse immediately.</li>
        <li>You receive an opt-in confirmation SMS that explains the program, states that replies are automated and one-time, discloses that message and data rates may apply, and gives STOP/HELP instructions.</li>
        <li>You must reply <strong>YES</strong> to that opt-in message to confirm consent. Only after you reply YES do we send the requested verse and treat your number as opted in.</li>
        <li>This text-in + YES reply is the only opt-in method; there is no web form, in-store, verbal, or other consent method.</li>
      </ul>
      <p><strong>Message frequency:</strong> On-demand only. Each outbound message is a single automated reply to one user request. You control how often you text us.</p>
      <p><strong>Disclosures:</strong> Message and data rates may apply. <a href="/terms">Terms and Conditions</a> · <a href="/privacy">Privacy Policy</a>. Reply <strong>STOP</strong> to opt out; reply <strong>HELP</strong> for help and support information.</p>
    </section>

    <footer>
      <a href="/privacy">Privacy Policy</a> · <a href="/terms">Terms and Conditions</a>
    </footer>
  </div>
</body>
</html>`;
}
