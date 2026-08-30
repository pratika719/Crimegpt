import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class CaseMetadataRepository {
  private readonly logger = new Logger(CaseMetadataRepository.name);

  constructor(private readonly prisma: PrismaService) {}

  async findOrCreate(caseId: string, userId: string) {
    const existing = await this.prisma.caseMetadata.findUnique({
      where: { caseId },
    });

    if (existing) {
      return existing;
    }

    return this.prisma.caseMetadata.create({
      data: {
        caseId,
        userId,
      },
    });
  }

  async update(
    caseId: string,
    data: {
      firNumber?: string;
      policeStation?: string;
      district?: string;
      state?: string;
      ipcSections?: string[];
      dateOfIncident?: Date;
      dateOfFiling?: Date;
    },
  ) {
    return this.prisma.caseMetadata.update({
      where: { caseId },
      data,
    });
  }

  async findByCaseId(caseId: string) {
    return this.prisma.caseMetadata.findUnique({
      where: { caseId },
    });
  }
}
