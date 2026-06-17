import { lawRetriever, CleanedLawReference } from "../retrievers/law.retriever";
import { buildFIRGenerationPrompt } from "../prompts/fir-generation.prompt";
import { geminiProvider } from "../providers/gemini-provider";
import { FIRSchema, FIROutput } from "../../schema/fir.schema";

export interface FIRChainOutput {
  result: FIROutput;
  modelUsed: string;
  latencyMs: number;
  promptText: string;
  rawResponse: string;
  retrievedChunks: CleanedLawReference[];
}

/**
 * Core orchestration chain for CrimeGPT FIR Generation.
 * Retrieves legal chunks from PGVector, prompts Gemini, and validates response against FIRSchema.
 */
export class FIRGenerationChain {
  /**
   * Executes the RAG flow for FIR generation.
   * 
   * @param narrative The case statement narrative.
   * @param k Number of chunks to retrieve.
   * @returns FIRChainOutput containing validated structured results and metadata logs.
   */
  async execute(narrative: string, k = 5): Promise<FIRChainOutput> {
    const startTime = Date.now();
    console.log(`🤖 [FIRGenerationChain] Initiating chain execution...`);

    // 1. Retrieve unique law sections from PGVector
    const retrievedChunks = await lawRetriever.retrieve(narrative, k);
    console.log(`🤖 [FIRGenerationChain] Retrieved ${retrievedChunks.length} unique legal context chunks.`);

    // 2. Build the strict prompt with context
    const promptText = buildFIRGenerationPrompt(narrative, retrievedChunks);

    // 3. Query Gemini Flash
    const modelUsed = geminiProvider.getModelName();
    console.log(`🤖 [FIRGenerationChain] Dispatching RAG prompt to ${modelUsed}...`);
    const rawResponse = await geminiProvider.generateJSON(promptText);

    const latencyMs = Date.now() - startTime;
    console.log(`🤖 [FIRGenerationChain] Model responded in ${latencyMs}ms.`);

    // 4. Parse JSON and validate against Zod schema
    let result: FIROutput;
    try {
      const rawData = JSON.parse(rawResponse);
      result = FIRSchema.parse(rawData);
      console.log(`🤖 [FIRGenerationChain] Structured FIR successfully validated.`);
    } catch (err: any) {
      throw new Error(`Failed to parse or validate FIR output: ${err.message}`);
    }

    return {
      result,
      modelUsed,
      latencyMs,
      promptText,
      rawResponse,
      retrievedChunks,
    };
  }
}

export const firGenerationChain = new FIRGenerationChain();
export default firGenerationChain;
