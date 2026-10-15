import { prisma } from "../db";
import { TinyFishClient, TinyFishApiError } from "../tinyfish/client";
import { parseExtractedScholarship } from "../extraction/parser";
import { ExtractedScholarship } from "../extraction/schema";
import { evaluateEligibility } from "../eligibility/engine";
import { rankScholarships } from "../ranking/ranker";
import { DEMO_SCHOLARSHIPS } from "./demo-data";
import { validateSafeUrl } from "../security/url-safety";

export interface DiscoveryOptions {
  profileId?: string;
  country?: string;
  educationLevel?: string;
  fieldOfStudy?: string;
  degree?: string;
  fundingType?: "all" | "merit" | "need";
  customQuery?: string;
  isDemo?: boolean;
}

export interface DiscoveryRunResult {
  runId: string;
  status: "completed" | "partial_success" | "failed";
  queriesExecuted: string[];
  sourcesFound: number;
  recordsCreated: number;
  recordsUpdated: number;
  errorSummary?: string | null;
  scholarships: Array<any>;
}

export async function runScholarshipDiscovery(
  options: DiscoveryOptions = {}
): Promise<DiscoveryRunResult> {
  // 1. Fetch Student Profile if profileId provided or retrieve local/first profile
  let studentProfile = null;
  if (options.profileId) {
    studentProfile = await prisma.studentProfile.findUnique({
      where: { id: options.profileId },
    });
  } else {
    studentProfile = await prisma.studentProfile.findFirst({
      orderBy: { updatedAt: "desc" },
    });
  }

  const country = options.country || studentProfile?.country || "International";
  const educationLevel = options.educationLevel || studentProfile?.educationLevel || "undergraduate";
  const fieldOfStudy = options.fieldOfStudy || studentProfile?.fieldOfStudy || "Computer Science";

  // Check if Demo Mode is explicitly enabled or requested
  const isDemoMode =
    options.isDemo ||
    process.env.DEMO_MODE === "true" ||
    (!process.env.TINYFISH_API_KEY && !options.customQuery);

  if (isDemoMode) {
    return handleDemoDiscovery(studentProfile?.id, DEMO_SCHOLARSHIPS);
  }

  const client = new TinyFishClient();
  if (!client.isConfigured()) {
    throw new TinyFishApiError(
      "TINYFISH_API_KEY is not configured on the server. Please add your API key in .env or switch to Demo Mode.",
      401,
      "MISSING_API_KEY"
    );
  }

  // 2. Formulate focused queries
  const queries: string[] = [];
  if (options.customQuery && options.customQuery.trim().length > 0) {
    queries.push(options.customQuery.trim());
  } else {
    // Focused search queries matching student criteria
    queries.push(`Official government scholarships for ${educationLevel} students in ${country}`);
    queries.push(`University merit scholarships for ${fieldOfStudy} students ${country ? "in " + country : ""}`);
    if (options.fundingType === "need" || (studentProfile?.annualFamilyIncome && studentProfile.annualFamilyIncome > 0)) {
      queries.push(`Need-based scholarships grants for ${educationLevel} students in ${country}`);
    } else {
      queries.push(`Foundation grants and scholarships for ${educationLevel} students in ${fieldOfStudy}`);
    }
  }

  // Create DiscoveryRun in DB
  const discoveryRun = await prisma.discoveryRun.create({
    data: {
      profileId: studentProfile?.id || null,
      status: "running",
      queriesExecuted: JSON.stringify(queries),
      startedAt: new Date(),
    },
  });

  const discoveredUrls = new Set<string>();
  const searchErrors: string[] = [];

  // 3. Execute TinyFish Search for each query
  for (const query of queries) {
    try {
      const searchRes = await client.search({
        query,
        purpose: "Discover official scholarships, grants, and eligibility criteria for students",
        domain_type: "web",
      });

      if (searchRes.results && Array.isArray(searchRes.results)) {
        for (const item of searchRes.results) {
          if (item.url) {
            const check = validateSafeUrl(item.url);
            if (check.isSafe && check.normalizedUrl) {
              discoveredUrls.add(check.normalizedUrl);
            }
          }
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      searchErrors.push(`Query "${query}" failed: ${msg}`);
    }
  }

  // Prioritize official and university domains (.gov, .edu, .ac, .org)
  const candidateUrls = Array.from(discoveredUrls).sort((a, b) => {
    const aIsEduOrGov = /\.gov|\.edu|\.ac\.|\.org/i.test(a);
    const bIsEduOrGov = /\.gov|\.edu|\.ac\.|\.org/i.test(b);
    if (aIsEduOrGov && !bIsEduOrGov) return -1;
    if (!aIsEduOrGov && bIsEduOrGov) return 1;
    return 0;
  });

  // Limit candidate URLs to top 10 for batch fetch performance and rate limits
  const urlsToFetch = candidateUrls.slice(0, 10);

  if (urlsToFetch.length === 0) {
    const status = searchErrors.length > 0 ? "failed" : "completed";
    const errorSummary = searchErrors.length > 0 ? searchErrors.join("; ") : "No relevant scholarship URLs found for the criteria";

    await prisma.discoveryRun.update({
      where: { id: discoveryRun.id },
      data: {
        status,
        sourcesFound: 0,
        recordsCreated: 0,
        recordsUpdated: 0,
        errorSummary,
        completedAt: new Date(),
      },
    });

    return {
      runId: discoveryRun.id,
      status,
      queriesExecuted: queries,
      sourcesFound: 0,
      recordsCreated: 0,
      recordsUpdated: 0,
      errorSummary,
      scholarships: [],
    };
  }

  // 4. Fetch content using TinyFish Fetch
  let fetchResult = null;
  const fetchErrors: string[] = [...searchErrors];

  try {
    fetchResult = await client.fetch({
      urls: urlsToFetch,
      format: "markdown",
      purpose: "Extract scholarship name, award amount, eligibility criteria, and deadlines",
      per_url_timeout_ms: 30000,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    fetchErrors.push(`TinyFish Fetch error: ${msg}`);
  }

  const extractedList: ExtractedScholarship[] = [];

  if (fetchResult && fetchResult.results) {
    for (const page of fetchResult.results) {
      if (!page.text && !page.title) continue;

      const parsed = parseExtractedScholarship({
        url: page.url,
        finalUrl: page.final_url,
        title: page.title,
        description: page.description,
        text: page.text,
      });

      if (parsed) {
        extractedList.push(parsed);
      }
    }
  }

  if (fetchResult && fetchResult.errors) {
    for (const err of fetchResult.errors) {
      fetchErrors.push(`Fetch failed for ${err.url}: ${err.error}`);
    }
  }

  // 5. Deduplicate and Save to Database
  let recordsCreated = 0;
  let recordsUpdated = 0;
  const savedScholarshipIds: string[] = [];

  for (const record of extractedList) {
    try {
      const existing = await prisma.scholarship.findUnique({
        where: { sourceUrl: record.sourceUrl },
      });

      let scholarshipId: string;

      if (existing) {
        const updated = await prisma.scholarship.update({
          where: { id: existing.id },
          data: {
            name: record.name,
            provider: record.provider || existing.provider,
            description: record.description || existing.description,
            applicationUrl: record.applicationUrl || existing.applicationUrl,
            awardAmount: record.awardAmount ?? existing.awardAmount,
            awardCurrency: record.awardCurrency || existing.awardCurrency,
            awardFrequency: record.awardFrequency || existing.awardFrequency,
            deadline: record.deadline || existing.deadline,
            deadlineRaw: record.deadlineRaw || existing.deadlineRaw,
            eligibleCountries: JSON.stringify(record.eligibleCountries),
            eligibleEducationLevels: JSON.stringify(record.eligibleEducationLevels),
            eligibleFields: JSON.stringify(record.eligibleFields),
            minimumScore: record.minimumScore ?? existing.minimumScore,
            gradingScale: record.gradingScale || existing.gradingScale,
            incomeLimit: record.incomeLimit ?? existing.incomeLimit,
            requiredDocuments: JSON.stringify(record.requiredDocuments),
            sourceExcerpt: record.sourceExcerpt || existing.sourceExcerpt,
            verificationStatus: record.verificationStatus,
            lastVerifiedAt: new Date(),
          },
        });
        scholarshipId = updated.id;
        recordsUpdated++;
      } else {
        const created = await prisma.scholarship.create({
          data: {
            name: record.name,
            provider: record.provider,
            description: record.description,
            sourceUrl: record.sourceUrl,
            applicationUrl: record.applicationUrl,
            awardAmount: record.awardAmount,
            awardCurrency: record.awardCurrency,
            awardFrequency: record.awardFrequency,
            deadline: record.deadline,
            deadlineRaw: record.deadlineRaw,
            eligibleCountries: JSON.stringify(record.eligibleCountries),
            eligibleEducationLevels: JSON.stringify(record.eligibleEducationLevels),
            eligibleFields: JSON.stringify(record.eligibleFields),
            minimumScore: record.minimumScore,
            gradingScale: record.gradingScale,
            incomeLimit: record.incomeLimit,
            additionalRequirements: JSON.stringify(record.additionalRequirements),
            requiredDocuments: JSON.stringify(record.requiredDocuments),
            sourceExcerpt: record.sourceExcerpt,
            verificationStatus: record.verificationStatus,
            isDemo: false,
            lastVerifiedAt: new Date(),
          },
        });
        scholarshipId = created.id;
        recordsCreated++;
      }

      savedScholarshipIds.push(scholarshipId);

      // Populate document checklist items if student profile exists
      if (studentProfile && record.requiredDocuments && record.requiredDocuments.length > 0) {
        for (const docName of record.requiredDocuments) {
          await prisma.documentChecklistItem.upsert({
            where: {
              profileId_scholarshipId_documentName: {
                profileId: studentProfile.id,
                scholarshipId,
                documentName: docName,
              },
            },
            update: {},
            create: {
              profileId: studentProfile.id,
              scholarshipId,
              documentName: docName,
              isComplete: false,
            },
          });
        }
      }
    } catch (dbErr) {
      console.error("Database save error for scholarship:", record.sourceUrl, dbErr);
    }
  }

  // 6. Finalize DiscoveryRun
  let finalStatus: "completed" | "partial_success" | "failed" = "completed";
  if (recordsCreated === 0 && recordsUpdated === 0 && fetchErrors.length > 0) {
    finalStatus = "failed";
  } else if (fetchErrors.length > 0) {
    finalStatus = "partial_success";
  }

  const errorSummary = fetchErrors.length > 0 ? fetchErrors.join("; ") : null;

  await prisma.discoveryRun.update({
    where: { id: discoveryRun.id },
    data: {
      status: finalStatus,
      sourcesFound: candidateUrls.length,
      recordsCreated,
      recordsUpdated,
      errorSummary,
      completedAt: new Date(),
    },
  });

  // 7. Calculate Eligibility and Rank Results
  const rawList = await prisma.scholarship.findMany({
    where: {
      id: { in: savedScholarshipIds },
    },
  });

  const evaluated = rawList.map((sch) => {
    const eligibility = evaluateEligibility(studentProfile || {}, sch);
    return {
      ...sch,
      eligibleCountries: JSON.parse(sch.eligibleCountries || "[]"),
      eligibleEducationLevels: JSON.parse(sch.eligibleEducationLevels || "[]"),
      eligibleFields: JSON.parse(sch.eligibleFields || "[]"),
      requiredDocuments: JSON.parse(sch.requiredDocuments || "[]"),
      additionalRequirements: JSON.parse(sch.additionalRequirements || "[]"),
      eligibility,
    };
  });

  const ranked = rankScholarships(evaluated);

  return {
    runId: discoveryRun.id,
    status: finalStatus,
    queriesExecuted: queries,
    sourcesFound: candidateUrls.length,
    recordsCreated,
    recordsUpdated,
    errorSummary,
    scholarships: ranked,
  };
}

/**
 * Handles Demo Mode discovery: saves verified sample scholarships to DB and scores them
 */
async function handleDemoDiscovery(
  profileId: string | undefined,
  samples: ExtractedScholarship[]
): Promise<DiscoveryRunResult> {
  const studentProfile = profileId
    ? await prisma.studentProfile.findUnique({ where: { id: profileId } })
    : await prisma.studentProfile.findFirst({ orderBy: { updatedAt: "desc" } });

  const queries = [
    "[Demo] Verified global university & government funding opportunities",
    "[Demo] Top STEM & Computer Science scholarships",
  ];

  const discoveryRun = await prisma.discoveryRun.create({
    data: {
      profileId: studentProfile?.id || null,
      status: "completed",
      queriesExecuted: JSON.stringify(queries),
      sourcesFound: samples.length,
      startedAt: new Date(),
      completedAt: new Date(),
    },
  });

  let recordsCreated = 0;
  let recordsUpdated = 0;
  const savedIds: string[] = [];

  for (const sample of samples) {
    const existing = await prisma.scholarship.findUnique({
      where: { sourceUrl: sample.sourceUrl },
    });

    let sId: string;
    if (existing) {
      const up = await prisma.scholarship.update({
        where: { id: existing.id },
        data: {
          name: sample.name,
          provider: sample.provider,
          description: sample.description,
          applicationUrl: sample.applicationUrl,
          awardAmount: sample.awardAmount,
          awardCurrency: sample.awardCurrency,
          awardFrequency: sample.awardFrequency,
          deadline: sample.deadline,
          deadlineRaw: sample.deadlineRaw,
          eligibleCountries: JSON.stringify(sample.eligibleCountries),
          eligibleEducationLevels: JSON.stringify(sample.eligibleEducationLevels),
          eligibleFields: JSON.stringify(sample.eligibleFields),
          minimumScore: sample.minimumScore,
          gradingScale: sample.gradingScale,
          incomeLimit: sample.incomeLimit,
          requiredDocuments: JSON.stringify(sample.requiredDocuments),
          sourceExcerpt: sample.sourceExcerpt,
          verificationStatus: sample.verificationStatus,
          isDemo: true,
          lastVerifiedAt: new Date(),
        },
      });
      sId = up.id;
      recordsUpdated++;
    } else {
      const cr = await prisma.scholarship.create({
        data: {
          name: sample.name,
          provider: sample.provider,
          description: sample.description,
          sourceUrl: sample.sourceUrl,
          applicationUrl: sample.applicationUrl,
          awardAmount: sample.awardAmount,
          awardCurrency: sample.awardCurrency,
          awardFrequency: sample.awardFrequency,
          deadline: sample.deadline,
          deadlineRaw: sample.deadlineRaw,
          eligibleCountries: JSON.stringify(sample.eligibleCountries),
          eligibleEducationLevels: JSON.stringify(sample.eligibleEducationLevels),
          eligibleFields: JSON.stringify(sample.eligibleFields),
          minimumScore: sample.minimumScore,
          gradingScale: sample.gradingScale,
          incomeLimit: sample.incomeLimit,
          additionalRequirements: JSON.stringify(sample.additionalRequirements),
          requiredDocuments: JSON.stringify(sample.requiredDocuments),
          sourceExcerpt: sample.sourceExcerpt,
          verificationStatus: sample.verificationStatus,
          isDemo: true,
          lastVerifiedAt: new Date(),
        },
      });
      sId = cr.id;
      recordsCreated++;
    }

    savedIds.push(sId);

    if (studentProfile && sample.requiredDocuments && sample.requiredDocuments.length > 0) {
      for (const doc of sample.requiredDocuments) {
        await prisma.documentChecklistItem.upsert({
          where: {
            profileId_scholarshipId_documentName: {
              profileId: studentProfile.id,
              scholarshipId: sId,
              documentName: doc,
            },
          },
          update: {},
          create: {
            profileId: studentProfile.id,
            scholarshipId: sId,
            documentName: doc,
            isComplete: false,
          },
        });
      }
    }
  }

  await prisma.discoveryRun.update({
    where: { id: discoveryRun.id },
    data: {
      recordsCreated,
      recordsUpdated,
      completedAt: new Date(),
    },
  });

  const rawList = await prisma.scholarship.findMany({
    where: { id: { in: savedIds } },
  });

  const evaluated = rawList.map((sch) => {
    const eligibility = evaluateEligibility(studentProfile || {}, sch);
    return {
      ...sch,
      eligibleCountries: JSON.parse(sch.eligibleCountries || "[]"),
      eligibleEducationLevels: JSON.parse(sch.eligibleEducationLevels || "[]"),
      eligibleFields: JSON.parse(sch.eligibleFields || "[]"),
      requiredDocuments: JSON.parse(sch.requiredDocuments || "[]"),
      additionalRequirements: JSON.parse(sch.additionalRequirements || "[]"),
      eligibility,
    };
  });

  const ranked = rankScholarships(evaluated);

  return {
    runId: discoveryRun.id,
    status: "completed",
    queriesExecuted: queries,
    sourcesFound: samples.length,
    recordsCreated,
    recordsUpdated,
    errorSummary: null,
    scholarships: ranked,
  };
}
