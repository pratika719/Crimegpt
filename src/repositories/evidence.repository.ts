import { prisma } from "@/lib/prisma";
import { CreateEvidenceInput, UpdateEvidenceInput } from "@/schema/evidence.schema";

export class EvidenceRepository {
  async create(caseId: string, data: Omit<CreateEvidenceInput, "caseId">) {
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

  async findById(id: string) {
    return prisma.evidence.findUnique({
      where: { id },
    });
  }

  async findByCaseId(caseId: string) {
    return prisma.evidence.findMany({
      where: { caseId },
      orderBy: { createdAt: "desc" },
    });
  }

  async update(id: string, data: UpdateEvidenceInput) {
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

  async delete(id: string) {
    return prisma.evidence.delete({
      where: { id },
    });
  }
}

export const evidenceRepository = new EvidenceRepository();
export default evidenceRepository;
