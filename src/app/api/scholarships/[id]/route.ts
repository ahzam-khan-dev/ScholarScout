import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getOrCreateDefaultProfile } from "@/lib/profile-service";
import { evaluateEligibility } from "@/lib/eligibility/engine";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const profile = await getOrCreateDefaultProfile();

    const scholarship = await prisma.scholarship.findUnique({
      where: { id },
      include: {
        savedBy: {
          where: { profileId: profile.id },
        },
        checklists: {
          where: { profileId: profile.id },
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!scholarship) {
      return NextResponse.json(
        { success: false, error: "Scholarship not found" },
        { status: 404 }
      );
    }

    const eligibility = evaluateEligibility(profile, scholarship);
    const isSaved = scholarship.savedBy.length > 0;

    return NextResponse.json({
      success: true,
      scholarship: {
        ...scholarship,
        eligibleCountries: JSON.parse(scholarship.eligibleCountries || "[]"),
        eligibleEducationLevels: JSON.parse(scholarship.eligibleEducationLevels || "[]"),
        eligibleFields: JSON.parse(scholarship.eligibleFields || "[]"),
        requiredDocuments: JSON.parse(scholarship.requiredDocuments || "[]"),
        additionalRequirements: JSON.parse(scholarship.additionalRequirements || "[]"),
        isSaved,
        eligibility,
        checklists: scholarship.checklists,
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to load scholarship details";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
