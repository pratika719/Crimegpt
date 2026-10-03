import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '@/common/prisma';
import { CaseStatus } from '@prisma/client';

@Injectable()
export class CaseRepository {
  private readonly logger = new Logger(CaseRepository.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, data: { title: string; narrative: string }) {
    return this.prisma.case.create({
      data: {
        ...data,
        userId,
      },
    });
  }

  async findAll(userId: string) {
    return this.prisma.case.findMany({
      where: { userId },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findById(id: string, userId: string) {
    return this.prisma.case.findFirst({
      where: {
        id,
        userId,
      },
      include: {
        generatedDocuments: {
          orderBy: {
            createdAt: 'desc',
          },
        },
        aiRequestLogs: {
          orderBy: {
            createdAt: 'desc',
          },
        },
        caseMetadata: true,
        activities: {
          orderBy: {
            createdAt: 'desc',
          },
        },
        persons: {
          orderBy: {
            createdAt: 'desc',
          },
        },
        evidence: {
          orderBy: {
            createdAt: 'desc',
          },
        },
        checklistItems: {
          orderBy: [
            { completed: 'asc' },
            { createdAt: 'desc' },
          ],
        },
        investigationProfile: true,
        victims: {
          include: {
            person: true,
          },
          orderBy: {
            createdAt: 'desc',
          },
        },
        accused: {
          include: {
            person: true,
          },
          orderBy: {
            createdAt: 'desc',
          },
        },
        witnesses: {
          include: {
            person: true,
          },
          orderBy: {
            createdAt: 'desc',
          },
        },
        vehicles: {
          orderBy: {
            createdAt: 'desc',
          },
        },
        seizedItems: {
          orderBy: {
            createdAt: 'desc',
          },
        },
        medicalInformation: {
          orderBy: {
            createdAt: 'desc',
          },
        },
        courtInformation: {
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
    });
  }

  async updateStatus(id: string, userId: string, status: CaseStatus) {
    const c = await this.prisma.case.findFirst({ where: { id, userId } });
    if (!c) throw new NotFoundException('Case not found or unauthorized');

    return this.prisma.case.update({
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
  ) {
    const c = await this.prisma.case.findFirst({ where: { id, userId } });
    if (!c) throw new NotFoundException('Case not found or unauthorized');

    return this.prisma.case.update({
      where: { id },
      data,
    });
  }

  async delete(id: string, userId: string) {
    const c = await this.prisma.case.findFirst({ where: { id, userId } });
    if (!c) throw new NotFoundException('Case not found or unauthorized');

    // Prisma cascade handles all child records
    return this.prisma.case.delete({
      where: { id },
    });
  }
}
