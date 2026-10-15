import { ExtractedScholarship, ExtractedScholarshipSchema } from "./schema";
import { validateSafeUrl } from "../security/url-safety";
import { parseISO, isValid } from "date-fns";

export interface RawPageData {
  url: string;
  finalUrl?: string;
  title?: string | null;
  description?: string | null;
  text?: string | null;
}

export function parseExtractedScholarship(page: RawPageData): ExtractedScholarship | null {
  const sourceUrl = page.finalUrl || page.url;
  if (!sourceUrl) return null;

  const urlCheck = validateSafeUrl(sourceUrl);
  if (!urlCheck.isSafe) return null;

  const text = (page.text || "").trim();
  const rawTitle = (page.title || "").trim();
  const description = (page.description || "").trim();

  // If both text and title are nearly empty, discard
  if (!rawTitle && text.length < 30) return null;

  // 1. Determine Scholarship Name
  let name = cleanTitle(rawTitle);
  if (!name || name.length < 3 || isGenericTitle(name)) {
    // Try to find from first Markdown H1 or prominent header
    const h1Match = text.match(/^#\s+(.+)$/m) || text.match(/^##\s+(.+)$/m);
    if (h1Match && h1Match[1] && h1Match[1].trim().length >= 3) {
      name = h1Match[1].trim();
    } else if (rawTitle) {
      name = rawTitle;
    } else {
      // Try to derive from URL pathname
      try {
        const u = new URL(sourceUrl);
        const slug = u.pathname.split("/").filter(Boolean).pop();
        if (slug) {
          name = slug.replace(/[-_]/g, " ").replace(/\.html?$/i, "");
          name = name.charAt(0).toUpperCase() + name.slice(1);
        }
      } catch {
        // fallback
      }
    }
  }

  if (!name || name.length < 3) return null;

  // 2. Determine Provider
  let provider = extractProvider(name, rawTitle, text, sourceUrl);

  // 3. Extract Award Amount & Currency
  const { awardAmount, awardCurrency, awardFrequency } = extractAwardDetails(text, description);

  // 4. Extract Deadline
  const { deadline, deadlineRaw } = extractDeadline(text, description);

  // 5. Extract Education Levels
  const eligibleEducationLevels = extractEducationLevels(text);

  // 6. Extract Eligible Fields
  const eligibleFields = extractEligibleFields(text);

  // 7. Extract Eligible Countries / Regions
  const eligibleCountries = extractEligibleCountries(text);

  // 8. Extract Minimum Score
  const { minimumScore, gradingScale } = extractScoreRequirements(text);

  // 9. Extract Income Limit
  const incomeLimit = extractIncomeLimit(text);

  // 10. Extract Application URL
  const applicationUrl = extractApplicationUrl(text, sourceUrl);

  // 11. Extract Required Documents
  const requiredDocuments = extractRequiredDocuments(text);

  // 12. Extract Source Excerpt
  const sourceExcerpt = extractExcerpt(text, description);

  // 13. Determine Verification Status
  let verificationStatus: "verified" | "partial" | "unverified" | "expired" = "verified";
  if (deadline && deadline < new Date()) {
    verificationStatus = "expired";
  } else if (!awardAmount && !deadline && eligibleEducationLevels.length === 0) {
    verificationStatus = "partial";
  }

  const rawRecord = {
    name,
    provider: provider || null,
    description: description || sourceExcerpt || null,
    sourceUrl,
    applicationUrl: applicationUrl || null,
    awardAmount: awardAmount || null,
    awardCurrency: awardCurrency || null,
    awardFrequency: awardFrequency || null,
    deadline: deadline || null,
    deadlineRaw: deadlineRaw || null,
    eligibleCountries,
    eligibleEducationLevels,
    eligibleFields,
    minimumScore: minimumScore || null,
    gradingScale: gradingScale || null,
    incomeLimit: incomeLimit || null,
    additionalRequirements: [],
    requiredDocuments,
    sourceExcerpt,
    verificationStatus,
    isDemo: false,
  };

  const validation = ExtractedScholarshipSchema.safeParse(rawRecord);
  if (!validation.success) {
    return null;
  }

  return validation.data;
}

function cleanTitle(title: string): string {
  if (!title) return "";
  // Strip common suffixes like "| Harvard University", "- Scholarships.com", ":: Official Portal"
  let cleaned = title.replace(/\s*([|–—\-]|\:\:)\s*[^|–—\-]+$/g, "").trim();
  // Strip trailing "Scholarship Program" if repeated
  return cleaned || title;
}

function isGenericTitle(title: string): boolean {
  const generic = [
    "home",
    "index",
    "scholarships",
    "financial aid",
    "grants",
    "scholarship opportunities",
    "apply now",
    "welcome",
    "student portal",
  ];
  return generic.includes(title.toLowerCase().trim());
}

function extractProvider(
  name: string,
  rawTitle: string,
  text: string,
  sourceUrl: string
): string | null {
  // Check if provider is at the end of the page title (e.g. "Merit Award | Stanford University")
  const titleParts = rawTitle.split(/[|–—\-]/);
  if (titleParts.length > 1) {
    const candidate = titleParts[titleParts.length - 1].trim();
    if (
      candidate.length > 3 &&
      candidate.length < 80 &&
      !candidate.toLowerCase().includes("scholarship")
    ) {
      return candidate;
    }
  }

  // Look for text patterns like "Offered by: XYZ" or "Administered by XYZ"
  const providerMatch = text.match(
    /(?:offered by|sponsored by|administered by|provider|organization|foundation):\s*([^\n.,;]{3,70})/i
  );
  if (providerMatch && providerMatch[1]) {
    return providerMatch[1].trim();
  }

  // Fallback to domain name
  try {
    const u = new URL(sourceUrl);
    const host = u.hostname.replace(/^www\./i, "");
    const parts = host.split(".");
    if (parts.length >= 2) {
      const orgName = parts[parts.length - 2];
      return orgName.charAt(0).toUpperCase() + orgName.slice(1);
    }
  } catch {
    // fallback
  }

  return null;
}

function extractAwardDetails(
  text: string,
  description: string
): {
  awardAmount: number | null;
  awardCurrency: string | null;
  awardFrequency: string | null;
} {
  const combined = `${text}\n${description}`;

  let awardCurrency: string | null = null;
  let awardAmount: number | null = null;
  let awardFrequency: string | null = null;

  // Check currency & amount patterns
  // Examples: $10,000, USD 5,000, €3,000, EUR 4000, £2500, ₹1,00,000, INR 50,000, CAD 20,000, AUD 15,000
  const currencyRegex =
    /(?:(\$|€|£|₹|USD|EUR|GBP|INR|CAD|AUD)\s*([0-9]{1,3}(?:,[0-9]{3})*(?:\.[0-9]{2})?|[0-9]+))|([0-9]{1,3}(?:,[0-9]{3})*)\s*(USD|EUR|GBP|INR|CAD|AUD|dollars|euros|pounds|rupees)/i;

  const match = combined.match(currencyRegex);
  if (match) {
    const symbolOrCode = (match[1] || match[4] || "").toUpperCase();
    const rawNum = match[2] || match[3] || "";
    const parsedNum = parseFloat(rawNum.replace(/,/g, ""));

    if (!isNaN(parsedNum) && parsedNum > 0 && parsedNum < 100000000) {
      awardAmount = parsedNum;
      if (symbolOrCode === "$" || symbolOrCode === "USD" || symbolOrCode.includes("DOLLAR"))
        awardCurrency = "USD";
      else if (symbolOrCode === "€" || symbolOrCode === "EUR" || symbolOrCode.includes("EURO"))
        awardCurrency = "EUR";
      else if (symbolOrCode === "£" || symbolOrCode === "GBP" || symbolOrCode.includes("POUND"))
        awardCurrency = "GBP";
      else if (symbolOrCode === "₹" || symbolOrCode === "INR" || symbolOrCode.includes("RUPEE"))
        awardCurrency = "INR";
      else if (symbolOrCode === "CAD") awardCurrency = "CAD";
      else if (symbolOrCode === "AUD") awardCurrency = "AUD";
      else awardCurrency = "USD";
    }
  }

  // Check frequency
  if (/(?:per year|annually|annual award|each year)/i.test(combined)) {
    awardFrequency = "annual";
  } else if (/(?:per semester|each semester|semester)/i.test(combined)) {
    awardFrequency = "per-semester";
  } else if (/(?:one-time|single payment|lump sum)/i.test(combined)) {
    awardFrequency = "one-time";
  } else if (/(?:full tuition|fully funded|tuition waiver)/i.test(combined)) {
    awardFrequency = "full tuition";
  }

  return { awardAmount, awardCurrency, awardFrequency };
}

function extractDeadline(
  text: string,
  description: string
): {
  deadline: Date | null;
  deadlineRaw: string | null;
} {
  const combined = `${text}\n${description}`;

  // Check for "Rolling" anywhere in context
  if (/rolling(?:\s+basis|\s+deadline)?|open\s+year-round|ongoing\s+applications/i.test(combined)) {
    return { deadline: null, deadlineRaw: "Rolling" };
  }

  // Match deadline keywords: deadline, closing date, application due, submit by, expires on
  const deadlineMatch = combined.match(
    /(?:application\s+deadline|deadline|closing\s+date|due\s+date|submit\s+by|apply\s+by|closes):\s*([^\n\r<;]{4,50})/i
  );

  let rawString: string | null = null;
  if (deadlineMatch && deadlineMatch[1]) {
    rawString = deadlineMatch[1].replace(/\.+$/, "").trim();
  }

  // Try parsing date from rawString or from surrounding context
  const textToScan = rawString || combined;

  // Patterns for dates:
  // 1. YYYY-MM-DD
  const isoMatch = textToScan.match(/\b(202[4-9]-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12][0-9]|3[01]))\b/);
  if (isoMatch) {
    const d = parseISO(isoMatch[1]);
    if (isValid(d)) {
      return { deadline: d, deadlineRaw: isoMatch[1] };
    }
  }

  // 2. Month DD, YYYY (e.g. October 31, 2026 or 31 October 2026)
  const monthNames =
    "(?:January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sep|Oct|Nov|Dec)";
  const namedDateRegex = new RegExp(
    `\\b(?:(${monthNames})\\s+([0-9]{1,2})(?:st|nd|rd|th)?,?\\s+(202[4-9])|([0-9]{1,2})(?:st|nd|rd|th)?\\s+(${monthNames}),?\\s+(202[4-9]))\\b`,
    "i"
  );

  const namedMatch = textToScan.match(namedDateRegex);
  if (namedMatch) {
    const month = namedMatch[1] || namedMatch[5];
    const day = namedMatch[2] || namedMatch[4];
    const year = namedMatch[3] || namedMatch[6];
    const candidateStr = `${month} ${day}, ${year}`;
    const parsed = new Date(candidateStr);
    if (!isNaN(parsed.getTime())) {
      return { deadline: parsed, deadlineRaw: candidateStr };
    }
  }

  return { deadline: null, deadlineRaw: rawString };
}

function extractEducationLevels(text: string): string[] {
  const levels = new Set<string>();
  const lower = text.toLowerCase();

  if (/\b(?:undergrad|undergraduate|bachelor|b\.?sc|b\.?a|b\.?tech)\b/i.test(lower)) {
    levels.add("undergraduate");
  }
  if (/\b(?:postgrad|postgraduate|graduate|master|m\.?sc|m\.?a|m\.?tech|mba)\b/i.test(lower)) {
    levels.add("graduate");
  }
  if (/\b(?:phd|ph\.?d|doctorate|doctoral|postdoc)\b/i.test(lower)) {
    levels.add("doctorate");
  }
  if (/\b(?:high\s*school|secondary\s*school|12th\s*grade|senior\s*secondary)\b/i.test(lower)) {
    levels.add("high_school");
  }

  return Array.from(levels);
}

function extractEligibleFields(text: string): string[] {
  const fields = new Set<string>();
  const lower = text.toLowerCase();

  if (/\b(?:all\s+disciplines|any\s+major|all\s+fields|open\s+to\s+all)\b/i.test(lower)) {
    return ["All Fields"];
  }

  if (/\b(?:computer\s*science|software|information\s*technology|computing|data\s*science|ai)\b/i.test(lower)) {
    fields.add("Computer Science");
  }
  if (/\b(?:engineering|mechanical|electrical|civil|aerospace)\b/i.test(lower)) {
    fields.add("Engineering");
  }
  if (/\b(?:stem|science,\s*technology,\s*engineering|mathematics|physics|chemistry|biology)\b/i.test(lower)) {
    fields.add("STEM");
  }
  if (/\b(?:business|finance|management|economics|accounting)\b/i.test(lower)) {
    fields.add("Business");
  }
  if (/\b(?:medicine|medical|health|nursing|pharmacy|biomedical)\b/i.test(lower)) {
    fields.add("Medicine");
  }
  if (/\b(?:arts|humanities|social\s*sciences|history|literature|philosophy)\b/i.test(lower)) {
    fields.add("Humanities & Arts");
  }
  if (/\b(?:law|legal\s*studies|juris\s*doctor)\b/i.test(lower)) {
    fields.add("Law");
  }

  return Array.from(fields);
}

function extractEligibleCountries(text: string): string[] {
  const countries = new Set<string>();
  const lower = text.toLowerCase();

  if (/\b(?:international\s+students|worldwide|any\s+nationality|all\s+countries)\b/i.test(lower)) {
    return ["International"];
  }

  const countryMap: Record<string, RegExp> = {
    US: /\b(?:united\s*states|u\.?s\.?a?|american\s+citizens?)\b/i,
    India: /\b(?:india|indian\s+citizens?|indian\s+students?)\b/i,
    Canada: /\b(?:canada|canadian\s+citizens?)\b/i,
    UK: /\b(?:united\s*kingdom|u\.?k\.?|great\s*britain|british)\b/i,
    Australia: /\b(?:australia|australian)\b/i,
    Germany: /\b(?:germany|german|daad)\b/i,
    France: /\b(?:france|french)\b/i,
    Japan: /\b(?:japan|japanese|mext)\b/i,
  };

  for (const [country, regex] of Object.entries(countryMap)) {
    if (regex.test(lower)) {
      countries.add(country);
    }
  }

  return Array.from(countries);
}

function extractScoreRequirements(text: string): {
  minimumScore: number | null;
  gradingScale: string | null;
} {
  // Check GPA (e.g., "3.5 GPA", "minimum 3.0", "GPA of 3.8 / 4.0")
  const gpaMatch = text.match(/(?:gpa\s*(?:of|at\s*least|minimum)?\s*|minimum\s+gpa\s*:?\s*)([0-4]\.[0-9]{1,2})/i);
  if (gpaMatch && gpaMatch[1]) {
    const val = parseFloat(gpaMatch[1]);
    if (!isNaN(val) && val >= 1.0 && val <= 4.0) {
      return { minimumScore: val, gradingScale: "gpa_4_0" };
    }
  }

  // Check percentage (e.g. "75% marks", "minimum 80% aggregate")
  const pctMatch = text.match(/(?:minimum|at\s*least)?\s*([5-9][0-9](?:\.[0-9]+)?)\s*%\s*(?:marks|aggregate|score)?/i);
  if (pctMatch && pctMatch[1]) {
    const val = parseFloat(pctMatch[1]);
    if (!isNaN(val) && val >= 40 && val <= 100) {
      return { minimumScore: val, gradingScale: "percentage_100" };
    }
  }

  return { minimumScore: null, gradingScale: null };
}

function extractIncomeLimit(text: string): number | null {
  const match = text.match(
    /(?:family\s+income|annual\s+income|household\s+income)(?:[^\d]{1,30})(?:under|less\s+than|below|up\s+to|not\s+exceeding)?\s*[$₹€£]?\s*([0-9]{1,3}(?:,[0-9]{3})+|[0-9]{4,9})/i
  );
  if (match && match[1]) {
    const val = parseFloat(match[1].replace(/,/g, ""));
    if (!isNaN(val) && val > 0 && val < 50000000) {
      return val;
    }
  }
  return null;
}

function extractApplicationUrl(text: string, sourceUrl: string): string | null {
  // Look for Markdown links with application keywords: [Apply Here](url), [Application Form](url), etc.
  const linkMatches = text.matchAll(/\[([^\]]*(?:apply|application|portal|register|submit)[^\]]*)\]\((https?:\/\/[^\s\)]+)\)/gi);

  for (const m of linkMatches) {
    const candidate = m[2];
    const check = validateSafeUrl(candidate);
    if (check.isSafe) {
      return check.normalizedUrl || candidate;
    }
  }

  return null;
}

function extractRequiredDocuments(text: string): string[] {
  const docs = new Set<string>();
  const lower = text.toLowerCase();

  if (/\b(?:transcripts?|academic\s+records?|mark\s*sheets?)\b/i.test(lower)) {
    docs.add("Official Academic Transcripts");
  }
  if (/\b(?:recommendation\s+letters?|letters?\s+of\s+recommendation|reference\s+letters?|lors?)\b/i.test(lower)) {
    docs.add("Letters of Recommendation");
  }
  if (/\b(?:statement\s+of\s+purpose|personal\s+statements?|sop|application\s+essays?|motivation\s+letters?)\b/i.test(lower)) {
    docs.add("Statement of Purpose / Essay");
  }
  if (/\b(?:resumes?|curriculum\s+vitae|cv)\b/i.test(lower)) {
    docs.add("Curriculum Vitae (CV) / Resume");
  }
  if (/\b(?:proof\s+of\s+income|income\s+certificate|tax\s+returns?|financial\s+affidavit)\b/i.test(lower)) {
    docs.add("Proof of Family Income / Financial Documentation");
  }
  if (/\b(?:passport|id\s+card|proof\s+of\s+citizenship|national\s+identity)\b/i.test(lower)) {
    docs.add("Identification / Proof of Citizenship");
  }
  if (/\b(?:portfolio|writing\s+sample|research\s+proposal)\b/i.test(lower)) {
    docs.add("Portfolio or Research Proposal");
  }

  return Array.from(docs);
}

function extractExcerpt(text: string, description: string): string {
  if (description && description.length >= 40) {
    return description.slice(0, 500).trim();
  }
  // Take first 300 characters of meaningful text
  const clean = text.replace(/#+.*$/gm, "").replace(/\n+/g, " ").trim();
  return clean.slice(0, 300);
}
