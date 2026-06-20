import { prisma } from "@/lib/prisma";
import { CreateCaseMetadataInput, UpdateCaseMetadataInput } from "@/schema/case-metadata.schema";

export class CaseMetadataRepository {
  private async checkCaseOwnership(caseId: string, userId: string) {
    const c = await prisma.case.findFirst({
      where: { id: caseId, userId },
    });
    if (!c) {
      throw new Error("Unauthorized: Case not found or access denied.");
    }
  }

  /**
   * Creates a new metadata profile for a case.
   */
  async create(caseId: string, userId: string, data: Omit<CreateCaseMetadataInput, "caseId">) {
    await this.checkCaseOwnership(caseId, userId);
    return prisma.caseMetadata.create({
      data: {
        ...data,
        caseId,
      },
    });
  }

  /**
   * Updates an existing metadata profile.
   */
  async update(caseId: string, userId: string, data: UpdateCaseMetadataInput) {
    await this.checkCaseOwnership(caseId, userId);
    return prisma.caseMetadata.update({
      where: {
        caseId,
      },
      data,
    });
  }

  /**
   * Upserts the metadata profile for a case.
   */
  async upsert(caseId: string, userId: string, data: Omit<CreateCaseMetadataInput, "caseId">) {
    await this.checkCaseOwnership(caseId, userId);
    return prisma.caseMetadata.upsert({
      where: {
        caseId,
      },
      create: {
        ...data,
        caseId,
      },
      update: data,
    });
  }

  /**
   * Finds the metadata profile associated with a case ID.
   */
  async findByCaseId(caseId: string, userId: string) {
    await this.checkCaseOwnership(caseId, userId);
    return prisma.caseMetadata.findUnique({
      where: {
        caseId,
      },
    });
  }

  /**
   * Deletes the metadata profile for a case.
   */
  async delete(caseId: string, userId: string) {
    await this.checkCaseOwnership(caseId, userId);
    return prisma.caseMetadata.delete({
      where: {
        caseId,
      },
    });
  }
}

export const caseMetadataRepository = new CaseMetadataRepository();
export default caseMetadataRepository;
