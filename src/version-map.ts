import { DEFAULT_BIBLE_ID, VERSION_TO_BIBLE_ID } from "./config";

/**
 * Resolve a version string (from user or Gemini) to an API.Bible Bible ID.
 * Defaults to KJV for unknown or missing version.
 */
export function resolveVersionToBibleId(version: string | null | undefined): string {
  if (!version || typeof version !== "string") return DEFAULT_BIBLE_ID;
  const trimmed = version.trim();
  if (!trimmed) return DEFAULT_BIBLE_ID;
  const id = VERSION_TO_BIBLE_ID[trimmed];
  if (id) return id;
  // Try case-insensitive
  const lower = trimmed.toLowerCase();
  for (const [key, val] of Object.entries(VERSION_TO_BIBLE_ID)) {
    if (key.toLowerCase() === lower) return val;
  }
  return DEFAULT_BIBLE_ID;
}
