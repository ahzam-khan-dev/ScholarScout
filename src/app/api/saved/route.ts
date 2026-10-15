import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getOrCreateDefaultProfile } from "@/lib/profile-service";
import { evaluateEligibility } from "@/lib/eligibility/engine";

export async function GET() {
  try {
    const profile = await getOrCreateDefaultProfile();

    const savedRecords = await prisma.savedScholarship.findMany({
      where: { profileId: profile.id },
      include: {
        scholarship: {
          include: {
            checklists: {
              where: { profileId: profile.id },
            },
          },
        },
      },
      orderBy: { savedAt: "desc" },
    });

    const scholarships = savedRecords.map((item) => {
      const sch = item.scholarship;
      const eligibility = evaluateEligibility(profile, sch);
      const checklistTotal = sch.checklists.length;
      const checklistCompleted = sch.checklists.filter((c) => c.isComplete).length;

      return {
        ...sch,
        eligibleCountries: JSON.parse(sch.eligibleCountries || "[]"),
        eligibleEducationLevels: JSON.parse(sch.eligibleEducationLevels || "[]"),
        eligibleFields: JSON.parse(sch.eligibleFields || "[]"),
        requiredDocuments: JSON.parse(sch.requiredDocuments || "[]"),
        additionalRequirements: JSON.parse(sch.additionalRequirements || "[]"),
        savedAt: item.savedAt,
        isSaved: true,
        eligibility,
        checklistProgress: {
          completed: checklistCompleted,
          total: checklistTotal,
        },
      };
    });

    return NextResponse.json({
      success: true,
      total: scholarships.length,
      scholarships,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to load saved scholarships";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
