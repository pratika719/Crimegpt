import "dotenv/config";
import { prisma } from "@/lib/prisma";

async function main() {
  const jobs = await prisma.jobStatus.findMany();
  console.log(`\n=== Found ${jobs.length} JobStatus records in DB ===`);
  for (const job of jobs) {
    console.log(`Job ID: ${job.id}`);
    console.log(`Queue: ${job.queueName}`);
    console.log(`Status: ${job.status}`);
    console.log(`Case ID: ${job.caseId}`);
    console.log(`Doc Type: ${job.documentType}`);
    console.log(`Error: ${job.errorMessage}`);
    console.log(`Updated At: ${job.updatedAt}`);
    console.log("-----------------------------------");
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
