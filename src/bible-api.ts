import { getConfig } from "./config";
import { resolveVersionToBibleId } from "./version-map";

/** API.Bible book name to book ID (e.g. John -> JHN). */
const BOOK_NAME_TO_ID: Record<string, string> = {
  genesis: "GEN", exodus: "EXO", leviticus: "LEV", numbers: "NUM", deuteronomy: "DEU",
  joshua: "JOS", judges: "JDG", ruth: "RUT", "1 samuel": "1SA", "2 samuel": "2SA",
  "1 kings": "1KI", "2 kings": "2KI", "1 chronicles": "1CH", "2 chronicles": "2CH",
  ezra: "EZR", nehemiah: "NEH", esther: "EST", job: "JOB", psalms: "PSA", psalm: "PSA",
  proverbs: "PRO", ecclesiastes: "ECC", "song of solomon": "SNG", song: "SNG",
  isaiah: "ISA", jeremiah: "JER", lamentations: "LAM", ezekiel: "EZK", daniel: "DAN",
  hosea: "HOS", joel: "JOL", amos: "AMO", obadiah: "OBA", jonah: "JON", micah: "MIC",
  nahum: "NAH", habakkuk: "HAB", zephaniah: "ZEP", haggai: "HAG", zechariah: "ZEC", malachi: "MAL",
  matthew: "MAT", mark: "MRK", luke: "LUK", john: "JHN", acts: "ACT", romans: "ROM",
  "1 corinthians": "1CO", "2 corinthians": "2CO", galatians: "GAL", ephesians: "EPH",
  philippians: "PHP", colossians: "COL", "1 thessalonians": "1TH", "2 thessalonians": "2TH",
  "1 timothy": "1TI", "2 timothy": "2TI", titus: "TIT", philemon: "PHM", hebrews: "HEB",
  james: "JAS", "1 peter": "1PE", "2 peter": "2PE", "1 john": "1JN", "2 john": "2JN", "3 john": "3JN",
  jude: "JUD", revelation: "REV",
};

const BASE = "https://api.scripture.api.bible/v1/bibles";

export interface BiblePassageResult {
  content: string;
  reference: string;
  version: string;
  copyright?: string;
}

/**
 * Convert a reference like "John 3:16" or "Psalm 23:1-3" to API.Bible passageId.
 * Gemini returns normalized "Book Chapter:Verse" or "Book Chapter:VerseStart-VerseEnd".
 */
function referenceToPassageId(reference: string): string {
  const ref = reference.trim();
  // Match: Book Chapter:Verse or Book Chapter:Verse-Verse
  const single = /^(.+?)\s+(\d+):(\d+)$/.exec(ref);
  const range = /^(.+?)\s+(\d+):(\d+)-(\d+)$/.exec(ref);
  const bookPart = (single ?? range)?.[1]?.trim() ?? "";
  const chapter = (single ?? range)?.[2] ?? "";
  const verseStart = (single ?? range)?.[3] ?? "";
  const verseEnd = range?.[4];

  const bookLower = bookPart.toLowerCase();
  let bookId = BOOK_NAME_TO_ID[bookLower];
  if (!bookId) {
    // Try without numbers for "1 John" etc
    const withNum = bookPart.replace(/\s+/g, " ");
    bookId = BOOK_NAME_TO_ID[withNum.toLowerCase()];
  }
  if (!bookId) bookId = bookPart.replace(/\s+/g, "").slice(0, 3).toUpperCase();

  if (verseEnd) {
    return `${bookId}.${chapter}.${verseStart}-${bookId}.${chapter}.${verseEnd}`;
  }
  return `${bookId}.${chapter}.${verseStart}`;
}

/**
 * Fetch passage from API.Bible. Optional context: expand range by ±2 verses.
 */
export async function fetchPassage(
  reference: string,
  version: string,
  withContext: boolean
): Promise<BiblePassageResult | null> {
  let apiBibleKey = getConfig().apiBibleKey;
  if (!apiBibleKey) {
    console.error("API_BIBLE_KEY not set");
    return null;
  }
  apiBibleKey = apiBibleKey.trim();

  const bibleId = resolveVersionToBibleId(version);
  let passageId = referenceToPassageId(reference);

  if (withContext) {
    const rangeMatch = /^(.+?)\s+(\d+):(\d+)(?:-(\d+))?$/.exec(reference.trim());
    if (rangeMatch) {
      const bookPart = (rangeMatch[1] ?? "").trim();
      const ch = rangeMatch[2] ?? "";
      const vStart = rangeMatch[3] ?? "1";
      const vEnd = rangeMatch[4];
      const start = parseInt(vStart, 10);
      const end = vEnd ? parseInt(vEnd, 10) : start;
      const newStart = Math.max(1, start - 2);
      const newEnd = end + 2;
      const bookLower = bookPart.toLowerCase();
      const bookId = BOOK_NAME_TO_ID[bookLower] ?? bookPart.replace(/\s+/g, "").slice(0, 3).toUpperCase();
      passageId = `${bookId}.${ch}.${newStart}-${bookId}.${ch}.${newEnd}`;
    }
  }

  const url = `${BASE}/${bibleId}/passages/${encodeURIComponent(passageId)}?content-type=text`;
  const res = await fetch(url, {
    headers: {
      "api-key": apiBibleKey,
      "Accept": "application/json",
    },
  });

  if (!res.ok) {
    const text = await res.text();
    if (res.status === 401) {
      console.error(
        "API.Bible 401 Unauthorized (bad api-key). Check: key from https://scripture.api.bible Dashboard, no extra spaces/newlines; app approved for this key; request goes to https://api.scripture.api.bible"
      );
    }
    console.error("API.Bible error", res.status, text);
    return null;
  }

  const data = (await res.json()) as {
    data?: { content?: string; id?: string };
    meta?: { fums?: string };
  };
  const content = data?.data?.content?.trim();
  if (!content) return null;

  return {
    content,
    reference,
    version: version || "KJV",
    copyright: "Scripture from API.Bible. Used with permission.",
  };
}
