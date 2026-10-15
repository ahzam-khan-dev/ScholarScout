import { NextRequest, NextResponse } from "next/server";
import { runScholarshipDiscovery } from "@/lib/discovery/workflow";
import { getOrCreateDefaultProfile } from "@/lib/profile-service";
import { z } from "zod";

const DiscoverRequestSchema = z.object({
  country: z.string().optional(),
  educationLevel: z.string().optional(),
  fieldOfStudy: z.string().optional(),
  degree: z.string().optional(),
  fundingType: z.enum(["all", "merit", "need"]).optional(),
  customQuery: z.string().optional(),
  isDemo: z.boolean().optional(),
});

export async function POST(req: NextRequest) {
  try {
    let body = {};
    try {
      body = await req.json();
    } catch {
      // empty body allowed
    }

    const validated = DiscoverRequestSchema.parse(body);
    const profile = await getOrCreateDefaultProfile();

    const result = await runScholarshipDiscovery({
      profileId: profile.id,
      country: validated.country,
      educationLevel: validated.educationLevel,
      fieldOfStudy: validated.fieldOfStudy,
      degree: validated.degree,
      fundingType: validated.fundingType,
      customQuery: validated.customQuery,
      isDemo: validated.isDemo,
    });

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Discovery operation failed";
    const status = (err as { status?: number }).status || 500;
    return NextResponse.json(
      {
        success: false,
        error: msg,
      },
      { status }
    );
  }
}
