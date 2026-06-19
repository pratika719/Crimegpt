import { prisma } from "@/lib/prisma";
import { CreateCaseMetadataInput, UpdateCaseMetadataInput } from "@/schema/case-metadata.schema";

export class CaseMetadataRepository {
  /**
   * Creates a new metadata profile for a case.
   */
  async create(caseId: string, data: Omit<CreateCaseMetadataInput, "caseId">) {
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
  async update(caseId: string, data: UpdateCaseMetadataInput) {
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
  async upsert(caseId: string, data: Omit<CreateCaseMetadataInput, "caseId">) {
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
  async findByCaseId(caseId: string) {
    return prisma.caseMetadata.findUnique({
      where: {
        caseId,
      },
    });
  }

  /**
   * Deletes the metadata profile for a case.
   */
  async delete(caseId: string) {
    return prisma.caseMetadata.delete({
      where: {
        caseId,
      },
    });
  }
}

export const caseMetadataRepository = new CaseMetadataRepository();
export default caseMetadataRepository;
