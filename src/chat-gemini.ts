import type { Tool } from "@google/generative-ai";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { getSmsMaxChars, getSmsSegmentLimit } from "./carriers";
import { getConfig } from "./config";
import { segmentForSms } from "./formatter";
import { formatGroundingTag } from "./grounding-tag";
import { toGsm7 } from "./gsm7";
import { needsGroundedSearch } from "./live-search-intent";
import { MAX_SMS_SEGMENTS } from "./sms-encoding";
import type { ChatMessage, ChatSubscription } from "./chat-store";

/** @see https://ai.google.dev/gemini-api/docs/google-search — current models use googleSearch, not googleSearchRetrieval */
const GOOGLE_SEARCH_TOOL: Tool[] = [{ googleSearch: {} } as Tool];

function buildChatSystemPrompt(zipCode: string): string {
  const segmentLimit = getSmsSegmentLimit();
  const maxChars = getSmsMaxChars();
  return `You are a friendly, helpful AI assistant. The user is texting you via SMS, so keep every reply short.

User ZIP code: ${zipCode} — use this for weather and local queries. NEVER ask the user for their location, city, or ZIP; you already have it.

Rules:
- Prefer ONE text message (under ${segmentLimit} characters) when the answer fits.
- Never exceed ${maxChars} characters total (about ${MAX_SMS_SEGMENTS} SMS segments).
- Be warm, direct, and conversational. No markdown, bullet lists, or long paragraphs.
- If a topic needs more detail, give the essential answer briefly and offer to elaborate.
- Do not mention that you are an AI unless asked.`;
}

function buildGroundedChatSystemPrompt(zipCode: string): string {
  const segmentLimit = getSmsSegmentLimit();
  const maxChars = getSmsMaxChars();
  const bodyBudget = Math.max(60, segmentLimit - 12);
  return `You are a friendly, helpful AI assistant. The user is texting you via SMS about live/current information.

User ZIP code: ${zipCode}. Use this for weather and local queries unless they name another place.

Rules:
- NEVER ask the user for their location, city, or ZIP. Search and answer immediately using ZIP ${zipCode} when the question is about weather or local conditions.
- Use Google Search grounding for up-to-date facts.
- Reply in ONE short SMS-friendly sentence (aim for under ${bodyBudget} characters).
- Never exceed ${maxChars} characters total across segments.
- No markdown, URLs, or bullet lists.
- Do not mention that you are an AI unless asked.`;
}

/** Inject signup ZIP into vague weather/local queries so the model searches instead of asking. */
function augmentGroundedQuery(userMessage: string, zipCode: string): string {
  const text = userMessage.trim();
  if (!text) return text;

  const hasZip = text.includes(zipCode) || /\b\d{5}\b/.test(text);
  const namesPlace = /\b(in|at|for|near|around)\s+[A-Za-z]{2,}/i.test(text);
  const isWeatherLocal =
    /\b(weather|forecast|temperature|how (hot|cold|warm)|rain|snow|snowing|raining|sunny|cloudy|humidity|wind)\b/i.test(
      text
    ) || /\b(near me|my area|here|local)\b/i.test(text);

  if (isWeatherLocal && !hasZip && !namesPlace) {
    return `${text} in ${zipCode}`;
  }
  return text;
}

export async function generateChatReply(
  userMessage: string,
  history: ChatMessage[],
  sub: ChatSubscription
): Promise<string> {
  if (needsGroundedSearch(userMessage)) {
    return generateGroundedChatReply(userMessage, history, sub);
  }
  return generatePlainChatReply(userMessage, history, sub);
}

async function generatePlainChatReply(
  userMessage: string,
  history: ChatMessage[],
  sub: ChatSubscription
): Promise<string> {
  const { geminiApiKey, geminiModel } = getConfig();

  if (!geminiApiKey) {
    return "AI chat is not configured yet. Please try again later.";
  }

  const genAI = new GoogleGenerativeAI(geminiApiKey);
  const model = genAI.getGenerativeModel({
    model: geminiModel,
    systemInstruction: buildChatSystemPrompt(sub.zipCode),
  });

  const contents = buildContents(history, userMessage);

  try {
    const result = await model.generateContent({ contents });
    const text = result.response.text()?.trim() ?? "";
    if (!text) {
      return "Sorry, I didn't get that. Could you try again?";
    }
    return trimToSmsSegments(text, sub.carrierId);
  } catch (err) {
    console.error("Gemini chat error", err instanceof Error ? err.message : err);
    throw err;
  }
}

async function generateGroundedChatReply(
  userMessage: string,
  history: ChatMessage[],
  sub: ChatSubscription
): Promise<string> {
  const { geminiApiKey, geminiModel } = getConfig();

  if (!geminiApiKey) {
    return "AI chat is not configured yet. Please try again later.";
  }

  const genAI = new GoogleGenerativeAI(geminiApiKey);
  const model = genAI.getGenerativeModel({
    model: geminiModel,
    systemInstruction: buildGroundedChatSystemPrompt(sub.zipCode),
    tools: GOOGLE_SEARCH_TOOL,
  });

  const contents = buildContents(history, augmentGroundedQuery(userMessage, sub.zipCode));

  try {
    const result = await model.generateContent({ contents });
    const response = result.response;
    const text = response.text()?.trim() ?? "";
    if (!text) {
      return "Sorry, I couldn't find that. Could you try again?";
    }
    const metadata = response.candidates?.[0]?.groundingMetadata;
    const tag = formatGroundingTag(metadata);
    return trimToSmsSegments(text + tag, sub.carrierId);
  } catch (err) {
    console.error("Gemini grounded chat error", err instanceof Error ? err.message : err);
    throw err;
  }
}

function buildContents(history: ChatMessage[], userMessage: string) {
  const contents = history.map((m) => ({
    role: m.role === "user" ? ("user" as const) : ("model" as const),
    parts: [{ text: m.text }],
  }));
  contents.push({ role: "user", parts: [{ text: userMessage }] });
  return contents;
}

/** Normalize and cap reply to at most 4 email-to-SMS segments (120 chars each). */
export function trimToSmsSegments(text: string, _carrierId: string): string {
  const normalized = toGsm7(text.replace(/\s+/g, " ").trim());
  const maxSegment = getSmsSegmentLimit();
  const segments = segmentForSms(normalized, maxSegment);
  if (segments.length <= MAX_SMS_SEGMENTS) {
    return segments.join("\n");
  }
  return segments.slice(0, MAX_SMS_SEGMENTS).join("\n");
}
