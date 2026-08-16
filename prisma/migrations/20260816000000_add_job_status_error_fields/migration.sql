-- AlterTable
ALTER TABLE "JobStatus" ADD COLUMN "errorCode" TEXT,
ADD COLUMN "failureType" TEXT;

-- CreateIndex
CREATE INDEX "JobStatus_caseId_status_idx" ON "JobStatus"("caseId", "status");
