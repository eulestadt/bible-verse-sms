import dotenv from "dotenv";

dotenv.config();

/**
 * Version names/aliases -> API.Bible Bible IDs.
 * Default KJV when none specified. Add more IDs from https://api.scripture.api.bible/v1/bibles
 */
export const VERSION_TO_BIBLE_ID: Record<string, string> = {
  kjv: "de4e12af7f28f599-01",
  KJV: "de4e12af7f28f599-01",
  "king james": "de4e12af7f28f599-01",
  "King James": "de4e12af7f28f599-01",
  "King James Version": "de4e12af7f28f599-01",
  // ESV - use ID from your API.Bible account if available
  esv: "9879dbb7cfe39e4d-01",
  ESV: "9879dbb7cfe39e4d-01",
  // NIV
  niv: "06125adad2d5898a-01",
  NIV: "06125adad2d5898a-01",
  // NASB
  nasb: "06125adad2d5898a-01",
  NASB: "06125adad2d5898a-01",
  // NLT (New Living Translation)
  nlt: "d6e14a625393b4da-01",
  NLT: "d6e14a625393b4da-01",
  "new living": "d6e14a625393b4da-01",
  "New Living Translation": "d6e14a625393b4da-01",
};

export const DEFAULT_BIBLE_ID = VERSION_TO_BIBLE_ID["KJV"] ?? "de4e12af7f28f599-01";

export function getConfig() {
  const twilioAccountSid = process.env.TWILIO_ACCOUNT_SID;
  const twilioAuthToken = process.env.TWILIO_AUTH_TOKEN;
  const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER;
  const geminiApiKey = process.env.GEMINI_API_KEY;
  const geminiModel = process.env.GEMINI_MODEL ?? "gemini-2.5-flash";
  const apiBibleKey = process.env.API_BIBLE_KEY;
  const apiBibleBaseUrl =
    process.env.API_BIBLE_BASE_URL ?? "https://rest.api.bible/v1/bibles";
  const includeContextDefault = process.env.INCLUDE_CONTEXT_DEFAULT !== "false";
  const port = parseInt(process.env.PORT ?? "3000", 10);

  return {
    twilioAccountSid,
    twilioAuthToken,
    twilioPhoneNumber,
    geminiApiKey,
    geminiModel,
    apiBibleKey,
    apiBibleBaseUrl,
    includeContextDefault,
    port,
  };
}

export type Config = ReturnType<typeof getConfig>;
