import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getOrCreateDefaultProfile } from "@/lib/profile-service";
import { evaluateEligibility } from "@/lib/eligibility/engine";
import { rankScholarships } from "@/lib/ranking/ranker";

export async function GET(req: NextRequest) {
  try {
    const profile = await getOrCreateDefaultProfile();
    const { searchParams } = new URL(req.url);

    const search = searchParams.get("search")?.toLowerCase().trim() || "";
    const country = searchParams.get("country")?.toLowerCase().trim() || "";
    const educationLevel = searchParams.get("educationLevel")?.toLowerCase().trim() || "";
    const field = searchParams.get("field")?.toLowerCase().trim() || "";
    const deadlineStatus = searchParams.get("deadlineStatus") || "all";

    // Retrieve all stored scholarships
    const allScholarships = await prisma.scholarship.findMany({
      include: {
        savedBy: {
          where: { profileId: profile.id },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const now = new Date();
    const fourteenDaysAhead = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);

    // Compute eligibility and parse JSON fields
    const evaluated = allScholarships.map((sch) => {
      const eligibility = evaluateEligibility(profile, sch);
      const isSaved = sch.savedBy.length > 0;

      return {
        ...sch,
        eligibleCountries: JSON.parse(sch.eligibleCountries || "[]"),
        eligibleEducationLevels: JSON.parse(sch.eligibleEducationLevels || "[]"),
        eligibleFields: JSON.parse(sch.eligibleFields || "[]"),
        requiredDocuments: JSON.parse(sch.requiredDocuments || "[]"),
        additionalRequirements: JSON.parse(sch.additionalRequirements || "[]"),
        isSaved,
        eligibility,
      };
    });

    // Apply filters
    const filtered = evaluated.filter((item) => {
      // 1. Text search
      if (search) {
        const titleMatch = item.name.toLowerCase().includes(search);
        const providerMatch = (item.provider || "").toLowerCase().includes(search);
        const descMatch = (item.description || "").toLowerCase().includes(search);
        if (!titleMatch && !providerMatch && !descMatch) return false;
      }

      // 2. Country filter
      if (country && country !== "all") {
        const countries = item.eligibleCountries.map((c: string) => c.toLowerCase());
        const hasCountry =
          countries.includes("international") ||
          countries.includes("all") ||
          countries.some((c: string) => c.includes(country) || country.includes(c));
        if (!hasCountry) return false;
      }

      // 3. Education level filter
      if (educationLevel && educationLevel !== "all") {
        const levels = item.eligibleEducationLevels.map((l: string) => l.toLowerCase());
        const hasLevel =
          levels.length === 0 ||
          levels.some((l: string) => l.includes(educationLevel) || educationLevel.includes(l));
        if (!hasLevel) return false;
      }

      // 4. Field filter
      if (field && field !== "all") {
        const fields = item.eligibleFields.map((f: string) => f.toLowerCase());
        const hasField =
          fields.length === 0 ||
          fields.some((f: string) => f.includes("all") || f.includes(field) || field.includes(f));
        if (!hasField) return false;
      }

      // 5. Deadline status filter
      if (deadlineStatus && deadlineStatus !== "all") {
        const d = item.deadline ? new Date(item.deadline) : null;
        if (deadlineStatus === "expired") {
          if (!d || d >= now) return false;
        } else if (deadlineStatus === "closing_soon") {
          if (!d || d < now || d > fourteenDaysAhead) return false;
        } else if (deadlineStatus === "open") {
          if (d && d < now) return false;
        }
      }

      return true;
    });

    // Deterministically rank results
    const ranked = rankScholarships(filtered);

    return NextResponse.json({
      success: true,
      total: ranked.length,
      scholarships: ranked,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to load scholarships";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
