import { describe, it, expect } from "vitest";
import { rankScholarships, RankableScholarship } from "../lib/ranking/ranker";
import { EligibilityResult } from "../lib/eligibility/types";

function createMockEligibility(
  overallStatus: "eligible" | "potential_match" | "not_eligible",
  matchScore: number
): EligibilityResult {
  return {
    overallStatus,
    matchScore,
    criteria: {} as any,
    positiveReasons: [],
    missingCriteria: [],
  };
}

describe("Scholarship Ranking Module", () => {
  it("ranks eligible scholarships ahead of potential matches and ineligible ones", () => {
    const items: RankableScholarship[] = [
      {
        id: "1",
        name: "Ineligible Scholarship",
        eligibility: createMockEligibility("not_eligible", 40),
      },
      {
        id: "2",
        name: "Eligible Scholarship",
        eligibility: createMockEligibility("eligible", 90),
      },
      {
        id: "3",
        name: "Potential Match",
        eligibility: createMockEligibility("potential_match", 75),
      },
    ];

    const ranked = rankScholarships(items);
    expect(ranked[0].id).toBe("2"); // eligible
    expect(ranked[1].id).toBe("3"); // potential_match
    expect(ranked[2].id).toBe("1"); // not_eligible
  });

  it("ranks higher match scores higher among candidates with identical eligibility status", () => {
    const items: RankableScholarship[] = [
      {
        id: "low",
        name: "Low Score Potential",
        eligibility: createMockEligibility("potential_match", 55),
      },
      {
        id: "high",
        name: "High Score Potential",
        eligibility: createMockEligibility("potential_match", 85),
      },
    ];

    const ranked = rankScholarships(items);
    expect(ranked[0].id).toBe("high");
    expect(ranked[1].id).toBe("low");
  });

  it("ranks upcoming deadlines ahead of expired ones", () => {
    const futureDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    const pastDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const items: RankableScholarship[] = [
      {
        id: "expired",
        name: "Expired Opportunity",
        deadline: pastDate,
        eligibility: createMockEligibility("eligible", 90),
      },
      {
        id: "upcoming",
        name: "Upcoming Opportunity",
        deadline: futureDate,
        eligibility: createMockEligibility("eligible", 90),
      },
    ];

    const ranked = rankScholarships(items);
    expect(ranked[0].id).toBe("upcoming");
    expect(ranked[1].id).toBe("expired");
  });
});
