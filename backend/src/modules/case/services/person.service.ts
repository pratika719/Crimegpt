import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PersonRepository } from '../repositories/person.repository';
import { ActivityService } from './activity.service';

@Injectable()
export class PersonService {
  private readonly logger = new Logger(PersonService.name);

  constructor(
    private readonly repository: PersonRepository,
    private readonly activityService: ActivityService,
  ) {}

  /**
   * Adds a person to a case. Validates data and logs a PERSON_ADDED timeline event.
   */
  async createPerson(
    caseId: string,
    userId: string,
    input: {
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
    this.logger.log({ caseId, userId, personName: input.name }, 'Adding person to case');
    const result = await this.repository.create(caseId, userId, input);

    // Log timeline activity
    await this.activityService.logPersonAdded(caseId, userId, result.name, result.role);

    return result;
  }

  /**
   * Retrieves a person by ID. Throws error if not found or unauthorized.
   */
  async getPersonById(id: string, userId: string, caseId?: string) {
    const person = await this.repository.findById(id, userId, caseId);
    if (!person) {
      throw new NotFoundException('Person not found or access denied.');
    }
    return person;
  }

  /**
   * Retrieves all persons registered to a case.
   */
  async getPersonsByCaseId(caseId: string, userId: string) {
    return this.repository.findByCaseId(caseId, userId);
  }

  /**
   * Updates details for a person. Validates input and logs a PERSON_UPDATED timeline event.
   */
  async updatePerson(
    id: string,
    userId: string,
    input: {
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
    const existing = await this.getPersonById(id, userId, caseId);

    this.logger.log({ personId: id, userId }, 'Updating person');
    const result = await this.repository.update(id, userId, input, caseId);

    // Log timeline activity
    await this.activityService.logPersonUpdated(existing.caseId, userId, result.name, result.role);

    return result;
  }

  /**
   * Deletes a person by ID. Logs a PERSON_DELETED timeline event.
   */
  async deletePerson(id: string, userId: string, caseId?: string) {
    const existing = await this.getPersonById(id, userId, caseId);

    this.logger.log({ personId: id, userId, personName: existing.name }, 'Deleting person');
    const result = await this.repository.delete(id, userId, caseId);

    // Log timeline activity
    await this.activityService.logPersonDeleted(existing.caseId, userId, existing.name, existing.role);

    return result;
  }
}
