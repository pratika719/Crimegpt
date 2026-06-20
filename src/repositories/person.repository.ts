import { prisma } from "@/lib/prisma";
import { CreatePersonInput, UpdatePersonInput } from "@/schema/person.schema";

export class PersonRepository {
  private async checkCaseOwnership(caseId: string, userId: string) {
    const c = await prisma.case.findFirst({
      where: { id: caseId, userId },
    });
    if (!c) {
      throw new Error("Unauthorized: Case not found or access denied.");
    }
  }

  async create(caseId: string, userId: string, data: Omit<CreatePersonInput, "caseId">) {
    await this.checkCaseOwnership(caseId, userId);
    return prisma.person.create({
      data: {
        name: data.name,
        role: data.role,
        phone: data.phone || null,
        address: data.address || null,
        statement: data.statement || null,
        notes: data.notes || null,
        caseId,
      },
    });
  }

  async findById(id: string, userId: string) {
    return prisma.person.findFirst({
      where: {
        id,
        case: { userId },
      },
    });
  }

  async findByCaseId(caseId: string, userId: string) {
    await this.checkCaseOwnership(caseId, userId);
    return prisma.person.findMany({
      where: {
        caseId,
        case: { userId },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async update(id: string, userId: string, data: UpdatePersonInput) {
    const existing = await this.findById(id, userId);
    if (!existing) {
      throw new Error("Unauthorized: Person not found or access denied.");
    }

    return prisma.person.update({
      where: { id },
      data: {
        name: data.name,
        role: data.role,
        phone: data.phone === "" ? null : data.phone,
        address: data.address === "" ? null : data.address,
        statement: data.statement === "" ? null : data.statement,
        notes: data.notes === "" ? null : data.notes,
      },
    });
  }

  async delete(id: string, userId: string) {
    const existing = await this.findById(id, userId);
    if (!existing) {
      throw new Error("Unauthorized: Person not found or access denied.");
    }

    return prisma.person.delete({
      where: { id },
    });
  }
}

export const personRepository = new PersonRepository();
export default personRepository;
