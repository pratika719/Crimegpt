import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class CaseMetadataRepository {
  private readonly logger = new Logger(CaseMetadataRepository.name);

  constructor(private readonly prisma: PrismaService) {}

  async findOrCreate(caseId: string) {
    const existing = await this.prisma.caseMetadata.findUnique({
      where: { caseId },
    });

    if (existing) {
      return existing;
    }

    return this.prisma.caseMetadata.create({
      data: {
        caseId,
      },
    });
  }

  async update(
    caseId: string,
    data: {
      incidentDate?: Date;
      incidentTime?: string;
      incidentLocation?: string;
      victimName?: string;
      victimStatement?: string;
      suspectName?: string;
      suspectDescription?: string;
      witnessInformation?: string;
      evidenceSummary?: string;
      officerNotes?: string;
      dateOfIncident?: Date;
    },
  ) {
    const updateData: Record<string, unknown> = {};
    if (data.incidentDate) updateData.incidentDate = data.incidentDate;
    else if (data.dateOfIncident) updateData.incidentDate = data.dateOfIncident;
    if (data.incidentTime) updateData.incidentTime = data.incidentTime;
    if (data.incidentLocation) updateData.incidentLocation = data.incidentLocation;
    if (data.victimName) updateData.victimName = data.victimName;
    if (data.victimStatement) updateData.victimStatement = data.victimStatement;
    if (data.suspectName) updateData.suspectName = data.suspectName;
    if (data.suspectDescription) updateData.suspectDescription = data.suspectDescription;
    if (data.witnessInformation) updateData.witnessInformation = data.witnessInformation;
    if (data.evidenceSummary) updateData.evidenceSummary = data.evidenceSummary;
    if (data.officerNotes) updateData.officerNotes = data.officerNotes;

    return this.prisma.caseMetadata.update({
      where: { caseId },
      data: updateData,
    });
  }

  async findByCaseId(caseId: string) {
    return this.prisma.caseMetadata.findUnique({
      where: { caseId },
    });
  }
}
