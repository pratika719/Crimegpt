import { prisma } from "@/lib/prisma";
import type { CaseStatus } from "@/generated/prisma/client";

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
        generatedDocuments: {
          orderBy: {
            createdAt: "desc",
          },
        },
        aiRequestLogs: {
          orderBy: {
            createdAt: "desc",
          },
        },
        caseMetadata: true,
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
        checklistItems: {
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
        medicalInformation: {
          orderBy: {
            createdAt: "desc",
          },
        },
        courtInformation: {
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
    status: CaseStatus,
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
      status?: CaseStatus;
    },
    tx?: any
  ) {
    const client = tx || prisma;
    const c = await client.case.findFirst({ where: { id, userId } });
    if (!c) throw new Error("Case not found or unauthorized");

    return client.case.update({
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