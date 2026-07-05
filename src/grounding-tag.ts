import type { GroundingMetadata } from "@google/generative-ai";

const MAX_TAG_LEN = 11;

type GroundingChunk = { web?: { title?: string } };
type RawGroundingMetadata = {
  groundingChunks?: GroundingChunk[];
  groundingChuncks?: GroundingChunk[];
  webSearchQueries?: string[];
};

/** One-word Google Search grounding attribution for SMS (<12 chars including leading space). */
export function formatGroundingTag(metadata: GroundingMetadata | undefined): string {
  if (!metadata) return " Google";

  const raw = metadata as unknown as RawGroundingMetadata;
  const chunks = raw.groundingChunks ?? raw.groundingChuncks;

  const titleWord = chunks?.[0]?.web?.title?.trim().split(/\s+/)[0];
  const queryWord = raw.webSearchQueries?.[0]?.trim().split(/\s+/)[0];
  let word = (titleWord ?? queryWord ?? "Google").replace(/[^\w]/g, "");
  if (!word) word = "Google";

  const tag = ` ${word}`.slice(0, MAX_TAG_LEN);
  return tag.length > 1 ? tag : " Google";
}
