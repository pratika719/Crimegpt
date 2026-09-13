import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class DocumentRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAllByCaseId(caseId: string, userId: string) {
    return this.prisma.generatedDocument.findMany({
      where: {
        caseId,
        case: { userId },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findById(id: string, userId: string, caseId?: string) {
    return this.prisma.generatedDocument.findFirst({
      where: {
        id,
        ...(caseId ? { caseId } : {}),
        case: { userId },
      },
    });
  }

  async updateTitle(id: string, userId: string, title: string, caseId?: string) {
    const existing = await this.findById(id, userId, caseId);
    if (!existing) {
      throw new NotFoundException('Document not found or access denied');
    }

    return this.prisma.generatedDocument.update({
      where: { id },
      data: { title },
    });
  }

  async deleteById(id: string, userId: string, caseId?: string) {
    const existing = await this.findById(id, userId, caseId);
    if (!existing) {
      throw new NotFoundException('Document not found or access denied');
    }

    return this.prisma.generatedDocument.delete({
      where: { id },
    });
  }
}
