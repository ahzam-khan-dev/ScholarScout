import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getOrCreateDefaultProfile } from "@/lib/profile-service";

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

    const saved = await prisma.savedScholarship.upsert({
      where: {
        profileId_scholarshipId: {
          profileId: profile.id,
          scholarshipId: id,
        },
      },
      update: {},
      create: {
        profileId: profile.id,
        scholarshipId: id,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Scholarship saved successfully",
      saved,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to save scholarship";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const profile = await getOrCreateDefaultProfile();

    await prisma.savedScholarship.deleteMany({
      where: {
        profileId: profile.id,
        scholarshipId: id,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Scholarship removed from saved list",
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to remove scholarship";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
