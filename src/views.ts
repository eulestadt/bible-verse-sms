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
    :root { --bg: #0f0f12; --card: #1a1a20; --text: #e8e6e3; --muted: #9b9893; --accent: #7c9c6b; --border: #2d2d35; }
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

export const LANDING_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Bible Verse SMS</title>
  <style>
    :root { --bg: #0f0f12; --card: #1a1a20; --text: #e8e6e3; --muted: #9b9893; --accent: #7c9c6b; --border: #2d2d35; }
    * { box-sizing: border-box; }
    body { font-family: "Segoe UI", system-ui, sans-serif; background: var(--bg); color: var(--text); line-height: 1.6; margin: 0; min-height: 100vh; }
    .wrap { max-width: 560px; margin: 0 auto; padding: 1.5rem; }
    .nav { display: flex; gap: 1rem; margin-bottom: 2rem; padding-bottom: 1rem; border-bottom: 1px solid var(--border); }
    .nav a { color: var(--muted); text-decoration: none; }
    .nav a:hover { color: var(--accent); }
    h1 { font-size: 1.5rem; margin: 0 0 0.5rem; }
    p { color: var(--muted); margin: 0.5rem 0; }
    .cta { background: var(--card); border: 1px solid var(--border); border-radius: 8px; padding: 1.25rem; margin: 1.5rem 0; }
    .cta strong { color: var(--accent); }
    .example { font-family: ui-monospace, monospace; font-size: 0.9rem; color: var(--muted); margin: 0.75rem 0; }
    footer { margin-top: 2rem; padding-top: 1rem; border-top: 1px solid var(--border); font-size: 0.875rem; color: var(--muted); }
    footer a { color: var(--accent); }
  </style>
</head>
<body>
  <div class="wrap">
    <nav class="nav">
      <a href="/">Home</a>
      <a href="/privacy">Privacy</a>
      <a href="/terms">Terms</a>
    </nav>
    <h1>Bible Verse SMS</h1>
    <p>Text a Bible reference to our number and get the verse back. No app, no sign-up.</p>
    <div class="cta">
      <strong>How it works</strong>
      <p>Send a message with a reference (e.g. <span class="example">John 3:16</span>) or part of a verse. You’ll get one reply with the verse. Add <span class="example">ESV</span>, <span class="example">NIV</span>, <span class="example">NASB</span>, or <span class="example">NLT</span> for another translation; we default to KJV.</p>
      <p class="example">John 3:16 · Psalm 23:1-3 · Romans 8:28 ESV · for God so loved the world</p>
    </div>
    <p>Message and data rates may apply. Reply <strong>STOP</strong> to opt out, <strong>HELP</strong> for help.</p>
    <footer>
      <a href="/privacy">Privacy Policy</a> · <a href="/terms">Terms and Conditions</a>
    </footer>
  </div>
</body>
</html>`;
