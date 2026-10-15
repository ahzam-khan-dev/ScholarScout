export type CriterionStatus = "met" | "not_met" | "unknown" | "not_applicable";

export type OverallEligibilityStatus = "eligible" | "potential_match" | "not_eligible";

export interface CriterionEvaluation {
  status: CriterionStatus;
  explanation: string;
  weight: number;
  scoreContribution: number;
}

export interface EligibilityResult {
  overallStatus: OverallEligibilityStatus;
  matchScore: number; // 0 to 100
  criteria: {
    country: CriterionEvaluation;
    educationLevel: CriterionEvaluation;
    fieldOfStudy: CriterionEvaluation;
    academicScore: CriterionEvaluation;
    familyIncome: CriterionEvaluation;
    additionalRequirements: CriterionEvaluation;
  };
  positiveReasons: string[];
  missingCriteria: string[];
}

export interface StudentProfileData {
  country?: string | null;
  region?: string | null;
  educationLevel?: string | null;
  degree?: string | null;
  fieldOfStudy?: string | null;
  yearOfStudy?: number | null;
  academicScore?: number | null;
  gradingScale?: string | null;
  annualFamilyIncome?: number | null;
  incomeCurrency?: string | null;
  residencyStatus?: string | null;
}

export interface ScholarshipRequirementData {
  eligibleCountries?: string[] | string | null;
  eligibleEducationLevels?: string[] | string | null;
  eligibleFields?: string[] | string | null;
  minimumScore?: number | null;
  gradingScale?: string | null;
  incomeLimit?: number | null;
  additionalRequirements?: string[] | string | null;
  deadline?: Date | string | null;
}
