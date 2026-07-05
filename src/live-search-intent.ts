const WEATHER_SEARCH_PATTERNS: RegExp[] = [
  /\bweather\b/i,
  /\bforecast\b/i,
  /\btemperature\b/i,
  /\bhow('s| is) the weather\b/i,
  /\b(rain|snow|snowing|raining|sunny|cloudy|humidity|wind chill)\b/i,
  /\bhow (hot|cold|warm)\b/i,
  /\b(near me|my area|local weather)\b/i,
  /\bwhat('s| is) the (weather|forecast|temperature)\b/i,
];

/** Prompts that benefit from Grounding with Google Search (weather, live scores, etc.). */
const OTHER_LIVE_SEARCH_PATTERNS: RegExp[] = [
  /\b(stock|stocks|share price|market)\b/i,
  /\b(news|headlines|headline)\b/i,
  /\b(score|scores|final score|who won|game score)\b/i,
  /\b(latest|current|right now|live)\b.*\b(price|rate|score|news|weather)\b/i,
  /\bwhat('s| is) the (score|price)\b/i,
];

export function isWeatherQuery(message: string): boolean {
  const text = message.trim();
  if (!text) return false;
  return WEATHER_SEARCH_PATTERNS.some((pattern) => pattern.test(text));
}

export function needsGroundedSearch(message: string): boolean {
  const text = message.trim();
  if (!text) return false;
  return isWeatherQuery(text) || OTHER_LIVE_SEARCH_PATTERNS.some((pattern) => pattern.test(text));
}

/** Append signup ZIP to vague weather questions so the model searches instead of asking. */
export function augmentWeatherQuery(userMessage: string, zipCode: string): string {
  const text = userMessage.trim();
  if (!text || !isWeatherQuery(text)) return text;

  const hasZip = text.includes(zipCode) || /\b\d{5}\b/.test(text);
  const namesPlace = /\b(in|at|for|near|around)\s+[A-Za-z]{2,}/i.test(text);
  if (hasZip || namesPlace) return text;

  return `${text} in ${zipCode}`;
}
