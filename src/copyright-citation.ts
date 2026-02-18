/**
 * Copyright compliance for API.Bible content.
 *
 * Compliance: All copyright and licensing terms must be adhered to for each
 * individual content entity (text, audio), based on that content IP's
 * copyright and license. All copyright content must be cited as detailed in
 * the API.Bible Terms & Conditions.
 *
 * Full citation format:
 *   Scriptures quotations marked [Abbreviation] © are taken from the
 *   [Bible translation name] ©, Copyright [Copyright Year] [Organization name].
 *   Used by permission. All rights reserved. [Additional terms as required.]
 *
 * Space-constrained (SMS) abbreviation (use (c) for GSM-7):
 *   [Abbreviation] (c) [Year] [Organization name.] All rights reserved.
 */

/** Per-version citation data for the abbreviated SMS format. */
const VERSION_CITATION: Record<
  string,
  { abbreviation: string; year?: string; organization?: string }
> = {
  KJV: { abbreviation: "KJV" },
  ESV: { abbreviation: "ESV", year: "2011", organization: "Crossway" },
  NIV: { abbreviation: "NIV", year: "2011", organization: "Biblica" },
  NASB: { abbreviation: "NASB", year: "2020", organization: "The Lockman Foundation" },
  NLT: { abbreviation: "NLT", year: "2015", organization: "Tyndale House" },
};

/**
 * Build the abbreviated copyright citation for SMS.
 * KJV: version only. Others: "[Abbreviation] © [Year] [Organization.] All rights reserved."
 */
export function abbreviatedCitation(version: string): string {
  const v = version?.trim() || "KJV";
  const key = Object.keys(VERSION_CITATION).find((k) => k.toLowerCase() === v.toLowerCase()) ?? "KJV";
  const { abbreviation, year, organization } = VERSION_CITATION[key];
  if (!year || !organization) return abbreviation;
  const org = organization.endsWith(".") ? organization : `${organization}.`;
  return `${abbreviation} (c) ${year} ${org} All rights reserved.`;
}
