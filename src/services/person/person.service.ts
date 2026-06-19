import { personRepository } from "@/repositories/person.repository";
import { CreatePersonSchema, CreatePersonInput, UpdatePersonSchema, UpdatePersonInput } from "@/schema/person.schema";
import { activityService } from "@/services/activity/activity.service";

export class PersonService {
  private repository = personRepository;

  /**
   * Adds a person to a case. Validates data and logs a PERSON_ADDED timeline event.
   */
  async createPerson(caseId: string, input: Omit<CreatePersonInput, "caseId">) {
    const parsed = CreatePersonSchema.parse({
      ...input,
      caseId,
    });

    console.log(`💼 [PersonService] Adding person "${parsed.name}" to case: ${caseId}`);
    const result = await this.repository.create(caseId, parsed);
    
    // Log timeline activity
    await activityService.logPersonAdded(caseId, result.name, result.role);
    
    return result;
  }

  /**
   * Retrieves a person by ID. Throws error if not found.
   */
  async getPersonById(id: string) {
    const person = await this.repository.findById(id);
    if (!person) {
      throw new Error("Person not found.");
    }
    return person;
  }

  /**
   * Retrieves all persons registered to a case.
   */
  async getPersonsByCaseId(caseId: string) {
    return this.repository.findByCaseId(caseId);
  }

  /**
   * Updates details for a person. Validates input and logs a PERSON_UPDATED timeline event.
   */
  async updatePerson(id: string, input: UpdatePersonInput) {
    const parsed = UpdatePersonSchema.parse(input);
    const existing = await this.getPersonById(id);

    console.log(`💼 [PersonService] Updating person details for ID: ${id}`);
    const result = await this.repository.update(id, parsed);
    
    // Log timeline activity
    await activityService.logPersonUpdated(existing.caseId, result.name, result.role);
    
    return result;
  }

  /**
   * Deletes a person by ID. Logs a PERSON_DELETED timeline event.
   */
  async deletePerson(id: string) {
    const existing = await this.getPersonById(id);
    
    console.log(`💼 [PersonService] Deleting person: ${existing.name} (ID: ${id})`);
    const result = await this.repository.delete(id);
    
    // Log timeline activity
    await activityService.logPersonDeleted(existing.caseId, existing.name, existing.role);
    
    return result;
  }
}

export const personService = new PersonService();
export default personService;
