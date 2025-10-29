/**
 * Backfill script to migrate existing jobs and resumes into skill instances
 * 
 * This script:
 * 1. Iterates through all existing jobs and resumes
 * 2. Extracts skills from their job_card/resume_card JSON
 * 3. Normalizes skills using the normalization service
 * 4. Populates the skill_instances table
 * 
 * Usage: tsx server/skills/backfill.ts
 */

import { storage } from "../storage";
import { normalizeJobSkills, normalizeResumeSkills } from "./normalization";
import type { Job, Resume, JobCard, ResumeCard } from "@shared/schema";

async function backfillJobs() {
  console.log("🔍 Fetching all jobs...");
  
  // Get all jobs without pagination
  let page = 1;
  const limit = 50;
  let allJobs: Job[] = [];
  let hasMore = true;

  while (hasMore) {
    const jobs = await storage.getAllJobs({ page, limit });
    allJobs.push(...jobs);
    hasMore = jobs.length === limit;
    page++;
  }

  console.log(`✓ Found ${allJobs.length} jobs to process`);

  let processed = 0;
  let skipped = 0;
  let errors = 0;

  for (const job of allJobs) {
    try {
      // Skip if no job card
      if (!job.jobCard) {
        console.log(`⊘ Skipping job ${job.id} (no job card)`);
        skipped++;
        continue;
      }

      // Check if already has skill instances
      const existing = await storage.getSkillInstancesForEntity('job', job.id);
      if (existing.length > 0) {
        console.log(`⊘ Skipping job ${job.id} (already has ${existing.length} skills)`);
        skipped++;
        continue;
      }

      console.log(`⚙ Processing job ${job.id}...`);
      const skillInstances = await normalizeJobSkills(job.id, job.jobCard as JobCard);
      console.log(`✓ Created ${skillInstances.length} skill instances for job ${job.id}`);
      processed++;
    } catch (error) {
      console.error(`✗ Error processing job ${job.id}:`, error);
      errors++;
    }
  }

  console.log("\n📊 Job backfill summary:");
  console.log(`  - Processed: ${processed}`);
  console.log(`  - Skipped: ${skipped}`);
  console.log(`  - Errors: ${errors}`);
  console.log(`  - Total: ${allJobs.length}`);
}

async function backfillResumes() {
  console.log("\n🔍 Fetching all resumes...");
  
  // Get all resumes without pagination
  let page = 1;
  const limit = 50;
  let allResumes: Resume[] = [];
  let hasMore = true;

  while (hasMore) {
    const resumes = await storage.getAllResumes({ page, limit });
    allResumes.push(...resumes);
    hasMore = resumes.length === limit;
    page++;
  }

  console.log(`✓ Found ${allResumes.length} resumes to process`);

  let processed = 0;
  let skipped = 0;
  let errors = 0;

  for (const resume of allResumes) {
    try {
      // Skip if no resume card
      if (!resume.resumeCard) {
        console.log(`⊘ Skipping resume ${resume.id} (no resume card)`);
        skipped++;
        continue;
      }

      // Check if already has skill instances
      const existing = await storage.getSkillInstancesForEntity('profile', resume.id);
      if (existing.length > 0) {
        console.log(`⊘ Skipping resume ${resume.id} (already has ${existing.length} skills)`);
        skipped++;
        continue;
      }

      console.log(`⚙ Processing resume ${resume.id}...`);
      const skillInstances = await normalizeResumeSkills(resume.id, resume.resumeCard as ResumeCard);
      console.log(`✓ Created ${skillInstances.length} skill instances for resume ${resume.id}`);
      processed++;
    } catch (error) {
      console.error(`✗ Error processing resume ${resume.id}:`, error);
      errors++;
    }
  }

  console.log("\n📊 Resume backfill summary:");
  console.log(`  - Processed: ${processed}`);
  console.log(`  - Skipped: ${skipped}`);
  console.log(`  - Errors: ${errors}`);
  console.log(`  - Total: ${allResumes.length}`);
}

async function main() {
  console.log("🚀 Starting skills backfill process...\n");
  
  try {
    await backfillJobs();
    await backfillResumes();
    
    console.log("\n✅ Backfill complete!");
  } catch (error) {
    console.error("\n❌ Backfill failed:", error);
    process.exit(1);
  }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().then(() => process.exit(0));
}

export { backfillJobs, backfillResumes };
