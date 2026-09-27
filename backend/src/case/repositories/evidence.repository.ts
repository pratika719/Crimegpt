import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { EvidenceType } from '@prisma/client';

@Injectable()
export class EvidenceRepository {
  private readonly logger = new Logger(EvidenceRepository.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(
    caseId: string,
    _userId: string,
    data: {
      title: string;
      type: EvidenceType;
      description?: string;
      notes?: string;
      fileUrl?: string;
      storageKey?: string;
      mimeType?: string;
      fileSize?: number;
      fileSizeBytes?: number;
    },
  ) {
    const { storageKey, fileSize, fileSizeBytes, fileUrl, notes, ...rest } = data;
    const resolvedFileUrl = fileUrl || storageKey;
    const resolvedFileSize = fileSizeBytes ?? fileSize;

    return this.prisma.evidence.create({
      data: {
        ...rest,
        caseId,
        ...(notes !== undefined ? { notes } : {}),
        ...(resolvedFileUrl !== undefined ? { fileUrl: resolvedFileUrl } : {}),
        ...(resolvedFileSize !== undefined ? { fileSizeBytes: resolvedFileSize } : {}),
      },
    });
  }

  async findById(id: string, userId: string, caseId?: string) {
    return this.prisma.evidence.findFirst({
      where: {
        id,
        case: { userId },
        ...(caseId ? { caseId } : {}),
      },
    });
  }

  async findByCaseId(caseId: string, userId: string) {
    return this.prisma.evidence.findMany({
      where: { caseId, case: { userId } },
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
      notes?: string;
      fileUrl?: string;
      storageKey?: string;
      mimeType?: string;
      fileSize?: number;
      fileSizeBytes?: number;
    },
    caseId?: string,
  ) {
    const existing = await this.findById(id, userId, caseId);
    if (!existing) {
      throw new NotFoundException('Evidence not found or access denied');
    }

    const { storageKey, fileSize, fileSizeBytes, fileUrl, notes, ...rest } = data;
    const resolvedFileUrl = fileUrl !== undefined ? fileUrl : storageKey;
    const resolvedFileSize = fileSizeBytes !== undefined ? fileSizeBytes : fileSize;

    return this.prisma.evidence.update({
      where: { id },
      data: {
        ...rest,
        ...(notes !== undefined ? { notes } : {}),
        ...(resolvedFileUrl !== undefined ? { fileUrl: resolvedFileUrl } : {}),
        ...(resolvedFileSize !== undefined ? { fileSizeBytes: resolvedFileSize } : {}),
      },
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
