import { EligibilityResult, OverallEligibilityStatus } from "../eligibility/types";

export interface RankableScholarship {
  id: string;
  name: string;
  deadline?: Date | string | null;
  verificationStatus?: string | null;
  eligibility: EligibilityResult;
  [key: string]: unknown;
}

export function rankScholarships<T extends RankableScholarship>(items: T[]): T[] {
  return [...items].sort((a, b) => {
    // 1. Primary sort: Overall Eligibility Status
    const statusWeight: Record<OverallEligibilityStatus, number> = {
      eligible: 3,
      potential_match: 2,
      not_eligible: 1,
    };

    const statusDiff =
      statusWeight[b.eligibility.overallStatus] - statusWeight[a.eligibility.overallStatus];
    if (statusDiff !== 0) return statusDiff;

    // 2. Secondary sort: Match Score (descending)
    const scoreDiff = b.eligibility.matchScore - a.eligibility.matchScore;
    if (scoreDiff !== 0) return scoreDiff;

    // 3. Deadline priority:
    // Non-expired upcoming deadlines > null/unknown deadlines > expired deadlines
    const now = new Date();
    const aDead = a.deadline ? new Date(a.deadline) : null;
    const bDead = b.deadline ? new Date(b.deadline) : null;

    const aExpired = aDead && aDead < now;
    const bExpired = bDead && bDead < now;

    if (!aExpired && bExpired) return -1;
    if (aExpired && !bExpired) return 1;

    // Among upcoming deadlines, sooner is prioritized (closing soon is actionable)
    if (aDead && bDead && !aExpired && !bExpired) {
      const timeDiff = aDead.getTime() - bDead.getTime();
      if (timeDiff !== 0) return timeDiff;
    }

    // 4. Verification status
    const verWeight = (status?: string | null) => {
      if (status === "verified") return 3;
      if (status === "partial") return 2;
      return 1;
    };
    const verDiff = verWeight(b.verificationStatus) - verWeight(a.verificationStatus);
    if (verDiff !== 0) return verDiff;

    // 5. Alphabetical tie-break
    return a.name.localeCompare(b.name);
  });
}
