/**
 * Manual Live Integration Script for TinyFish API
 * Executes one real Search -> Fetch workflow using the configured TINYFISH_API_KEY
 * Run via: npx tsx scripts/test-live-tinyfish.ts
 */

import { TinyFishClient } from "../src/lib/tinyfish/client";
import { parseExtractedScholarship } from "../src/lib/extraction/parser";

async function runLiveIntegrationTest() {
  console.log("====================================================");
  console.log("ScholarScout — Live TinyFish Integration Test");
  console.log("====================================================");

  const apiKey = process.env.TINYFISH_API_KEY;
  if (!apiKey) {
    console.error("❌ ERROR: TINYFISH_API_KEY is not set in the environment.");
    console.error("Please export TINYFISH_API_KEY='your_key' or configure it in .env before running this test.");
    process.exit(1);
  }

  const client = new TinyFishClient({ apiKey });

  console.log("Step 1: Testing TinyFish Search API...");
  const query = "Official university scholarships for computer science undergraduate students";
  console.log(`Query: "${query}"`);

  try {
    const searchRes = await client.search({
      query,
      purpose: "Find official university and government scholarships for students",
      domain_type: "web",
    });

    console.log(`✓ Search succeeded! Found ${searchRes.results?.length || 0} candidate results.`);

    if (!searchRes.results || searchRes.results.length === 0) {
      console.warn("⚠️ No results returned from search.");
      return;
    }

    const firstResult = searchRes.results[0];
    console.log(`First result: "${firstResult.title}" (${firstResult.url})`);

    console.log("\nStep 2: Testing TinyFish Fetch API...");
    console.log(`Fetching URL: ${firstResult.url}`);

    const fetchRes = await client.fetch({
      urls: [firstResult.url],
      format: "markdown",
      purpose: "Extract scholarship requirements and deadlines",
      per_url_timeout_ms: 30000,
    });

    console.log(`✓ Fetch returned ${fetchRes.results?.length || 0} pages and ${fetchRes.errors?.length || 0} errors.`);

    if (fetchRes.results && fetchRes.results.length > 0) {
      const page = fetchRes.results[0];
      console.log(`Extracted title: ${page.title}`);
      console.log(`Content length: ${page.text?.length || 0} characters`);

      console.log("\nStep 3: Parsing into ScholarScout Schema...");
      const parsed = parseExtractedScholarship({
        url: page.url,
        finalUrl: page.final_url,
        title: page.title,
        description: page.description,
        text: page.text,
      });

      if (parsed) {
        console.log("✓ Successfully parsed and validated scholarship record!");
        console.log(`  Name: ${parsed.name}`);
        console.log(`  Provider: ${parsed.provider || "Not specified"}`);
        console.log(`  Award: ${parsed.awardCurrency || "$"}${parsed.awardAmount || "Not specified"}`);
        console.log(`  Education Levels: ${parsed.eligibleEducationLevels.join(", ") || "Open"}`);
        console.log(`  Fields: ${parsed.eligibleFields.join(", ") || "Open"}`);
        console.log(`  Required Documents: ${parsed.requiredDocuments.join(", ") || "None explicitly listed"}`);
      } else {
        console.log("⚠️ Page content did not match minimum scholarship criteria threshold.");
      }
    }

    console.log("\n====================================================");
    console.log("✓ Live TinyFish Search and Fetch integration test PASSED!");
    console.log("====================================================");
  } catch (err: any) {
    console.error("❌ Live test failed:", err.message);
    if (err.details) {
      console.error("Details:", JSON.stringify(err.details, null, 2));
    }
    process.exit(1);
  }
}

runLiveIntegrationTest();
