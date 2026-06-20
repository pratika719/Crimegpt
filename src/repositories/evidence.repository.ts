import { prisma } from "@/lib/prisma";
import { CreateEvidenceInput, UpdateEvidenceInput } from "@/schema/evidence.schema";

export class EvidenceRepository {
  private async checkCaseOwnership(caseId: string, userId: string) {
    const c = await prisma.case.findFirst({
      where: { id: caseId, userId },
    });
    if (!c) {
      throw new Error("Unauthorized: Case not found or access denied.");
    }
  }

  async create(caseId: string, userId: string, data: Omit<CreateEvidenceInput, "caseId">) {
    await this.checkCaseOwnership(caseId, userId);
    return prisma.evidence.create({
      data: {
        title: data.title,
        type: data.type,
        description: data.description || null,
        notes: data.notes || null,
        fileUrl: data.fileUrl || null,
        caseId,
      },
    });
  }

  async findById(id: string, userId: string, caseId?: string) {
    return prisma.evidence.findFirst({
      where: {
        id,
        ...(caseId ? { caseId } : {}),
        case: { userId },
      },
    });
  }

  async findByCaseId(caseId: string, userId: string) {
    await this.checkCaseOwnership(caseId, userId);
    return prisma.evidence.findMany({
      where: {
        caseId,
        case: { userId },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async update(id: string, userId: string, data: UpdateEvidenceInput, caseId?: string) {
    const existing = await this.findById(id, userId, caseId);
    if (!existing) {
      throw new Error("Unauthorized: Evidence not found or access denied.");
    }

    return prisma.evidence.update({
      where: { id },
      data: {
        title: data.title,
        type: data.type,
        description: data.description === "" ? null : data.description,
        notes: data.notes === "" ? null : data.notes,
        fileUrl: data.fileUrl === "" ? null : data.fileUrl,
      },
    });
  }

  async delete(id: string, userId: string, caseId?: string) {
    const existing = await this.findById(id, userId, caseId);
    if (!existing) {
      throw new Error("Unauthorized: Evidence not found or access denied.");
    }

    return prisma.evidence.delete({
      where: { id },
    });
  }
}

export const evidenceRepository = new EvidenceRepository();
export default evidenceRepository;
