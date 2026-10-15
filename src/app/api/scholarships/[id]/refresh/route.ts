import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { TinyFishClient } from "@/lib/tinyfish/client";
import { parseExtractedScholarship } from "@/lib/extraction/parser";
import { getOrCreateDefaultProfile } from "@/lib/profile-service";
import { evaluateEligibility } from "@/lib/eligibility/engine";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const profile = await getOrCreateDefaultProfile();

    const scholarship = await prisma.scholarship.findUnique({
      where: { id },
    });

    if (!scholarship) {
      return NextResponse.json(
        { success: false, error: "Scholarship not found" },
        { status: 404 }
      );
    }

    // In demo mode or if API key not configured, simulate refresh of timestamp
    if (scholarship.isDemo || !process.env.TINYFISH_API_KEY) {
      const updated = await prisma.scholarship.update({
        where: { id },
        data: {
          lastVerifiedAt: new Date(),
          verificationStatus: "verified",
        },
      });

      const eligibility = evaluateEligibility(profile, updated);

      return NextResponse.json({
        success: true,
        message: "Source verification refreshed successfully (Demo mode)",
        scholarship: {
          ...updated,
          eligibleCountries: JSON.parse(updated.eligibleCountries || "[]"),
          eligibleEducationLevels: JSON.parse(updated.eligibleEducationLevels || "[]"),
          eligibleFields: JSON.parse(updated.eligibleFields || "[]"),
          requiredDocuments: JSON.parse(updated.requiredDocuments || "[]"),
          additionalRequirements: JSON.parse(updated.additionalRequirements || "[]"),
          eligibility,
        },
      });
    }

    const client = new TinyFishClient();
    const fetchRes = await client.fetch({
      urls: [scholarship.sourceUrl],
      format: "markdown",
      purpose: "Re-verify scholarship criteria and deadline",
    });

    const page = fetchRes.results?.[0];
    if (!page || (!page.text && !page.title)) {
      return NextResponse.json(
        {
          success: false,
          error: "Could not fetch fresh content from the official source page",
        },
        { status: 502 }
      );
    }

    const parsed = parseExtractedScholarship({
      url: page.url,
      finalUrl: page.final_url,
      title: page.title,
      description: page.description,
      text: page.text,
    });

    if (!parsed) {
      return NextResponse.json(
        {
          success: false,
          error: "Extracted content was insufficient to parse a valid scholarship record",
        },
        { status: 422 }
      );
    }

    const updated = await prisma.scholarship.update({
      where: { id },
      data: {
        name: parsed.name,
        provider: parsed.provider || scholarship.provider,
        description: parsed.description || scholarship.description,
        applicationUrl: parsed.applicationUrl || scholarship.applicationUrl,
        awardAmount: parsed.awardAmount ?? scholarship.awardAmount,
        awardCurrency: parsed.awardCurrency || scholarship.awardCurrency,
        awardFrequency: parsed.awardFrequency || scholarship.awardFrequency,
        deadline: parsed.deadline || scholarship.deadline,
        deadlineRaw: parsed.deadlineRaw || scholarship.deadlineRaw,
        eligibleCountries: JSON.stringify(parsed.eligibleCountries),
        eligibleEducationLevels: JSON.stringify(parsed.eligibleEducationLevels),
        eligibleFields: JSON.stringify(parsed.eligibleFields),
        minimumScore: parsed.minimumScore ?? scholarship.minimumScore,
        gradingScale: parsed.gradingScale || scholarship.gradingScale,
        incomeLimit: parsed.incomeLimit ?? scholarship.incomeLimit,
        requiredDocuments: JSON.stringify(parsed.requiredDocuments),
        sourceExcerpt: parsed.sourceExcerpt || scholarship.sourceExcerpt,
        verificationStatus: parsed.verificationStatus,
        lastVerifiedAt: new Date(),
      },
    });

    const eligibility = evaluateEligibility(profile, updated);

    return NextResponse.json({
      success: true,
      message: "Refreshed live from official source page",
      scholarship: {
        ...updated,
        eligibleCountries: JSON.parse(updated.eligibleCountries || "[]"),
        eligibleEducationLevels: JSON.parse(updated.eligibleEducationLevels || "[]"),
        eligibleFields: JSON.parse(updated.eligibleFields || "[]"),
        requiredDocuments: JSON.parse(updated.requiredDocuments || "[]"),
        additionalRequirements: JSON.parse(updated.additionalRequirements || "[]"),
        eligibility,
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to refresh scholarship";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
