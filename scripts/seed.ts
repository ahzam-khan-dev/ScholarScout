import { prisma } from "../src/lib/db";
import { getOrCreateDefaultProfile } from "../src/lib/profile-service";
import { runScholarshipDiscovery } from "../src/lib/discovery/workflow";

async function seed() {
  console.log("Seeding ScholarScout database with initial student profile and authentic scholarships...");

  const profile = await getOrCreateDefaultProfile();
  console.log(`✓ Student Profile ready: ${profile.name} (${profile.educationLevel}, ${profile.fieldOfStudy})`);

  const result = await runScholarshipDiscovery({
    profileId: profile.id,
    isDemo: true,
  });

  console.log(`✓ Initialized ${result.scholarships.length} verified scholarship opportunities.`);

  // Save the first 2 opportunities for the profile to demonstrate saved scholarships and checklists
  if (result.scholarships.length >= 2) {
    for (let i = 0; i < 2; i++) {
      const sch = result.scholarships[i];
      await prisma.savedScholarship.upsert({
        where: {
          profileId_scholarshipId: {
            profileId: profile.id,
            scholarshipId: sch.id,
          },
        },
        update: {},
        create: {
          profileId: profile.id,
          scholarshipId: sch.id,
        },
      });

      // Mark the first checklist item as completed
      const firstChecklist = await prisma.documentChecklistItem.findFirst({
        where: { profileId: profile.id, scholarshipId: sch.id },
      });
      if (firstChecklist) {
        await prisma.documentChecklistItem.update({
          where: { id: firstChecklist.id },
          data: { isComplete: true },
        });
      }
    }
    console.log("✓ Bookmarked sample scholarships and completed sample checklist items.");
  }

  console.log("Database seed completed successfully!");
}

seed()
  .catch((e) => {
    console.error("Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
