import { describe, it, expect } from "vitest";
import { parseExtractedScholarship } from "../lib/extraction/parser";
import { ExtractedScholarshipSchema } from "../lib/extraction/schema";

describe("Scholarship Extraction & Parser", () => {
  it("extracts structured fields from rich markdown content", () => {
    const raw = {
      url: "https://stanford.edu/academics/merit-fellowship",
      title: "Stanford Graduate Merit Fellowship | Stanford University",
      description: "Full tuition fellowship for doctoral candidates in engineering and science.",
      text: `
# Stanford Graduate Merit Fellowship
Offered by: Stanford University School of Engineering

The fellowship provides $45,000 annually covering tuition and stipend for graduate and PhD students in Computer Science and Engineering.
Applicants must have a minimum GPA of 3.8 / 4.0.

Application deadline: December 15, 2026.
[Apply Here](https://stanford.edu/apply/merit)

Required application materials:
- Official Academic Transcripts
- Three Letters of Recommendation
- Statement of Purpose / Essay
- Comprehensive Curriculum Vitae (CV)
      `,
    };

    const parsed = parseExtractedScholarship(raw);
    expect(parsed).not.toBeNull();
    if (!parsed) return;

    expect(parsed.name).toContain("Stanford Graduate Merit Fellowship");
    expect(parsed.provider).toBe("Stanford University");
    expect(parsed.awardAmount).toBe(45000);
    expect(parsed.awardCurrency).toBe("USD");
    expect(parsed.awardFrequency).toBe("annual");
    expect(parsed.eligibleEducationLevels).toContain("graduate");
    expect(parsed.eligibleEducationLevels).toContain("doctorate");
    expect(parsed.eligibleFields).toContain("Computer Science");
    expect(parsed.minimumScore).toBe(3.8);
    expect(parsed.applicationUrl).toBe("https://stanford.edu/apply/merit");
    expect(parsed.deadline).toBeInstanceOf(Date);
    expect(parsed.requiredDocuments.length).toBeGreaterThanOrEqual(3);
  });

  it("handles missing deadlines gracefully without fabricating dates", () => {
    const raw = {
      url: "https://example.org/scholarship",
      title: "Community Leadership Grant",
      description: "Annual grant for undergraduate students.",
      text: `
# Community Leadership Grant
Awards $5,000 to undergraduate students in all disciplines.
Applications are reviewed on a rolling basis.
      `,
    };

    const parsed = parseExtractedScholarship(raw);
    expect(parsed).not.toBeNull();
    if (!parsed) return;

    expect(parsed.deadline).toBeNull();
    expect(parsed.deadlineRaw).toBe("Rolling");
  });

  it("handles malformed deadline strings without crashing", () => {
    const raw = {
      url: "https://example.org/fellowship",
      title: "Global Research Fellowship",
      text: `
# Global Research Fellowship
Award: €10,000 per year.
Application deadline: To be announced soon for upcoming batch.
      `,
    };

    const parsed = parseExtractedScholarship(raw);
    expect(parsed).not.toBeNull();
    if (!parsed) return;

    expect(parsed.deadline).toBeNull();
    expect(parsed.deadlineRaw).toContain("To be announced");
  });

  it("discards records with unsafe or blocked URLs", () => {
    const raw = {
      url: "http://127.0.0.1:8000/internal-scholarship",
      title: "Internal Scholarship",
      text: "Some grant content",
    };

    const parsed = parseExtractedScholarship(raw);
    expect(parsed).toBeNull();
  });

  it("discards empty or uninformative pages", () => {
    const raw = {
      url: "https://example.com/empty",
      title: "",
      text: "     ",
    };

    const parsed = parseExtractedScholarship(raw);
    expect(parsed).toBeNull();
  });

  it("validates against ExtractedScholarshipSchema", () => {
    const valid = {
      name: "Turing Award Fellowship",
      sourceUrl: "https://acm.org/fellowship",
      awardAmount: 25000,
      awardCurrency: "USD",
      eligibleCountries: ["International"],
      eligibleEducationLevels: ["graduate"],
      eligibleFields: ["Computer Science"],
      requiredDocuments: ["Official Academic Transcripts"],
      verificationStatus: "verified" as const,
      isDemo: false,
    };

    const validated = ExtractedScholarshipSchema.safeParse(valid);
    expect(validated.success).toBe(true);
  });
});
