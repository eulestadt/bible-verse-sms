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
    .section-divider { border: none; border-top: 2px solid var(--border); margin: 3rem 0; }
    .chat-section { scroll-margin-top: 1rem; }
    .form-group { margin-bottom: 1rem; }
    .form-group label { display: block; font-size: 0.875rem; font-weight: 500; margin-bottom: 0.35rem; color: var(--text); }
    .form-group input, .form-group select { width: 100%; padding: 0.65rem 0.75rem; border: 1px solid var(--border); border-radius: 6px; font-size: 1rem; font-family: inherit; background: var(--card); }
    .form-group input:focus, .form-group select:focus { outline: 2px solid var(--accent); outline-offset: 1px; border-color: var(--accent); }
    .checkbox-group { display: flex; gap: 0.5rem; align-items: flex-start; font-size: 0.875rem; color: var(--muted); }
    .checkbox-group input { width: auto; margin-top: 0.2rem; }
    .btn { display: inline-block; width: 100%; padding: 0.75rem 1rem; background: var(--accent); color: #fff; border: none; border-radius: 6px; font-size: 1rem; font-weight: 500; cursor: pointer; font-family: inherit; }
    .btn:hover { opacity: 0.92; }
    .btn:disabled { opacity: 0.6; cursor: not-allowed; }
    .form-status { margin-top: 0.75rem; font-size: 0.875rem; min-height: 1.25rem; }
    .form-status.success { color: var(--accent); }
    .form-status.error { color: #b33; }
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
      <p class="tagline">Text a Bible reference to get the verse back. No app, no sign-up. First-time users reply YES to opt in. Message and data rates may apply.</p>
    </header>

    <section>
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

    <hr class="section-divider">

    <section id="ai-chat" class="chat-section">
      <h2>AI Chat via Text</h2>
      <p>Sign up here, then <strong>text our number <a href="tel:+17172971356">(717) 297-1356</a></strong> to chat with AI. Replies are sent via your carrier&apos;s email-to-SMS gateway (e.g. Verizon <span class="example">@vtext.com</span>).</p>
      <div class="card">
        <form id="chat-signup-form">
          <div class="form-group">
            <label for="phone">Phone number</label>
            <input type="tel" id="phone" name="phone" placeholder="5551234567" required autocomplete="tel">
          </div>
          <div class="form-group">
            <label for="carrier">Phone carrier</label>
            <select id="carrier" name="carrier" required>
              <option value="">Select your carrier…</option>
              <option value="verizon">Verizon</option>
              <option value="att">AT&amp;T</option>
              <option value="tmobile">T-Mobile</option>
              <option value="sprint">Sprint / T-Mobile legacy</option>
              <option value="uscellular">US Cellular</option>
              <option value="cricket">Cricket</option>
              <option value="metro">Metro by T-Mobile</option>
              <option value="boost">Boost Mobile</option>
              <option value="virgin">Virgin Mobile</option>
              <option value="googlefi">Google Fi</option>
            </select>
          </div>
          <div class="form-group checkbox-group">
            <input type="checkbox" id="consent" name="consent" required>
            <label for="consent">I consent to receive automated AI chat replies by text. Message and data rates may apply. Reply STOP to opt out.</label>
          </div>
          <button type="submit" class="btn" id="chat-submit">Sign up for AI Chat</button>
          <p class="form-status" id="chat-status" role="status"></p>
        </form>
      </div>
      <div class="sample-conversation">
        <h3>Example AI chat flow</h3>
        <div class="msg msg-service">Signed up! Text (717) 297-1356 to chat.</div>
        <div class="msg msg-user">What&apos;s a good verse about hope?</div>
        <div class="msg msg-service">Romans 15:13 is great: &quot;May the God of hope fill you with joy and peace.&quot; Want the full verse?</div>
      </div>
      <p style="font-size: 0.875rem;">After signing up, text <a href="tel:+17172971356">(717) 297-1356</a> from the phone you registered. AI remembers messages from the last hour to keep replies in context. Each reply is kept short — usually one text, up to four if needed.</p>
    </section>

    <footer>
      <a href="/privacy">Privacy Policy</a> · <a href="/terms">Terms and Conditions</a>
    </footer>
  </div>
  <script>
    (function () {
      var form = document.getElementById("chat-signup-form");
      var status = document.getElementById("chat-status");
      var submitBtn = document.getElementById("chat-submit");
      if (!form) return;

      form.addEventListener("submit", function (e) {
        e.preventDefault();
        status.textContent = "";
        status.className = "form-status";
        submitBtn.disabled = true;

        var phone = document.getElementById("phone").value.trim();
        var carrier = document.getElementById("carrier").value;
        var consent = document.getElementById("consent").checked;

        fetch("/api/chat/signup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ phone: phone, carrier: carrier, consent: consent })
        })
          .then(function (res) { return res.json().then(function (data) { return { ok: res.ok, data: data }; }); })
          .then(function (result) {
            if (result.ok) {
              status.textContent = result.data.message || "Signed up! Check your phone.";
              status.className = "form-status success";
              form.reset();
            } else {
              status.textContent = result.data.error || "Something went wrong.";
              status.className = "form-status error";
            }
          })
          .catch(function () {
            status.textContent = "Network error. Please try again.";
            status.className = "form-status error";
          })
          .finally(function () { submitBtn.disabled = false; });
      });
    })();
  </script>
</body>
</html>`;
}
