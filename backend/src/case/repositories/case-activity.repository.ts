import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ActivityType } from '@prisma/client';

@Injectable()
export class CaseActivityRepository {
  private readonly logger = new Logger(CaseActivityRepository.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(
    data: {
      caseId: string;
      userId: string;
      activityType: ActivityType;
      description: string;
      metadata?: Record<string, unknown>;
    },
    tx?: any,
  ) {
    const client = tx || this.prisma;
    const { activityType, description, metadata } = data;
    return client.caseActivity.create({
      data: {
        activityType,
        description,
        caseId: data.caseId,
        ...(metadata ? { metadata: metadata as any } : {}),
      },
    });
  }

  async findByCaseId(caseId: string, userId: string) {
    return this.prisma.caseActivity.findMany({
      where: { caseId, case: { userId } },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findById(id: string, caseId: string, userId: string) {
    return this.prisma.caseActivity.findFirst({
      where: {
        id,
        caseId,
        case: { userId },
      },
    });
  }

  async update(
    id: string,
    caseId: string,
    userId: string,
    data: { description?: string },
  ) {
    const existing = await this.findById(id, caseId, userId);
    if (!existing) {
      throw new NotFoundException('Activity not found or access denied');
    }

    return this.prisma.caseActivity.update({
      where: { id },
      data,
    });
  }

  async delete(id: string, caseId: string, userId: string) {
    const existing = await this.findById(id, caseId, userId);
    if (!existing) {
      throw new NotFoundException('Activity not found or access denied');
    }

    return this.prisma.caseActivity.delete({
      where: { id },
    });
  }
}
