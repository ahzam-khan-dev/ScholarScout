import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "../lib/db";
import { runScholarshipDiscovery } from "../lib/discovery/workflow";

describe("Database Deduplication, Checklists, and Saved Opportunities", () => {
  let testProfileId: string;

  beforeAll(async () => {
    // Clean up previous test runs if needed and create a clean test profile
    const profile = await prisma.studentProfile.create({
      data: {
        name: "Test Runner",
        country: "United States",
        educationLevel: "undergraduate",
        fieldOfStudy: "Computer Science",
        academicScore: 3.8,
        gradingScale: "gpa_4_0",
      },
    });
    testProfileId = profile.id;
  });

  afterAll(async () => {
    // Clean up test profile and related items
    if (testProfileId) {
      await prisma.documentChecklistItem.deleteMany({ where: { profileId: testProfileId } });
      await prisma.savedScholarship.deleteMany({ where: { profileId: testProfileId } });
      await prisma.discoveryRun.deleteMany({ where: { profileId: testProfileId } });
      await prisma.studentProfile.delete({ where: { id: testProfileId } });
    }
  });

  it("enforces uniqueness for saved scholarships per profile", async () => {
    // Create test scholarship
    const scholarship = await prisma.scholarship.create({
      data: {
        name: "Uniqueness Test Scholarship",
        sourceUrl: "https://example.org/test-uniqueness-" + Date.now(),
        eligibleCountries: "[]",
        eligibleEducationLevels: "[]",
        eligibleFields: "[]",
      },
    });

    // First save
    const firstSave = await prisma.savedScholarship.create({
      data: {
        profileId: testProfileId,
        scholarshipId: scholarship.id,
      },
    });
    expect(firstSave.id).toBeDefined();

    // Second save should fail unique constraint
    await expect(
      prisma.savedScholarship.create({
        data: {
          profileId: testProfileId,
          scholarshipId: scholarship.id,
        },
      })
    ).rejects.toThrow();

    // Clean up
    await prisma.savedScholarship.deleteMany({ where: { scholarshipId: scholarship.id } });
    await prisma.scholarship.delete({ where: { id: scholarship.id } });
  });

  it("updates existing scholarship instead of duplicating when sourceUrl matches", async () => {
    const testUrl = "https://example.org/dedup-test-" + Date.now();

    // Create initial
    const initial = await prisma.scholarship.create({
      data: {
        name: "Initial Name",
        sourceUrl: testUrl,
        awardAmount: 5000,
        eligibleCountries: "[]",
        eligibleEducationLevels: "[]",
        eligibleFields: "[]",
      },
    });

    expect(initial.name).toBe("Initial Name");

    // Upsert / update logic simulation
    const updated = await prisma.scholarship.upsert({
      where: { sourceUrl: testUrl },
      update: {
        name: "Updated Name From Fresh Discovery",
        awardAmount: 6000,
      },
      create: {
        name: "Updated Name From Fresh Discovery",
        sourceUrl: testUrl,
        awardAmount: 6000,
      },
    });

    expect(updated.id).toBe(initial.id);
    expect(updated.name).toBe("Updated Name From Fresh Discovery");
    expect(updated.awardAmount).toBe(6000);

    // Verify only 1 record exists with this URL
    const count = await prisma.scholarship.count({ where: { sourceUrl: testUrl } });
    expect(count).toBe(1);

    // Clean up
    await prisma.scholarship.delete({ where: { id: initial.id } });
  });

  it("persists and updates document checklist item completion status", async () => {
    const sch = await prisma.scholarship.create({
      data: {
        name: "Checklist Test Award",
        sourceUrl: "https://example.org/checklist-test-" + Date.now(),
        requiredDocuments: JSON.stringify(["Transcript", "Letter of Recommendation"]),
      },
    });

    // Create checklist item
    const item = await prisma.documentChecklistItem.create({
      data: {
        profileId: testProfileId,
        scholarshipId: sch.id,
        documentName: "Transcript",
        isComplete: false,
      },
    });

    expect(item.isComplete).toBe(false);

    // Toggle complete
    const toggled = await prisma.documentChecklistItem.update({
      where: { id: item.id },
      data: { isComplete: true },
    });

    expect(toggled.isComplete).toBe(true);

    // Clean up
    await prisma.documentChecklistItem.deleteMany({ where: { scholarshipId: sch.id } });
    await prisma.scholarship.delete({ where: { id: sch.id } });
  });

  it("runs demo discovery workflow, saves records and logs DiscoveryRun", async () => {
    const result = await runScholarshipDiscovery({
      profileId: testProfileId,
      isDemo: true,
    });

    expect(result.status).toBe("completed");
    expect(result.scholarships.length).toBeGreaterThan(0);
    expect(result.sourcesFound).toBeGreaterThan(0);

    // Check that DiscoveryRun was created in DB
    const runInDb = await prisma.discoveryRun.findUnique({
      where: { id: result.runId },
    });

    expect(runInDb).not.toBeNull();
    expect(runInDb?.status).toBe("completed");
    expect((runInDb?.recordsCreated ?? 0) + (runInDb?.recordsUpdated ?? 0)).toBeGreaterThan(0);
  });
});
