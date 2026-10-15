import { NextRequest, NextResponse } from "next/server";
import { getOrCreateDefaultProfile, updateProfile } from "@/lib/profile-service";
import { StudentProfileSchema } from "@/lib/extraction/schema";

export async function GET() {
  try {
    const profile = await getOrCreateDefaultProfile();
    return NextResponse.json({ success: true, profile });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to load profile";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const profile = await getOrCreateDefaultProfile();

    const validated = StudentProfileSchema.parse(body);
    const updated = await updateProfile(profile.id, validated);

    return NextResponse.json({ success: true, profile: updated });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to update profile";
    return NextResponse.json({ success: false, error: msg }, { status: 400 });
  }
}
