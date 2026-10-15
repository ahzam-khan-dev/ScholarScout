import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { z } from "zod";

const PatchItemSchema = z.object({
  isComplete: z.boolean(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ itemId: string }> }
) {
  try {
    const { itemId } = await params;
    const body = await req.json();
    const validated = PatchItemSchema.parse(body);

    const updated = await prisma.documentChecklistItem.update({
      where: { id: itemId },
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
