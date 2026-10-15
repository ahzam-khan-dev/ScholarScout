import {
  CriterionEvaluation,
  EligibilityResult,
  OverallEligibilityStatus,
  ScholarshipRequirementData,
  StudentProfileData,
} from "./types";

// Configurable weights for transparent scoring (sum to 100)
export const ELIGIBILITY_WEIGHTS = {
  educationLevel: 25,
  fieldOfStudy: 25,
  country: 20,
  academicScore: 15,
  familyIncome: 15,
} as const;

function parseArrayField(value: unknown): string[] {
  if (!value) return [];
  if (Array.isArray(value)) return value.map(String).map((s) => s.trim()).filter(Boolean);
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return parsed.map(String).map((s) => s.trim()).filter(Boolean);
    } catch {
      // not JSON, try comma-separated
      return value.split(",").map((s) => s.trim()).filter(Boolean);
    }
  }
  return [];
}

/**
 * Normalizes scores to a 0-100 percentage scale for fair comparison
 */
function normalizeScoreToPercentage(score: number, scale?: string | null): number | null {
  if (score === null || score === undefined || isNaN(score)) return null;

  const s = (scale || "").toLowerCase();

  // GPA out of 4.0
  if (s.includes("4") || (score <= 4.0 && !s.includes("100") && !s.includes("10"))) {
    return Math.min(100, Math.max(0, (score / 4.0) * 100));
  }

  // GPA out of 10.0
  if (s.includes("10") || (score <= 10.0 && !s.includes("100"))) {
    return Math.min(100, Math.max(0, (score / 10.0) * 100));
  }

  // Percentage out of 100
  if (s.includes("100") || score <= 100) {
    return Math.min(100, Math.max(0, score));
  }

  return null;
}

export function evaluateEligibility(
  student: StudentProfileData,
  scholarship: ScholarshipRequirementData
): EligibilityResult {
  const positiveReasons: string[] = [];
  const missingCriteria: string[] = [];

  // 1. Evaluate Education Level
  const eligibleLevels = parseArrayField(scholarship.eligibleEducationLevels).map((l) =>
    l.toLowerCase()
  );
  const studentLevel = (student.educationLevel || "").toLowerCase().trim();

  let educationEval: CriterionEvaluation;
  if (eligibleLevels.length === 0) {
    // Open to all education levels
    educationEval = {
      status: "met",
      explanation: "Open to all education levels.",
      weight: ELIGIBILITY_WEIGHTS.educationLevel,
      scoreContribution: ELIGIBILITY_WEIGHTS.educationLevel,
    };
    positiveReasons.push("Open to all education levels");
  } else if (!studentLevel) {
    educationEval = {
      status: "unknown",
      explanation: "Your education level is not specified in your profile.",
      weight: ELIGIBILITY_WEIGHTS.educationLevel,
      scoreContribution: 0,
    };
    missingCriteria.push("Education level needed to verify eligibility");
  } else {
    const isMatch = eligibleLevels.some(
      (lvl) => studentLevel.includes(lvl) || lvl.includes(studentLevel)
    );
    if (isMatch) {
      educationEval = {
        status: "met",
        explanation: `Your education level (${student.educationLevel}) matches the published requirement.`,
        weight: ELIGIBILITY_WEIGHTS.educationLevel,
        scoreContribution: ELIGIBILITY_WEIGHTS.educationLevel,
      };
      positiveReasons.push(`Education level matches (${student.educationLevel})`);
    } else {
      educationEval = {
        status: "not_met",
        explanation: `Requires ${eligibleLevels.join(", ")}, which does not match your level (${student.educationLevel}).`,
        weight: ELIGIBILITY_WEIGHTS.educationLevel,
        scoreContribution: 0,
      };
    }
  }

  // 2. Evaluate Field of Study
  const eligibleFields = parseArrayField(scholarship.eligibleFields).map((f) => f.toLowerCase());
  const studentField = (student.fieldOfStudy || "").toLowerCase().trim();

  let fieldEval: CriterionEvaluation;
  if (
    eligibleFields.length === 0 ||
    eligibleFields.some((f) => f.includes("all") || f.includes("any major") || f.includes("open"))
  ) {
    fieldEval = {
      status: "met",
      explanation: "Open to all academic fields of study.",
      weight: ELIGIBILITY_WEIGHTS.fieldOfStudy,
      scoreContribution: ELIGIBILITY_WEIGHTS.fieldOfStudy,
    };
    positiveReasons.push("Open to all academic disciplines");
  } else if (!studentField) {
    fieldEval = {
      status: "unknown",
      explanation: "Your field of study is not specified in your profile.",
      weight: ELIGIBILITY_WEIGHTS.fieldOfStudy,
      scoreContribution: 0,
    };
    missingCriteria.push("Field of study needed to verify discipline requirement");
  } else {
    const isMatch = eligibleFields.some(
      (f) =>
        studentField.includes(f) ||
        f.includes(studentField) ||
        (f.includes("stem") &&
          /computer|software|engineering|math|science|tech|physics|chemistry|biology/i.test(
            studentField
          ))
    );

    if (isMatch) {
      fieldEval = {
        status: "met",
        explanation: `Your field of study (${student.fieldOfStudy}) is eligible.`,
        weight: ELIGIBILITY_WEIGHTS.fieldOfStudy,
        scoreContribution: ELIGIBILITY_WEIGHTS.fieldOfStudy,
      };
      positiveReasons.push(`Field of study matches (${student.fieldOfStudy})`);
    } else {
      fieldEval = {
        status: "not_met",
        explanation: `Limited to ${eligibleFields.join(", ")}, which does not match your field (${student.fieldOfStudy}).`,
        weight: ELIGIBILITY_WEIGHTS.fieldOfStudy,
        scoreContribution: 0,
      };
    }
  }

  // 3. Evaluate Country & Residency
  const eligibleCountries = parseArrayField(scholarship.eligibleCountries).map((c) =>
    c.toLowerCase()
  );
  const studentCountry = (student.country || "").toLowerCase().trim();

  let countryEval: CriterionEvaluation;
  if (
    eligibleCountries.length === 0 ||
    eligibleCountries.some((c) => c.includes("international") || c.includes("all") || c.includes("worldwide"))
  ) {
    countryEval = {
      status: "met",
      explanation: "Open to international students and applicants worldwide.",
      weight: ELIGIBILITY_WEIGHTS.country,
      scoreContribution: ELIGIBILITY_WEIGHTS.country,
    };
    positiveReasons.push("Open to international applicants");
  } else if (!studentCountry) {
    countryEval = {
      status: "unknown",
      explanation: "Your country of residence is not specified in your profile.",
      weight: ELIGIBILITY_WEIGHTS.country,
      scoreContribution: 0,
    };
    missingCriteria.push("Country needed to verify citizenship or regional requirement");
  } else {
    const isMatch = eligibleCountries.some(
      (c) =>
        studentCountry.includes(c) ||
        c.includes(studentCountry) ||
        (c.includes("us") && (studentCountry.includes("united states") || studentCountry.includes("usa"))) ||
        (c.includes("uk") && (studentCountry.includes("united kingdom") || studentCountry.includes("britain")))
    );

    if (isMatch) {
      countryEval = {
        status: "met",
        explanation: `Your country of residence (${student.country}) matches the eligible region.`,
        weight: ELIGIBILITY_WEIGHTS.country,
        scoreContribution: ELIGIBILITY_WEIGHTS.country,
      };
      positiveReasons.push(`Country matches (${student.country})`);
    } else {
      countryEval = {
        status: "not_met",
        explanation: `Restricted to applicants in ${eligibleCountries.join(", ")}, which does not match your country (${student.country}).`,
        weight: ELIGIBILITY_WEIGHTS.country,
        scoreContribution: 0,
      };
    }
  }

  // 4. Evaluate Academic Score
  let scoreEval: CriterionEvaluation;
  const minRequiredScore = scholarship.minimumScore;

  if (minRequiredScore === null || minRequiredScore === undefined) {
    scoreEval = {
      status: "not_applicable",
      explanation: "No minimum academic score is mandated.",
      weight: ELIGIBILITY_WEIGHTS.academicScore,
      scoreContribution: ELIGIBILITY_WEIGHTS.academicScore, // full points if no barrier
    };
  } else if (student.academicScore === null || student.academicScore === undefined) {
    scoreEval = {
      status: "unknown",
      explanation: `Requires a minimum score of ${minRequiredScore}, but your academic score is not listed.`,
      weight: ELIGIBILITY_WEIGHTS.academicScore,
      scoreContribution: 0,
    };
    missingCriteria.push(`Academic score needed (minimum ${minRequiredScore} required)`);
  } else {
    const studentPct = normalizeScoreToPercentage(student.academicScore, student.gradingScale);
    const reqPct = normalizeScoreToPercentage(minRequiredScore, scholarship.gradingScale);

    if (studentPct !== null && reqPct !== null) {
      if (studentPct >= reqPct) {
        scoreEval = {
          status: "met",
          explanation: `Your academic score (${student.academicScore}) meets the minimum requirement (${minRequiredScore}).`,
          weight: ELIGIBILITY_WEIGHTS.academicScore,
          scoreContribution: ELIGIBILITY_WEIGHTS.academicScore,
        };
        positiveReasons.push(`Academic score meets requirement (${student.academicScore})`);
      } else {
        scoreEval = {
          status: "not_met",
          explanation: `Requires a minimum score of ${minRequiredScore}, but your score (${student.academicScore}) does not meet this threshold.`,
          weight: ELIGIBILITY_WEIGHTS.academicScore,
          scoreContribution: 0,
        };
      }
    } else {
      scoreEval = {
        status: "unknown",
        explanation: "Unable to compare academic scores due to differing or uncalibrated scales.",
        weight: ELIGIBILITY_WEIGHTS.academicScore,
        scoreContribution: 0,
      };
      missingCriteria.push("Academic grading scale calibration needed");
    }
  }

  // 5. Evaluate Family Income (Need-Based Criteria)
  let incomeEval: CriterionEvaluation;
  const incomeLimit = scholarship.incomeLimit;

  if (incomeLimit === null || incomeLimit === undefined) {
    incomeEval = {
      status: "not_applicable",
      explanation: "No family income ceiling is specified.",
      weight: ELIGIBILITY_WEIGHTS.familyIncome,
      scoreContribution: ELIGIBILITY_WEIGHTS.familyIncome,
    };
  } else if (student.annualFamilyIncome === null || student.annualFamilyIncome === undefined) {
    incomeEval = {
      status: "unknown",
      explanation: `Has an income cap of ${incomeLimit}, but your family income is not provided.`,
      weight: ELIGIBILITY_WEIGHTS.familyIncome,
      scoreContribution: 0,
    };
    missingCriteria.push(`Family income verification needed (cap: ${incomeLimit})`);
  } else {
    if (student.annualFamilyIncome <= incomeLimit) {
      incomeEval = {
        status: "met",
        explanation: `Your family income satisfies the need-based requirement (under ${incomeLimit}).`,
        weight: ELIGIBILITY_WEIGHTS.familyIncome,
        scoreContribution: ELIGIBILITY_WEIGHTS.familyIncome,
      };
      positiveReasons.push("Family income meets need-based ceiling");
    } else {
      incomeEval = {
        status: "not_met",
        explanation: `Family income exceeds the published limit of ${incomeLimit}.`,
        weight: ELIGIBILITY_WEIGHTS.familyIncome,
        scoreContribution: 0,
      };
    }
  }

  // 6. Additional Requirements
  const additionalReqs = parseArrayField(scholarship.additionalRequirements);
  let additionalEval: CriterionEvaluation;
  if (additionalReqs.length === 0) {
    additionalEval = {
      status: "not_applicable",
      explanation: "No additional special requirements specified.",
      weight: 0,
      scoreContribution: 0,
    };
  } else {
    additionalEval = {
      status: "unknown",
      explanation: `Requires verification for: ${additionalReqs.join("; ")}`,
      weight: 0,
      scoreContribution: 0,
    };
    missingCriteria.push(`Verify special conditions: ${additionalReqs.join(", ")}`);
  }

  // Calculate Match Score
  const totalScore = Math.round(
    educationEval.scoreContribution +
      fieldEval.scoreContribution +
      countryEval.scoreContribution +
      scoreEval.scoreContribution +
      incomeEval.scoreContribution
  );

  // Determine Overall Eligibility Status
  const allEvaluations = [educationEval, fieldEval, countryEval, scoreEval, incomeEval];

  let overallStatus: OverallEligibilityStatus;

  // If any mandatory criterion is definitively not met -> not_eligible
  if (allEvaluations.some((e) => e.status === "not_met")) {
    overallStatus = "not_eligible";
  } else if (allEvaluations.some((e) => e.status === "unknown")) {
    // If no criterion is violated, but some are unknown -> potential_match
    overallStatus = "potential_match";
  } else {
    // All known mandatory criteria are met or not applicable
    overallStatus = "eligible";
  }

  return {
    overallStatus,
    matchScore: Math.min(100, Math.max(0, totalScore)),
    criteria: {
      country: countryEval,
      educationLevel: educationEval,
      fieldOfStudy: fieldEval,
      academicScore: scoreEval,
      familyIncome: incomeEval,
      additionalRequirements: additionalEval,
    },
    positiveReasons,
    missingCriteria,
  };
}
