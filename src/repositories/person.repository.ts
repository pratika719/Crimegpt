import { prisma } from "@/lib/prisma";
import { CreatePersonInput, UpdatePersonInput } from "@/schema/person.schema";

export class PersonRepository {
  async create(caseId: string, data: Omit<CreatePersonInput, "caseId">) {
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

  async findById(id: string) {
    return prisma.person.findUnique({
      where: { id },
    });
  }

  async findByCaseId(caseId: string) {
    return prisma.person.findMany({
      where: { caseId },
      orderBy: { createdAt: "desc" },
    });
  }

  async update(id: string, data: UpdatePersonInput) {
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

  async delete(id: string) {
    return prisma.person.delete({
      where: { id },
    });
  }
}

export const personRepository = new PersonRepository();
export default personRepository;
