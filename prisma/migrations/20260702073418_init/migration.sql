-- CreateEnum
CREATE TYPE "CaseStatus" AS ENUM ('OPEN', 'UNDER_INVESTIGATION', 'CLOSED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "DocumentType" AS ENUM ('FIR', 'INVESTIGATION_SUMMARY', 'CHARGE_SHEET', 'LEGAL_ANALYSIS', 'AI_DIAGNOSTICS', 'REMAND_REQUEST', 'CASE_DIARY');

-- CreateEnum
CREATE TYPE "GeneratedDocumentStatus" AS ENUM ('DRAFT', 'GENERATING', 'COMPLETED', 'FAILED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "MessageRole" AS ENUM ('USER', 'ASSISTANT');

-- CreateEnum
CREATE TYPE "AIRequestStatus" AS ENUM ('PENDING', 'RUNNING', 'SUCCEEDED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "EvidenceProcessingStatus" AS ENUM ('NOT_STARTED', 'PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "AIRequestType" AS ENUM ('LEGAL_ANALYSIS', 'FIR_GENERATION', 'INVESTIGATION_SUMMARY', 'CHARGE_SHEET', 'CHAT', 'AI_DIAGNOSTICS_GENERATION', 'REMAND_REQUEST_GENERATION', 'CASE_DIARY_GENERATION');

-- CreateEnum
CREATE TYPE "ActivityType" AS ENUM ('CASE_CREATED', 'CASE_UPDATED', 'METADATA_CREATED', 'METADATA_UPDATED', 'LEGAL_ANALYSIS_GENERATED', 'FIR_GENERATED', 'INVESTIGATION_SUMMARY_GENERATED', 'CHARGE_SHEET_GENERATED', 'REMAND_REQUEST_GENERATED', 'CASE_DIARY_GENERATED', 'DOCUMENT_DOWNLOADED', 'DOCUMENT_REGENERATED', 'AI_DIAGNOSTICS_GENERATED', 'DOCUMENT_CREATED', 'PERSON_ADDED', 'PERSON_UPDATED', 'PERSON_DELETED', 'EVIDENCE_ADDED', 'EVIDENCE_UPDATED', 'EVIDENCE_DELETED', 'CHECKLIST_ITEM_COMPLETED', 'INVESTIGATION_PROFILE_UPDATED', 'VICTIM_ADDED', 'VICTIM_UPDATED', 'VICTIM_DELETED', 'ACCUSED_ADDED', 'ACCUSED_UPDATED', 'ACCUSED_DELETED', 'WITNESS_ADDED', 'WITNESS_UPDATED', 'WITNESS_DELETED', 'VEHICLE_ADDED', 'VEHICLE_UPDATED', 'VEHICLE_DELETED', 'SEIZED_ITEM_ADDED', 'SEIZED_ITEM_UPDATED', 'SEIZED_ITEM_DELETED', 'MEDICAL_INFO_ADDED', 'MEDICAL_INFO_UPDATED', 'MEDICAL_INFO_DELETED', 'COURT_INFO_ADDED', 'COURT_INFO_UPDATED', 'COURT_INFO_DELETED', 'DOCUMENT_RENAMED', 'DOCUMENT_DELETED_SINGLE', 'CHECKLIST_ITEM_RENAMED', 'CHECKLIST_ITEM_DELETED');

-- CreateEnum
CREATE TYPE "PersonRole" AS ENUM ('VICTIM', 'SUSPECT', 'WITNESS', 'OFFICER');

-- CreateEnum
CREATE TYPE "EvidenceType" AS ENUM ('DOCUMENT', 'IMAGE', 'VIDEO', 'AUDIO', 'SCREENSHOT', 'LOG_FILE', 'OTHER');

-- CreateTable
CREATE TABLE "Case" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "narrative" TEXT NOT NULL,
    "status" "CaseStatus" NOT NULL DEFAULT 'OPEN',
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "archivedAt" TIMESTAMP(3),

    CONSTRAINT "Case_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GeneratedDocument" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "type" "DocumentType" NOT NULL,
    "title" TEXT NOT NULL,
    "content" JSONB NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "status" "GeneratedDocumentStatus" NOT NULL DEFAULT 'COMPLETED',
    "errorMessage" TEXT,
    "sourceSnapshot" JSONB,
    "generatedBy" TEXT,
    "generatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GeneratedDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChatSession" (
    "id" TEXT NOT NULL,
    "title" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "caseId" TEXT NOT NULL,

    CONSTRAINT "ChatSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChatMessage" (
    "id" TEXT NOT NULL,
    "role" "MessageRole" NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sessionId" TEXT NOT NULL,

    CONSTRAINT "ChatMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LegalChunk" (
    "id" TEXT NOT NULL,
    "lawName" TEXT NOT NULL,
    "sectionCode" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "source" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LegalChunk_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AIRequestLog" (
    "id" TEXT NOT NULL,
    "caseId" TEXT,
    "userId" TEXT NOT NULL,
    "requestType" "AIRequestType" NOT NULL,
    "status" "AIRequestStatus" NOT NULL DEFAULT 'SUCCEEDED',
    "prompt" TEXT,
    "retrievedContext" TEXT,
    "response" TEXT,
    "modelUsed" TEXT,
    "tokenUsage" JSONB,
    "latencyMs" INTEGER,
    "errorCode" TEXT,
    "errorMessage" TEXT,
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "queueJobId" TEXT,
    "inputHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "AIRequestLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CaseMetadata" (
    "id" TEXT NOT NULL,
    "incidentDate" TIMESTAMP(3),
    "incidentTime" TEXT,
    "incidentLocation" TEXT,
    "victimName" TEXT,
    "victimStatement" TEXT,
    "suspectName" TEXT,
    "suspectDescription" TEXT,
    "witnessInformation" TEXT,
    "evidenceSummary" TEXT,
    "officerNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "caseId" TEXT NOT NULL,

    CONSTRAINT "CaseMetadata_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Person" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "PersonRole" NOT NULL,
    "phone" TEXT,
    "address" TEXT,
    "statement" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "caseId" TEXT NOT NULL,

    CONSTRAINT "Person_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CaseActivity" (
    "id" TEXT NOT NULL,
    "activityType" "ActivityType" NOT NULL,
    "description" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "caseId" TEXT NOT NULL,

    CONSTRAINT "CaseActivity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Evidence" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "type" "EvidenceType" NOT NULL,
    "notes" TEXT,
    "fileUrl" TEXT,
    "mimeType" TEXT,
    "fileSizeBytes" INTEGER,
    "hashSha256" TEXT,
    "extractedText" TEXT,
    "processingStatus" "EvidenceProcessingStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "processingError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Evidence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChecklistItem" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "caseId" TEXT NOT NULL,

    CONSTRAINT "ChecklistItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InvestigationProfile" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "firNumber" TEXT,
    "policeStation" TEXT,
    "investigatingOfficer" TEXT,
    "dateOfRegistration" TIMESTAMP(3),
    "incidentDateTime" TIMESTAMP(3),
    "incidentLocation" TEXT,
    "incidentDescription" TEXT,
    "investigationNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InvestigationProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Victim" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "injuryDetails" TEXT,
    "status" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Victim_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Accused" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "arrestStatus" TEXT,
    "bailDetails" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Accused_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Witness" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "statementDate" TIMESTAMP(3),
    "credibilityScore" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Witness_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Vehicle" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "make" TEXT,
    "model" TEXT,
    "year" INTEGER,
    "color" TEXT,
    "licensePlate" TEXT,
    "registrationState" TEXT,
    "ownerName" TEXT,
    "seizureStatus" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Vehicle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SeizedItem" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "itemName" TEXT NOT NULL,
    "description" TEXT,
    "serialNumber" TEXT,
    "seizureLocation" TEXT,
    "seizureDate" TIMESTAMP(3),
    "officerInCharge" TEXT,
    "storageLocation" TEXT,
    "status" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SeizedItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MedicalInformation" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "hospitalName" TEXT,
    "doctorName" TEXT,
    "admissionDate" TIMESTAMP(3),
    "injuryType" TEXT,
    "medicalReportNo" TEXT,
    "treatmentDetails" TEXT,
    "severity" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MedicalInformation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CourtInformation" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "courtName" TEXT,
    "judgeName" TEXT,
    "caseNumber" TEXT,
    "nextHearingDate" TIMESTAMP(3),
    "chargesheetFiledDate" TIMESTAMP(3),
    "currentStatus" TEXT,
    "judgementDetails" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CourtInformation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT,
    "emailVerified" TIMESTAMP(3),
    "image" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VerificationToken" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);

-- CreateIndex
CREATE INDEX "Case_userId_idx" ON "Case"("userId");

-- CreateIndex
CREATE INDEX "Case_status_idx" ON "Case"("status");

-- CreateIndex
CREATE INDEX "Case_createdAt_idx" ON "Case"("createdAt");

-- CreateIndex
CREATE INDEX "Case_updatedAt_idx" ON "Case"("updatedAt");

-- CreateIndex
CREATE INDEX "Case_userId_status_idx" ON "Case"("userId", "status");

-- CreateIndex
CREATE INDEX "GeneratedDocument_caseId_idx" ON "GeneratedDocument"("caseId");

-- CreateIndex
CREATE INDEX "GeneratedDocument_type_idx" ON "GeneratedDocument"("type");

-- CreateIndex
CREATE INDEX "GeneratedDocument_status_idx" ON "GeneratedDocument"("status");

-- CreateIndex
CREATE INDEX "GeneratedDocument_createdAt_idx" ON "GeneratedDocument"("createdAt");

-- CreateIndex
CREATE INDEX "GeneratedDocument_caseId_type_idx" ON "GeneratedDocument"("caseId", "type");

-- CreateIndex
CREATE INDEX "GeneratedDocument_caseId_type_version_idx" ON "GeneratedDocument"("caseId", "type", "version");

-- CreateIndex
CREATE INDEX "ChatSession_caseId_idx" ON "ChatSession"("caseId");

-- CreateIndex
CREATE INDEX "ChatMessage_sessionId_idx" ON "ChatMessage"("sessionId");

-- CreateIndex
CREATE INDEX "AIRequestLog_caseId_idx" ON "AIRequestLog"("caseId");

-- CreateIndex
CREATE INDEX "AIRequestLog_userId_idx" ON "AIRequestLog"("userId");

-- CreateIndex
CREATE INDEX "AIRequestLog_requestType_idx" ON "AIRequestLog"("requestType");

-- CreateIndex
CREATE INDEX "AIRequestLog_status_idx" ON "AIRequestLog"("status");

-- CreateIndex
CREATE INDEX "AIRequestLog_createdAt_idx" ON "AIRequestLog"("createdAt");

-- CreateIndex
CREATE INDEX "AIRequestLog_queueJobId_idx" ON "AIRequestLog"("queueJobId");

-- CreateIndex
CREATE INDEX "AIRequestLog_caseId_requestType_idx" ON "AIRequestLog"("caseId", "requestType");

-- CreateIndex
CREATE INDEX "AIRequestLog_userId_createdAt_idx" ON "AIRequestLog"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "CaseMetadata_caseId_key" ON "CaseMetadata"("caseId");

-- CreateIndex
CREATE INDEX "CaseMetadata_caseId_idx" ON "CaseMetadata"("caseId");

-- CreateIndex
CREATE INDEX "Person_caseId_idx" ON "Person"("caseId");

-- CreateIndex
CREATE INDEX "Person_role_idx" ON "Person"("role");

-- CreateIndex
CREATE INDEX "Person_caseId_role_idx" ON "Person"("caseId", "role");

-- CreateIndex
CREATE INDEX "CaseActivity_caseId_idx" ON "CaseActivity"("caseId");

-- CreateIndex
CREATE INDEX "CaseActivity_activityType_idx" ON "CaseActivity"("activityType");

-- CreateIndex
CREATE INDEX "CaseActivity_createdAt_idx" ON "CaseActivity"("createdAt");

-- CreateIndex
CREATE INDEX "CaseActivity_caseId_createdAt_idx" ON "CaseActivity"("caseId", "createdAt");

-- CreateIndex
CREATE INDEX "Evidence_caseId_idx" ON "Evidence"("caseId");

-- CreateIndex
CREATE INDEX "Evidence_type_idx" ON "Evidence"("type");

-- CreateIndex
CREATE INDEX "Evidence_processingStatus_idx" ON "Evidence"("processingStatus");

-- CreateIndex
CREATE INDEX "Evidence_hashSha256_idx" ON "Evidence"("hashSha256");

-- CreateIndex
CREATE INDEX "Evidence_caseId_type_idx" ON "Evidence"("caseId", "type");

-- CreateIndex
CREATE INDEX "ChecklistItem_caseId_idx" ON "ChecklistItem"("caseId");

-- CreateIndex
CREATE INDEX "ChecklistItem_completed_idx" ON "ChecklistItem"("completed");

-- CreateIndex
CREATE INDEX "ChecklistItem_caseId_completed_idx" ON "ChecklistItem"("caseId", "completed");

-- CreateIndex
CREATE UNIQUE INDEX "InvestigationProfile_caseId_key" ON "InvestigationProfile"("caseId");

-- CreateIndex
CREATE INDEX "InvestigationProfile_caseId_idx" ON "InvestigationProfile"("caseId");

-- CreateIndex
CREATE UNIQUE INDEX "Victim_personId_key" ON "Victim"("personId");

-- CreateIndex
CREATE INDEX "Victim_caseId_idx" ON "Victim"("caseId");

-- CreateIndex
CREATE UNIQUE INDEX "Accused_personId_key" ON "Accused"("personId");

-- CreateIndex
CREATE INDEX "Accused_caseId_idx" ON "Accused"("caseId");

-- CreateIndex
CREATE UNIQUE INDEX "Witness_personId_key" ON "Witness"("personId");

-- CreateIndex
CREATE INDEX "Witness_caseId_idx" ON "Witness"("caseId");

-- CreateIndex
CREATE INDEX "Vehicle_caseId_idx" ON "Vehicle"("caseId");

-- CreateIndex
CREATE INDEX "Vehicle_licensePlate_idx" ON "Vehicle"("licensePlate");

-- CreateIndex
CREATE INDEX "SeizedItem_caseId_idx" ON "SeizedItem"("caseId");

-- CreateIndex
CREATE INDEX "SeizedItem_status_idx" ON "SeizedItem"("status");

-- CreateIndex
CREATE INDEX "MedicalInformation_caseId_idx" ON "MedicalInformation"("caseId");

-- CreateIndex
CREATE INDEX "MedicalInformation_severity_idx" ON "MedicalInformation"("severity");

-- CreateIndex
CREATE INDEX "CourtInformation_caseId_idx" ON "CourtInformation"("caseId");

-- CreateIndex
CREATE INDEX "CourtInformation_nextHearingDate_idx" ON "CourtInformation"("nextHearingDate");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Account_provider_providerAccountId_key" ON "Account"("provider", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "Session_sessionToken_key" ON "Session"("sessionToken");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_identifier_token_key" ON "VerificationToken"("identifier", "token");

-- AddForeignKey
ALTER TABLE "Case" ADD CONSTRAINT "Case_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GeneratedDocument" ADD CONSTRAINT "GeneratedDocument_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatSession" ADD CONSTRAINT "ChatSession_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatMessage" ADD CONSTRAINT "ChatMessage_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "ChatSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AIRequestLog" ADD CONSTRAINT "AIRequestLog_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AIRequestLog" ADD CONSTRAINT "AIRequestLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CaseMetadata" ADD CONSTRAINT "CaseMetadata_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Person" ADD CONSTRAINT "Person_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CaseActivity" ADD CONSTRAINT "CaseActivity_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Evidence" ADD CONSTRAINT "Evidence_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChecklistItem" ADD CONSTRAINT "ChecklistItem_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvestigationProfile" ADD CONSTRAINT "InvestigationProfile_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Victim" ADD CONSTRAINT "Victim_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Victim" ADD CONSTRAINT "Victim_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Accused" ADD CONSTRAINT "Accused_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Accused" ADD CONSTRAINT "Accused_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Witness" ADD CONSTRAINT "Witness_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Witness" ADD CONSTRAINT "Witness_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vehicle" ADD CONSTRAINT "Vehicle_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SeizedItem" ADD CONSTRAINT "SeizedItem_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MedicalInformation" ADD CONSTRAINT "MedicalInformation_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CourtInformation" ADD CONSTRAINT "CourtInformation_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
