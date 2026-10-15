import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getOrCreateDefaultProfile } from "@/lib/profile-service";
import { z } from "zod";

const PatchItemSchema = z.object({
  itemId: z.string().optional(),
  isComplete: z.boolean(),
});

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ scholarshipId: string }> }
) {
  try {
    const { scholarshipId } = await params;
    const profile = await getOrCreateDefaultProfile();

    const scholarship = await prisma.scholarship.findUnique({
      where: { id: scholarshipId },
    });

    if (!scholarship) {
      return NextResponse.json(
        { success: false, error: "Scholarship not found" },
        { status: 404 }
      );
    }

    // Ensure documents from scholarship exist in checklist
    const docs = JSON.parse(scholarship.requiredDocuments || "[]") as string[];
    for (const doc of docs) {
      await prisma.documentChecklistItem.upsert({
        where: {
          profileId_scholarshipId_documentName: {
            profileId: profile.id,
            scholarshipId,
            documentName: doc,
          },
        },
        update: {},
        create: {
          profileId: profile.id,
          scholarshipId,
          documentName: doc,
          isComplete: false,
        },
      });
    }

    const items = await prisma.documentChecklistItem.findMany({
      where: {
        profileId: profile.id,
        scholarshipId,
      },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json({
      success: true,
      scholarshipName: scholarship.name,
      items,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to load checklist";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ scholarshipId: string }> }
) {
  try {
    const { scholarshipId } = await params;
    const body = await req.json();
    const validated = PatchItemSchema.parse(body);

    const targetItemId = validated.itemId || scholarshipId; // supports either param or body

    const updated = await prisma.documentChecklistItem.update({
      where: { id: targetItemId },
      data: { isComplete: validated.isComplete },
    });

    return NextResponse.json({
      success: true,
      item: updated,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to update checklist item";
    return NextResponse.json({ success: false, error: msg }, { status: 400 });
  }
}
