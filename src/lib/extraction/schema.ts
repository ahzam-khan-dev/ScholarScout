import { z } from "zod";

/**
 * Zod validation schema for Student Profile
 */
export const StudentProfileSchema = z.object({
  name: z.string().trim().max(100).optional().nullable(),
  country: z.string().trim().min(2, "Country is required").max(100),
  region: z.string().trim().max(100).optional().nullable(),
  educationLevel: z.string().trim().min(1, "Education level is required"),
  degree: z.string().trim().max(150).optional().nullable(),
  fieldOfStudy: z.string().trim().min(1, "Field of study is required").max(150),
  yearOfStudy: z.coerce.number().int().min(1).max(10).optional().nullable(),
  institution: z.string().trim().max(200).optional().nullable(),
  academicScore: z.coerce.number().min(0).max(100).optional().nullable(),
  gradingScale: z.string().trim().max(50).optional().nullable(),
  annualFamilyIncome: z.coerce.number().min(0).optional().nullable(),
  incomeCurrency: z.string().trim().max(10).default("USD").optional().nullable(),
  residencyStatus: z.string().trim().max(100).optional().nullable(),
});

export type StudentProfileInput = z.infer<typeof StudentProfileSchema>;

/**
 * Zod validation schema for Extracted Scholarship record
 */
export const ExtractedScholarshipSchema = z.object({
  name: z.string().trim().min(3, "Scholarship name must be at least 3 characters").max(300),
  provider: z.string().trim().max(250).optional().nullable(),
  description: z.string().trim().max(5000).optional().nullable(),
  sourceUrl: z.string().url("Valid source URL is required"),
  applicationUrl: z.string().url("Must be a valid URL").optional().nullable(),
  awardAmount: z.number().min(0).optional().nullable(),
  awardCurrency: z.string().trim().max(10).optional().nullable(),
  awardFrequency: z.string().trim().max(50).optional().nullable(),
  deadline: z.coerce.date().optional().nullable(),
  deadlineRaw: z.string().trim().max(100).optional().nullable(),
  eligibleCountries: z.array(z.string().trim()).default([]),
  eligibleEducationLevels: z.array(z.string().trim()).default([]),
  eligibleFields: z.array(z.string().trim()).default([]),
  minimumScore: z.number().min(0).optional().nullable(),
  gradingScale: z.string().trim().max(50).optional().nullable(),
  incomeLimit: z.number().min(0).optional().nullable(),
  additionalRequirements: z.array(z.string().trim()).default([]),
  requiredDocuments: z.array(z.string().trim()).default([]),
  sourceExcerpt: z.string().trim().max(1000).optional().nullable(),
  verificationStatus: z
    .enum(["verified", "partial", "unverified", "expired"])
    .default("verified"),
  isDemo: z.boolean().default(false),
});

export type ExtractedScholarship = z.infer<typeof ExtractedScholarshipSchema>;
