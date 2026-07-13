import "dotenv/config";
import { 
  ingestionQueue, 
  embeddingQueue, 
  documentGenerationQueue, 
  aiGenerationQueue, 
  emailQueue, 
  cleanupQueue 
} from "@/lib/queue/queues";

async function checkQueue(queueName: string, queue: any) {
  const [waiting, active, completed, failed, delayed] = await Promise.all([
    queue.getJobs(["waiting"]),
    queue.getJobs(["active"]),
    queue.getJobs(["completed"]),
    queue.getJobs(["failed"]),
    queue.getJobs(["delayed"]),
  ]);

  console.log(`\n=== Queue: ${queueName} ===`);
  console.log(`Waiting:   ${waiting.length}`);
  console.log(`Active:    ${active.length}`);
  console.log(`Completed: ${completed.length}`);
  console.log(`Failed:    ${failed.length}`);
  console.log(`Delayed:   ${delayed.length}`);

  if (failed.length > 0) {
    console.log(`\n--- Failed Jobs in ${queueName} ---`);
    for (const job of failed.slice(0, 5)) {
      console.log(`Job ID: ${job.id}`);
      console.log(`Failed Reason: ${job.failedReason}`);
      console.log(`Stacktrace: ${job.stacktrace?.join("\n") || "No stacktrace"}`);
      console.log("-----------------------------------");
    }
  }
}

async function main() {
  await checkQueue("ingestion", ingestionQueue);
  await checkQueue("embedding", embeddingQueue);
  await checkQueue("document-generation", documentGenerationQueue);
  await checkQueue("ai-generation", aiGenerationQueue);
  await checkQueue("email", emailQueue);
  await checkQueue("cleanup", cleanupQueue);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Queue check failed:", error);
    process.exit(1);
  });

