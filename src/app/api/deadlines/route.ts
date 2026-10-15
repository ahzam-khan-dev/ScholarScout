import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getOrCreateDefaultProfile } from "@/lib/profile-service";
import { evaluateEligibility } from "@/lib/eligibility/engine";

export async function GET() {
  try {
    const profile = await getOrCreateDefaultProfile();

    const scholarships = await prisma.scholarship.findMany({
      include: {
        savedBy: {
          where: { profileId: profile.id },
        },
      },
      orderBy: { deadline: "asc" },
    });

    const now = new Date();
    const fourteenDaysAhead = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);

    const closingSoon: Array<any> = [];
    const upcoming: Array<any> = [];
    const expired: Array<any> = [];
    const unknown: Array<any> = [];

    for (const sch of scholarships) {
      const eligibility = evaluateEligibility(profile, sch);
      const isSaved = sch.savedBy.length > 0;

      const item = {
        ...sch,
        eligibleCountries: JSON.parse(sch.eligibleCountries || "[]"),
        eligibleEducationLevels: JSON.parse(sch.eligibleEducationLevels || "[]"),
        eligibleFields: JSON.parse(sch.eligibleFields || "[]"),
        requiredDocuments: JSON.parse(sch.requiredDocuments || "[]"),
        additionalRequirements: JSON.parse(sch.additionalRequirements || "[]"),
        isSaved,
        eligibility,
      };

      if (!sch.deadline) {
        unknown.push(item);
      } else {
        const d = new Date(sch.deadline);
        if (d < now) {
          expired.push(item);
        } else if (d <= fourteenDaysAhead) {
          closingSoon.push(item);
        } else {
          upcoming.push(item);
        }
      }
    }

    return NextResponse.json({
      success: true,
      counts: {
        total: scholarships.length,
        closingSoon: closingSoon.length,
        upcoming: upcoming.length,
        expired: expired.length,
        unknown: unknown.length,
      },
      categories: {
        closingSoon,
        upcoming,
        expired,
        unknown,
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to load deadlines";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
