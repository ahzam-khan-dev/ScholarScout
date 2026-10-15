import { prisma } from "./db";
import { StudentProfileInput, StudentProfileSchema } from "./extraction/schema";

export async function getOrCreateDefaultProfile() {
  let profile = await prisma.studentProfile.findFirst({
    orderBy: { updatedAt: "desc" },
  });

  if (!profile) {
    profile = await prisma.studentProfile.create({
      data: {
        name: "Alex Rivera",
        country: "United States",
        region: "California",
        educationLevel: "undergraduate",
        degree: "Bachelor of Science",
        fieldOfStudy: "Computer Science",
        yearOfStudy: 3,
        institution: "State University",
        academicScore: 3.8,
        gradingScale: "gpa_4_0",
        annualFamilyIncome: 55000,
        incomeCurrency: "USD",
        residencyStatus: "citizen",
      },
    });
  }

  return profile;
}

export async function updateProfile(id: string, data: StudentProfileInput) {
  const validated = StudentProfileSchema.parse(data);

  return prisma.studentProfile.update({
    where: { id },
    data: {
      name: validated.name,
      country: validated.country,
      region: validated.region,
      educationLevel: validated.educationLevel,
      degree: validated.degree,
      fieldOfStudy: validated.fieldOfStudy,
      yearOfStudy: validated.yearOfStudy,
      institution: validated.institution,
      academicScore: validated.academicScore,
      gradingScale: validated.gradingScale,
      annualFamilyIncome: validated.annualFamilyIncome,
      incomeCurrency: validated.incomeCurrency,
      residencyStatus: validated.residencyStatus,
    },
  });
}
