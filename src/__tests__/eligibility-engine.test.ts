import { describe, it, expect } from "vitest";
import { evaluateEligibility, ELIGIBILITY_WEIGHTS } from "../lib/eligibility/engine";

describe("Eligibility Engine & Match Scoring", () => {
  it("marks student as eligible when all mandatory criteria are met", () => {
    const student = {
      country: "United States",
      educationLevel: "undergraduate",
      fieldOfStudy: "Computer Science",
      academicScore: 3.8,
      gradingScale: "gpa_4_0",
      annualFamilyIncome: 40000,
    };

    const scholarship = {
      eligibleCountries: ["United States"],
      eligibleEducationLevels: ["undergraduate"],
      eligibleFields: ["Computer Science"],
      minimumScore: 3.5,
      gradingScale: "gpa_4_0",
      incomeLimit: 60000,
    };

    const result = evaluateEligibility(student, scholarship);

    expect(result.overallStatus).toBe("eligible");
    expect(result.matchScore).toBe(100);
    expect(result.criteria.country.status).toBe("met");
    expect(result.criteria.educationLevel.status).toBe("met");
    expect(result.criteria.fieldOfStudy.status).toBe("met");
    expect(result.criteria.academicScore.status).toBe("met");
    expect(result.criteria.familyIncome.status).toBe("met");
    expect(result.positiveReasons.length).toBeGreaterThanOrEqual(4);
  });

  it("marks student as potential_match when mandatory criteria are unknown", () => {
    // Student missing academic score
    const student = {
      country: "India",
      educationLevel: "graduate",
      fieldOfStudy: "Engineering",
      academicScore: null,
    };

    const scholarship = {
      eligibleCountries: ["India"],
      eligibleEducationLevels: ["graduate"],
      eligibleFields: ["Engineering"],
      minimumScore: 3.5,
    };

    const result = evaluateEligibility(student, scholarship);

    expect(result.overallStatus).toBe("potential_match");
    expect(result.criteria.academicScore.status).toBe("unknown");
    // Missing score must not inflate match score
    expect(result.matchScore).toBeLessThan(100);
    expect(result.missingCriteria.some((m) => m.toLowerCase().includes("academic score"))).toBe(true);
  });

  it("marks student as not_eligible when a mandatory requirement is violated", () => {
    const student = {
      country: "India",
      educationLevel: "undergraduate",
      fieldOfStudy: "History",
      academicScore: 2.9,
      gradingScale: "gpa_4_0",
    };

    const scholarship = {
      eligibleCountries: ["India"],
      eligibleEducationLevels: ["undergraduate"],
      eligibleFields: ["Computer Science"], // mismatch
      minimumScore: 3.5, // mismatch
    };

    const result = evaluateEligibility(student, scholarship);

    expect(result.overallStatus).toBe("not_eligible");
    expect(result.criteria.fieldOfStudy.status).toBe("not_met");
    expect(result.criteria.academicScore.status).toBe("not_met");
  });

  it("correctly normalizes percentage grading scale against GPA", () => {
    // 85% is equivalent to 3.4/4.0
    const studentWithPercentage = {
      country: "India",
      educationLevel: "graduate",
      fieldOfStudy: "STEM",
      academicScore: 88,
      gradingScale: "percentage_100",
    };

    const scholarshipRequiringGpa = {
      eligibleCountries: ["International"],
      eligibleEducationLevels: ["graduate"],
      eligibleFields: ["STEM"],
      minimumScore: 3.2, // 3.2/4.0 = 80%
      gradingScale: "gpa_4_0",
    };

    const result = evaluateEligibility(studentWithPercentage, scholarshipRequiringGpa);
    expect(result.criteria.academicScore.status).toBe("met");
  });

  it("evaluates need-based family income limits accurately", () => {
    const lowIncomeStudent = {
      country: "US",
      educationLevel: "undergraduate",
      fieldOfStudy: "Business",
      annualFamilyIncome: 30000,
    };

    const highIncomeStudent = {
      country: "US",
      educationLevel: "undergraduate",
      fieldOfStudy: "Business",
      annualFamilyIncome: 80000,
    };

    const needBasedScholarship = {
      eligibleCountries: ["US"],
      eligibleEducationLevels: ["undergraduate"],
      eligibleFields: ["Business"],
      incomeLimit: 50000,
    };

    const lowIncomeResult = evaluateEligibility(lowIncomeStudent, needBasedScholarship);
    expect(lowIncomeResult.criteria.familyIncome.status).toBe("met");

    const highIncomeResult = evaluateEligibility(highIncomeStudent, needBasedScholarship);
    expect(highIncomeResult.criteria.familyIncome.status).toBe("not_met");
    expect(highIncomeResult.overallStatus).toBe("not_eligible");
  });

  it("handles open scholarships with no restrictive criteria gracefully", () => {
    const student = {
      country: "France",
      educationLevel: "graduate",
      fieldOfStudy: "Art History",
    };

    const openScholarship = {
      eligibleCountries: ["International"],
      eligibleEducationLevels: [], // open
      eligibleFields: ["All Fields"],
      minimumScore: null,
      incomeLimit: null,
    };

    const result = evaluateEligibility(student, openScholarship);
    expect(result.overallStatus).toBe("eligible");
    expect(result.matchScore).toBe(100);
  });
});
