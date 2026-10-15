import { describe, it, expect } from "vitest";
import { StudentProfileSchema } from "../lib/extraction/schema";

describe("Student Profile Validation", () => {
  it("accepts a complete, valid student profile", () => {
    const valid = {
      name: "Maria Chen",
      country: "Canada",
      region: "British Columbia",
      educationLevel: "undergraduate",
      degree: "B.Sc. in Data Science",
      fieldOfStudy: "Computer Science",
      yearOfStudy: 2,
      institution: "UBC",
      academicScore: 3.9,
      gradingScale: "gpa_4_0",
      annualFamilyIncome: 45000,
      incomeCurrency: "CAD",
      residencyStatus: "citizen",
    };

    const res = StudentProfileSchema.safeParse(valid);
    expect(res.success).toBe(true);
  });

  it("accepts a minimal profile with only mandatory fields", () => {
    const minimal = {
      country: "India",
      educationLevel: "graduate",
      fieldOfStudy: "Mechanical Engineering",
    };

    const res = StudentProfileSchema.safeParse(minimal);
    expect(res.success).toBe(true);
  });

  it("rejects when country is missing", () => {
    const missingCountry = {
      educationLevel: "undergraduate",
      fieldOfStudy: "Physics",
    };

    const res = StudentProfileSchema.safeParse(missingCountry);
    expect(res.success).toBe(false);
  });

  it("rejects when educationLevel is empty", () => {
    const emptyLevel = {
      country: "Germany",
      educationLevel: "",
      fieldOfStudy: "Chemistry",
    };

    const res = StudentProfileSchema.safeParse(emptyLevel);
    expect(res.success).toBe(false);
  });

  it("validates numerical constraints on academicScore", () => {
    const negativeScore = {
      country: "US",
      educationLevel: "undergraduate",
      fieldOfStudy: "CS",
      academicScore: -1,
    };
    expect(StudentProfileSchema.safeParse(negativeScore).success).toBe(false);

    const excessiveScore = {
      country: "US",
      educationLevel: "undergraduate",
      fieldOfStudy: "CS",
      academicScore: 105,
    };
    expect(StudentProfileSchema.safeParse(excessiveScore).success).toBe(false);
  });
});
