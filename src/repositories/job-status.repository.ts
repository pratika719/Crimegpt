import { prisma } from "@/lib/prisma";

export type JobStatusRecord = {
  id: string;
  queueName: string;
  status: "pending" | "active" | "completed" | "failed";
  userId?: string | null;
  caseId?: string | null;
  documentType?: string | null;
  errorMessage?: string | null;
  errorCode?: string | null;
  failureType?: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export class JobStatusRepository {
  async upsert(input: {
    id: string;
    queueName: string;
    status: "pending" | "active" | "completed" | "failed";
    userId?: string;
    caseId?: string;
    documentType?: string;
    errorMessage?: string;
    errorCode?: string;
    failureType?: string;
  }): Promise<JobStatusRecord> {
    const result = await prisma.jobStatus.upsert({
      where: { id: input.id },
      update: {
        status: input.status,
        userId: input.userId ?? null,
        caseId: input.caseId ?? null,
        documentType: input.documentType ?? null,
        errorMessage: input.errorMessage ?? null,
        errorCode: input.errorCode ?? null,
        failureType: input.failureType ?? null,
      },
      create: {
        id: input.id,
        queueName: input.queueName,
        status: input.status,
        userId: input.userId ?? null,
        caseId: input.caseId ?? null,
        documentType: input.documentType ?? null,
        errorMessage: input.errorMessage ?? null,
        errorCode: input.errorCode ?? null,
        failureType: input.failureType ?? null,
      },
    });
    return result as unknown as JobStatusRecord;
  }

  async findById(id: string): Promise<JobStatusRecord | null> {
    const result = await prisma.jobStatus.findUnique({
      where: { id },
    });
    return result as unknown as JobStatusRecord | null;
  }

  async deleteOlderThan(ageMs: number): Promise<number> {
    const cutoff = new Date(Date.now() - ageMs);
    const result = await prisma.jobStatus.deleteMany({
      where: {
        updatedAt: { lt: cutoff },
      },
    });
    return result.count;
  }
}

export const jobStatusRepository = new JobStatusRepository();
