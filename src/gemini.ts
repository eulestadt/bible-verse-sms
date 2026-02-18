import { GoogleGenerativeAI } from "@google/generative-ai";
import { getConfig } from "./config";

const REFERENCE_VERSION_PROMPT = `You are a Bible reference parser. The user will send a short SMS message: either a Bible reference (e.g. "John 3:16", "Psalm 23:1-3") or a partial quote they remember.

Rules:
- Reply with exactly two lines. Line 1: the single canonical Bible reference in the form "Book Chapter:Verse" or "Book Chapter:VerseStart-VerseEnd" (e.g. "John 3:16", "Psalm 23:1-6"). Use full book names (e.g. "1 John" not "1Jn"). Line 2: the version code - one of KJV, ESV, NIV, NASB, NLT - if the user specified one (e.g. "in ESV", "NIV", "NLT", "KJV"); otherwise use KJV.
- If the user asks for "context" or "with context", still output only the reference and version on two lines; we will add context separately.
- If you cannot determine a reference, reply on line 1: "UNKNOWN" and line 2: "KJV".
- If the message is not about a Bible verse, reply line 1: "UNKNOWN" and line 2: "KJV".
- Output nothing else, no explanation, only these two lines.`;

export interface ResolvedReference {
  reference: string;
  version: string;
  withContext: boolean;
}

export async function resolveReferenceAndVersion(
  userMessage: string,
  includeContextDefault: boolean
): Promise<ResolvedReference> {
  const { geminiApiKey, geminiModel } = getConfig();
  const withContext =
    includeContextDefault ||
    /\b(with\s+)?context\b/i.test(userMessage);

  if (!geminiApiKey) {
    return {
      reference: "UNKNOWN",
      version: "KJV",
      withContext,
    };
  }

  const genAI = new GoogleGenerativeAI(geminiApiKey);
  const model = genAI.getGenerativeModel({ model: geminiModel });

  try {
    const result = await model.generateContent({
      contents: [
        {
          role: "user",
          parts: [{ text: `${REFERENCE_VERSION_PROMPT}\n\nUser wrote: "${userMessage}"` }],
        },
      ],
    });

    const response = result.response;
    const text = response.text()?.trim() ?? "";

    if (!text) {
      console.warn("Gemini returned empty or blocked response for:", userMessage);
      return { reference: "UNKNOWN", version: "KJV", withContext };
    }

    const lines = text.split(/\n/).map((s) => s.trim()).filter(Boolean);
    const reference = lines[0]?.replace(/^reference:?\s*/i, "").trim() || "UNKNOWN";
    const version = lines[1]?.replace(/^version:?\s*/i, "").trim() || "KJV";

    return {
      reference,
      version,
      withContext,
    };
  } catch (err) {
    console.error("Gemini API error:", err instanceof Error ? err.message : err);
    throw err;
  }
}
