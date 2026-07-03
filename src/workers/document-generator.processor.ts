import type { Job } from "bullmq";
import type { DocumentGenerationJobPayload } from "@/lib/queue/job-types";
import { Progress } from "@base-ui/react";

export async function processDocumentGenerationJob(
  job: Job<DocumentGenerationJobPayload>
): Promise<{requestId: string, status: "ACKNOWLEDGED"}> {
    await job.updateProgress({
        status:"ACKNOWLEDGED",
        progress:10,
        message:"document generation job recieved by worker",

    });

    return {
        requestId:job.data.requestId,
        status:"ACKNOWLEDGED"
    };
    
  
  
}