import { GoogleGenerativeAI } from "@google/generative-ai";
import { getSmsMaxChars, getSmsSegmentLimit } from "./carriers";
import { getConfig } from "./config";
import { segmentForSms } from "./formatter";
import { toGsm7 } from "./gsm7";
import { MAX_SMS_SEGMENTS } from "./sms-encoding";
import type { ChatMessage } from "./chat-store";

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
    systemInstruction: buildChatSystemPrompt(),
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
