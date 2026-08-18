import dotenv from "dotenv";
dotenv.config();

import { prisma } from "../lib/prisma";

async function main() {
  console.log("🧹 Running Database Stale Job Cleanup Script...");

  const STALE_THRESHOLD_MS = 10 * 60 * 1000; // 10 minutes
  const cutoff = new Date(Date.now() - STALE_THRESHOLD_MS);

  try {
    const countBefore = await prisma.jobStatus.count({
      where: {
        status: { in: ["pending", "active"] },
        updatedAt: { lt: cutoff },
      },
    });

    console.log(`🔍 Found ${countBefore} stale jobs in pending/active status older than ${cutoff.toISOString()}`);

    if (countBefore > 0) {
      const result = await prisma.jobStatus.updateMany({
        where: {
          status: { in: ["pending", "active"] },
          updatedAt: { lt: cutoff },
        },
        data: {
          status: "failed",
          errorMessage: "Document generation timed out — background worker was offline or abandoned the job.",
          errorCode: "JOB_TIMEOUT",
          failureType: "transient",
        },
      });

      console.log(`✅ Successfully updated ${result.count} stale jobs to 'failed' status!`);
    } else {
      console.log("✨ No stale jobs found to clean up.");
    }

    process.exit(0);
  } catch (error) {
    console.error("❌ Cleanup script failed:", error);
    process.exit(1);
  }
}

main();
