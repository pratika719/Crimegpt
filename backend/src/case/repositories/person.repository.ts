import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

import { PersonRole } from '@/generated/prisma/client';

@Injectable()
export class PersonRepository {
  private readonly logger = new Logger(PersonRepository.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(
    caseId: string,
    _userId: string,
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
    const { name, role, address, phone, description } = data;
    return this.prisma.person.create({
      data: {
        name,
        role: (role as PersonRole) || PersonRole.WITNESS,
        address: address ?? null,
        phone: phone ?? null,
        statement: description ?? null,
        caseId,
      },
    });
  }

  async findById(id: string, userId: string, caseId?: string) {
    return this.prisma.person.findFirst({
      where: {
        id,
        case: { userId },
        ...(caseId ? { caseId } : {}),
      },
    });
  }

  async findByCaseId(caseId: string, userId: string) {
    return this.prisma.person.findMany({
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

    const { name, role, address, phone, description } = data;
    return this.prisma.person.update({
      where: { id },
      data: {
        ...(name !== undefined ? { name } : {}),
        ...(role !== undefined ? { role: role as PersonRole } : {}),
        ...(address !== undefined ? { address } : {}),
        ...(phone !== undefined ? { phone } : {}),
        ...(description !== undefined ? { statement: description } : {}),
      },
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
