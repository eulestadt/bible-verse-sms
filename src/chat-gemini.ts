import { GoogleGenerativeAI } from "@google/generative-ai";
import { getSmsMaxChars, getSmsSegmentLimit, hasMmsFallback } from "./carriers";
import { getConfig } from "./config";
import { segmentForSms } from "./formatter";
import { toGsm7 } from "./gsm7";
import { MAX_SMS_SEGMENTS } from "./sms-encoding";
import type { ChatMessage } from "./chat-store";

function buildChatSystemPrompt(carrierId: string): string {
  const segmentLimit = getSmsSegmentLimit(carrierId);
  const maxChars = getSmsMaxChars(carrierId);

  if (hasMmsFallback(carrierId)) {
    return `You are a friendly, helpful AI assistant. The user is texting you via SMS/MMS.

Rules:
- Strongly prefer ONE short reply (under ${segmentLimit} characters) — short messages deliver fastest via SMS.
- Only use longer replies when needed; max ${maxChars} characters (delivered via slower MMS).
- Be warm, direct, and conversational. No markdown, bullet lists, or long paragraphs.
- If a topic needs more detail, give the essential answer briefly and offer to elaborate.
- Do not mention that you are an AI unless asked.`;
  }

  return `You are a friendly, helpful AI assistant. The user is texting you via SMS (GSM-7, 160 characters per segment), so keep every reply short.

Rules:
- Prefer ONE text message (under ${segmentLimit} characters) when the answer fits.
- Never exceed ${maxChars} characters total (about ${MAX_SMS_SEGMENTS} SMS segments).
- Be warm, direct, and conversational. No markdown, bullet lists, or long paragraphs.
- If a topic needs more detail, give the essential answer briefly and offer to elaborate.
- Do not mention that you are an AI unless asked.`;
}

export async function generateChatReply(
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
    systemInstruction: buildChatSystemPrompt(carrierId),
  });

  const contents = history.map((m) => ({
    role: m.role === "user" ? ("user" as const) : ("model" as const),
    parts: [{ text: m.text }],
  }));
  contents.push({ role: "user", parts: [{ text: userMessage }] });

  try {
    const result = await model.generateContent({ contents });
    let text = result.response.text()?.trim() ?? "";
    if (!text) {
      return "Sorry, I didn't get that. Could you try again?";
    }
    return trimToSmsSegments(text, carrierId);
  } catch (err) {
    console.error("Gemini chat error:", err instanceof Error ? err.message : err);
    throw err;
  }
}

/** Normalize and cap reply length for the user's carrier (SMS segments or MMS body). */
export function trimToSmsSegments(text: string, carrierId: string): string {
  const normalized = toGsm7(text.replace(/\s+/g, " ").trim());
  const maxChars = getSmsMaxChars(carrierId);

  if (hasMmsFallback(carrierId)) {
    return normalized.length <= maxChars ? normalized : normalized.slice(0, maxChars).trim();
  }

  const maxSegment = getSmsSegmentLimit(carrierId);
  const segments = segmentForSms(normalized, maxSegment);
  if (segments.length <= MAX_SMS_SEGMENTS) {
    return segments.join("\n");
  }
  return segments.slice(0, MAX_SMS_SEGMENTS).join("\n");
}
