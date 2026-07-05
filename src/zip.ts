/** Normalize US ZIP to 5 digits; returns null if invalid. */
export function normalizeZip(input: string): string | null {
  const match = input.trim().match(/\b(\d{5})(?:-\d{4})?\b/);
  return match ? match[1] : null;
}
