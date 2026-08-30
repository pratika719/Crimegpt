import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ChecklistRepository {
  private readonly logger = new Logger(ChecklistRepository.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(caseId: string, userId: string, title: string) {
    return this.prisma.checklistItem.create({
      data: {
        title,
        caseId,
        userId,
      },
    });
  }

  async findById(id: string, userId: string, caseId?: string) {
    return this.prisma.checklistItem.findFirst({
      where: {
        id,
        userId,
        ...(caseId ? { caseId } : {}),
      },
    });
  }

  async findByCaseId(caseId: string, userId: string) {
    return this.prisma.checklistItem.findMany({
      where: { caseId, userId },
      orderBy: [
        { completed: 'asc' },
        { createdAt: 'desc' },
      ],
    });
  }

  async update(
    id: string,
    userId: string,
    data: {
      title?: string;
      completed?: boolean;
      completedAt?: Date | null;
    },
    caseId?: string,
  ) {
    const existing = await this.findById(id, userId, caseId);
    if (!existing) {
      throw new NotFoundException('Checklist item not found or access denied');
    }

    return this.prisma.checklistItem.update({
      where: { id },
      data,
    });
  }

  async delete(id: string, userId: string, caseId?: string) {
    const existing = await this.findById(id, userId, caseId);
    if (!existing) {
      throw new NotFoundException('Checklist item not found or access denied');
    }

    return this.prisma.checklistItem.delete({
      where: { id },
    });
  }
}
