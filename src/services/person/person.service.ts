import { personRepository } from "@/repositories/person.repository";
import { CreatePersonSchema, CreatePersonInput, UpdatePersonSchema, UpdatePersonInput } from "@/schema/person.schema";
import { activityService } from "@/services/activity/activity.service";

export class PersonService {
  private repository = personRepository;

  /**
   * Adds a person to a case. Validates data and logs a PERSON_ADDED timeline event.
   */
  async createPerson(caseId: string, userId: string, input: Omit<CreatePersonInput, "caseId">) {
    const parsed = CreatePersonSchema.parse({
      ...input,
      caseId,
    });

    console.log(`💼 [PersonService] Adding person "${parsed.name}" to case: ${caseId} by user: ${userId}`);
    const result = await this.repository.create(caseId, userId, parsed);
    
    // Log timeline activity
    await activityService.logPersonAdded(caseId, result.name, result.role);
    
    return result;
  }

  /**
   * Retrieves a person by ID. Throws error if not found or unauthorized.
   */
  async getPersonById(id: string, userId: string, caseId?: string) {
    const person = await this.repository.findById(id, userId, caseId);
    if (!person) {
      throw new Error("Person not found or access denied.");
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
  async updatePerson(id: string, userId: string, input: UpdatePersonInput, caseId?: string) {
    const parsed = UpdatePersonSchema.parse(input);
    const existing = await this.getPersonById(id, userId, caseId);

    console.log(`💼 [PersonService] Updating person details for ID: ${id} by user: ${userId}`);
    const result = await this.repository.update(id, userId, parsed, caseId);
    
    // Log timeline activity
    await activityService.logPersonUpdated(existing.caseId, result.name, result.role);
    
    return result;
  }

  /**
   * Deletes a person by ID. Logs a PERSON_DELETED timeline event.
   */
  async deletePerson(id: string, userId: string, caseId?: string) {
    const existing = await this.getPersonById(id, userId, caseId);
    
    console.log(`💼 [PersonService] Deleting person: ${existing.name} (ID: ${id}) by user: ${userId}`);
    const result = await this.repository.delete(id, userId, caseId);
    
    // Log timeline activity
    await activityService.logPersonDeleted(existing.caseId, existing.name, existing.role);
    
    return result;
  }
}

export const personService = new PersonService();
export default personService;
