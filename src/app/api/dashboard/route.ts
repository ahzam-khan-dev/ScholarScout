import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getOrCreateDefaultProfile } from "@/lib/profile-service";
import { evaluateEligibility } from "@/lib/eligibility/engine";
import { rankScholarships } from "@/lib/ranking/ranker";

export async function GET() {
  try {
    const profile = await getOrCreateDefaultProfile();

    const [allScholarships, savedCount, lastRun] = await Promise.all([
      prisma.scholarship.findMany({
        include: {
          savedBy: {
            where: { profileId: profile.id },
          },
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.savedScholarship.count({
        where: { profileId: profile.id },
      }),
      prisma.discoveryRun.findFirst({
        where: { profileId: profile.id },
        orderBy: { startedAt: "desc" },
      }),
    ]);

    const now = new Date();
    let upcomingCount = 0;
    let strongMatchCount = 0;

    const evaluated = allScholarships.map((sch) => {
      const eligibility = evaluateEligibility(profile, sch);
      const isSaved = sch.savedBy.length > 0;

      if (sch.deadline && new Date(sch.deadline) >= now) {
        upcomingCount++;
      }

      if (
        eligibility.overallStatus === "eligible" ||
        (eligibility.overallStatus === "potential_match" && eligibility.matchScore >= 70)
      ) {
        strongMatchCount++;
      }

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

    const ranked = rankScholarships(evaluated);
    const recommendations = ranked.slice(0, 6);

    return NextResponse.json({
      success: true,
      stats: {
        totalDiscovered: allScholarships.length,
        strongMatches: strongMatchCount,
        savedScholarships: savedCount,
        upcomingDeadlines: upcomingCount,
      },
      lastRun: lastRun
        ? {
            id: lastRun.id,
            status: lastRun.status,
            sourcesFound: lastRun.sourcesFound,
            recordsCreated: lastRun.recordsCreated,
            recordsUpdated: lastRun.recordsUpdated,
            errorSummary: lastRun.errorSummary,
            startedAt: lastRun.startedAt,
            completedAt: lastRun.completedAt,
          }
        : null,
      recommendations,
      profile,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to load dashboard metrics";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
