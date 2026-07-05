/** Prompts that benefit from Grounding with Google Search (weather, live scores, etc.). */
const LIVE_SEARCH_PATTERNS: RegExp[] = [
  /\bweather\b/i,
  /\bforecast\b/i,
  /\btemperature\b/i,
  /\bhow('s| is) the weather\b/i,
  /\b(rain|snow|snowing|raining|sunny|cloudy|humidity|wind chill)\b/i,
  /\bhow (hot|cold|warm)\b/i,
  /\b(near me|my area|local weather)\b/i,
  /\b(stock|stocks|share price|market)\b/i,
  /\b(news|headlines|headline)\b/i,
  /\b(score|scores|final score|who won|game score)\b/i,
  /\b(latest|current|right now|live)\b.*\b(price|rate|score|news|weather)\b/i,
  /\bwhat('s| is) the (weather|forecast|score|price|temperature)\b/i,
];

export function needsGroundedSearch(message: string): boolean {
  const text = message.trim();
  if (!text) return false;
  return LIVE_SEARCH_PATTERNS.some((pattern) => pattern.test(text));
}
