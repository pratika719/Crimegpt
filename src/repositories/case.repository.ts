import { prisma } from "@/lib/prisma";

export class CaseRepository {
  async create(data: {
    title: string;
    narrative: string;
  }) {
    return prisma.case.create({
      data,
    });
  }

  async findAll() {
    return prisma.case.findMany({
      orderBy: {
        createdAt: "desc",
      },
    });
  }

  async findById(id: string) {
    return prisma.case.findUnique({
      where: {
        id,
      },
    });
  }

  async updateStatus(
    id: string,
    status: "OPEN" | "UNDER_INVESTIGATION" | "CLOSED"
  ) {
    return prisma.case.update({
      where: { id },
      data: { status },
    });
  }
}