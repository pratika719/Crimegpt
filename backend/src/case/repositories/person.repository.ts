import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class PersonRepository {
  private readonly logger = new Logger(PersonRepository.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(
    caseId: string,
    userId: string,
    data: {
      name: string;
      role: string;
      age?: number;
      gender?: string;
      address?: string;
      phone?: string;
      email?: string;
      description?: string;
      relationshipToVictim?: string;
    },
  ) {
    return this.prisma.person.create({
      data: {
        ...data,
        caseId,
        userId,
      },
    });
  }

  async findById(id: string, userId: string, caseId?: string) {
    return this.prisma.person.findFirst({
      where: {
        id,
        userId,
        ...(caseId ? { caseId } : {}),
      },
    });
  }

  async findByCaseId(caseId: string, userId: string) {
    return this.prisma.person.findMany({
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
      name?: string;
      role?: string;
      age?: number;
      gender?: string;
      address?: string;
      phone?: string;
      email?: string;
      description?: string;
      relationshipToVictim?: string;
    },
    caseId?: string,
  ) {
    const existing = await this.findById(id, userId, caseId);
    if (!existing) {
      throw new NotFoundException('Person not found or access denied');
    }

    return this.prisma.person.update({
      where: { id },
      data,
    });
  }

  async delete(id: string, userId: string, caseId?: string) {
    const existing = await this.findById(id, userId, caseId);
    if (!existing) {
      throw new NotFoundException('Person not found or access denied');
    }

    return this.prisma.person.delete({
      where: { id },
    });
  }
}
