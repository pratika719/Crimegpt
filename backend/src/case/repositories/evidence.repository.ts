import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { EvidenceType } from '@/generated/prisma/client';

@Injectable()
export class EvidenceRepository {
  private readonly logger = new Logger(EvidenceRepository.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(
    caseId: string,
    userId: string,
    data: {
      title: string;
      type: EvidenceType;
      description?: string;
      storageKey?: string;
      mimeType?: string;
      fileSize?: number;
    },
  ) {
    return this.prisma.evidence.create({
      data: {
        ...data,
        caseId,
        userId,
      },
    });
  }

  async findById(id: string, userId: string, caseId?: string) {
    return this.prisma.evidence.findFirst({
      where: {
        id,
        userId,
        ...(caseId ? { caseId } : {}),
      },
    });
  }

  async findByCaseId(caseId: string, userId: string) {
    return this.prisma.evidence.findMany({
      where: { caseId, userId },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async update(
    id: string,
    userId: string,
    data: {
      title?: string;
      type?: EvidenceType;
      description?: string;
      storageKey?: string;
      mimeType?: string;
      fileSize?: number;
    },
    caseId?: string,
  ) {
    const existing = await this.findById(id, userId, caseId);
    if (!existing) {
      throw new NotFoundException('Evidence not found or access denied');
    }

    return this.prisma.evidence.update({
      where: { id },
      data,
    });
  }

  async delete(id: string, userId: string, caseId?: string) {
    const existing = await this.findById(id, userId, caseId);
    if (!existing) {
      throw new NotFoundException('Evidence not found or access denied');
    }

    return this.prisma.evidence.delete({
      where: { id },
    });
  }
}
