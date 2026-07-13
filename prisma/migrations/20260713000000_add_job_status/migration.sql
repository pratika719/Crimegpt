-- CreateTable
CREATE TABLE "JobStatus" (
    "id" TEXT NOT NULL,
    "queueName" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "userId" TEXT,
    "caseId" TEXT,
    "documentType" TEXT,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "JobStatus_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "JobStatus_caseId_documentType_idx" ON "JobStatus"("caseId", "documentType");

-- CreateIndex
CREATE INDEX "JobStatus_status_idx" ON "JobStatus"("status");

-- CreateIndex
CREATE INDEX "JobStatus_updatedAt_idx" ON "JobStatus"("updatedAt");
