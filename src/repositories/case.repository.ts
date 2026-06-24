import { prisma } from "@/lib/prisma";

export class CaseRepository {
  async create(userId: string, data: {
    title: string;
    narrative: string;
  }) {
    return prisma.case.create({
      data: {
        ...data,
        userId,
      },
    });
  }

  async findAll(userId: string) {
    return prisma.case.findMany({
      where: { userId },
      orderBy: {
        createdAt: "desc",
      },
    });
  }

  async findById(id: string, userId: string) {
    return prisma.case.findFirst({
      where: {
        id,
        userId,
      },
      include: {
        documents: {
          orderBy: {
            createdAt: "desc",
          },
        },
        aiRequests: {
          orderBy: {
            createdAt: "desc",
          },
        },
        metadata: true,
        activities: {
          orderBy: {
            createdAt: "desc",
          },
        },
        persons: {
          orderBy: {
            createdAt: "desc",
          },
        },
        evidence: {
          orderBy: {
            createdAt: "desc",
          },
        },
        checklist: {
          orderBy: [
            { completed: "asc" },
            { createdAt: "desc" },
          ],
        },
        investigationProfile: true,
        victims: {
          include: {
            person: true,
          },
          orderBy: {
            createdAt: "desc",
          },
        },
        accused: {
          include: {
            person: true,
          },
          orderBy: {
            createdAt: "desc",
          },
        },
        witnesses: {
          include: {
            person: true,
          },
          orderBy: {
            createdAt: "desc",
          },
        },
        vehicles: {
          orderBy: {
            createdAt: "desc",
          },
        },
        seizedItems: {
          orderBy: {
            createdAt: "desc",
          },
        },
        medicalInfos: {
          orderBy: {
            createdAt: "desc",
          },
        },
        courtInfos: {
          orderBy: {
            createdAt: "desc",
          },
        },
      },
    });
  }

  async updateStatus(
    id: string,
    userId: string,
    status: "OPEN" | "UNDER_INVESTIGATION" | "CLOSED",
    tx?: any
  ) {
    const client = tx || prisma;
    const c = await client.case.findFirst({ where: { id, userId } });
    if (!c) throw new Error("Case not found or unauthorized");

    return client.case.update({
      where: { id },
      data: { status },
    });
  }

  async update(
    id: string,
    userId: string,
    data: {
      title?: string;
      narrative?: string;
      status?: "OPEN" | "UNDER_INVESTIGATION" | "CLOSED";
    }
  ) {
    const c = await prisma.case.findFirst({ where: { id, userId } });
    if (!c) throw new Error("Case not found or unauthorized");

    return prisma.case.update({
      where: { id },
      data,
    });
  }

  async delete(id: string, userId: string) {
    const c = await prisma.case.findFirst({ where: { id, userId } });
    if (!c) throw new Error("Case not found or unauthorized");

    // Prisma cascade handles all child records
    return prisma.case.delete({
      where: { id },
    });
  }
}