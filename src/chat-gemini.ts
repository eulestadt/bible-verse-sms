import { GoogleGenerativeAI } from "@google/generative-ai";
import { getSmsSegmentLimit } from "./carriers";
import { getConfig } from "./config";
import { segmentForSms } from "./formatter";
import { toGsm7 } from "./gsm7";
import type { ChatMessage } from "./chat-store";

const MAX_SEGMENTS = 4;

function buildChatSystemPrompt(segmentLimit: number): string {
  const maxChars = segmentLimit * MAX_SEGMENTS;
  return `You are a friendly, helpful AI assistant. The user is texting you via SMS, so keep every reply short.

Rules:
- Prefer ONE text message (under ${segmentLimit} characters) when the answer fits.
- Never exceed ${maxChars} characters total (about ${MAX_SEGMENTS} SMS segments).
- The user's carrier may append extra text to each message, so stay well under the limit.
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
  const segmentLimit = getSmsSegmentLimit(carrierId);

  if (!geminiApiKey) {
    return "AI chat is not configured yet. Please try again later.";
  }

  const genAI = new GoogleGenerativeAI(geminiApiKey);
  const model = genAI.getGenerativeModel({
    model: geminiModel,
    systemInstruction: buildChatSystemPrompt(segmentLimit),
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

/** Normalize and cap reply to at most 4 SMS segments. */
export function trimToSmsSegments(text: string, carrierId: string): string {
  const normalized = toGsm7(text.replace(/\s+/g, " ").trim());
  const maxSegment = getSmsSegmentLimit(carrierId);
  const segments = segmentForSms(normalized, maxSegment);
  if (segments.length <= MAX_SEGMENTS) {
    return segments.join("\n");
  }
  return segments.slice(0, MAX_SEGMENTS).join("\n");
}
