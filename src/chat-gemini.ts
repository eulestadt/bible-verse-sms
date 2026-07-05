import type { Tool } from "@google/generative-ai";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { getSmsMaxChars, getSmsSegmentLimit } from "./carriers";
import { getConfig } from "./config";
import { segmentForSms } from "./formatter";
import { formatGroundingTag } from "./grounding-tag";
import { toGsm7 } from "./gsm7";
import { augmentWeatherQuery, isWeatherQuery, needsGroundedSearch } from "./live-search-intent";
import { MAX_SMS_SEGMENTS } from "./sms-encoding";
import type { ChatMessage, ChatSubscription } from "./chat-store";

/** @see https://ai.google.dev/gemini-api/docs/google-search — current models use googleSearch, not googleSearchRetrieval */
const GOOGLE_SEARCH_TOOL: Tool[] = [{ googleSearch: {} } as Tool];

function buildChatSystemPrompt(): string {
  const segmentLimit = getSmsSegmentLimit();
  const maxChars = getSmsMaxChars();
  return `You are a friendly, helpful AI assistant. The user is texting you via SMS, so keep every reply short.

Rules:
- Prefer ONE text message (under ${segmentLimit} characters) when the answer fits.
- Never exceed ${maxChars} characters total (about ${MAX_SMS_SEGMENTS} SMS segments).
- Be warm, direct, and conversational. No markdown, bullet lists, or long paragraphs.
- If a topic needs more detail, give the essential answer briefly and offer to elaborate.
- Do not mention that you are an AI unless asked.`;
}

function buildGroundedChatSystemPrompt(): string {
  const segmentLimit = getSmsSegmentLimit();
  const maxChars = getSmsMaxChars();
  const bodyBudget = Math.max(60, segmentLimit - 12);
  return `You are a friendly, helpful AI assistant. The user is texting you via SMS about live/current information.

Rules:
- Use Google Search grounding for up-to-date facts.
- Reply in ONE short SMS-friendly sentence (aim for under ${bodyBudget} characters).
- Never exceed ${maxChars} characters total across segments.
- No markdown, URLs, or bullet lists.
- Do not mention that you are an AI unless asked.`;
}

function buildWeatherGroundedSystemPrompt(zipCode: string): string {
  const segmentLimit = getSmsSegmentLimit();
  const maxChars = getSmsMaxChars();
  const bodyBudget = Math.max(60, segmentLimit - 12);
  return `You are a friendly, helpful AI assistant. The user is texting you via SMS about weather.

User ZIP code: ${zipCode}. Use it for this weather question unless they name another place.

Rules:
- NEVER ask for their location, city, or ZIP. Search and answer immediately using ZIP ${zipCode}.
- Use Google Search grounding for up-to-date conditions.
- Reply in ONE short SMS-friendly sentence (aim for under ${bodyBudget} characters).
- Never exceed ${maxChars} characters total across segments.
- No markdown, URLs, or bullet lists.
- Do not mention that you are an AI unless asked.`;
}

export async function generateChatReply(
  userMessage: string,
  history: ChatMessage[],
  sub: ChatSubscription
): Promise<string> {
  if (needsGroundedSearch(userMessage)) {
    return generateGroundedChatReply(userMessage, history, sub);
  }
  return generatePlainChatReply(userMessage, history, sub.carrierId);
}

async function generatePlainChatReply(
  userMessage: string,
  history: ChatMessage[],
  carrierId: string
): Promise<string> {
  const { geminiApiKey, geminiModel } = getConfig();

  if (!geminiApiKey) {
    return "AI chat is not configured yet. Please try again later.";
  }

  const genAI = new GoogleGenerativeAI(geminiApiKey);
  const model = genAI.getGenerativeModel({
    model: geminiModel,
    systemInstruction: buildChatSystemPrompt(),
  });

  const contents = buildContents(history, userMessage);

  try {
    const result = await model.generateContent({ contents });
    const text = result.response.text()?.trim() ?? "";
    if (!text) {
      return "Sorry, I didn't get that. Could you try again?";
    }
    return trimToSmsSegments(text, carrierId);
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

  const weather = isWeatherQuery(userMessage);
  const genAI = new GoogleGenerativeAI(geminiApiKey);
  const model = genAI.getGenerativeModel({
    model: geminiModel,
    systemInstruction: weather
      ? buildWeatherGroundedSystemPrompt(sub.zipCode)
      : buildGroundedChatSystemPrompt(),
    tools: GOOGLE_SEARCH_TOOL,
  });

  const query = weather ? augmentWeatherQuery(userMessage, sub.zipCode) : userMessage;
  const contents = buildContents(history, query);

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
