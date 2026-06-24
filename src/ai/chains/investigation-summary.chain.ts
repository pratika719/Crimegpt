import { lawRetriever, CleanedLawReference } from "../retrievers/law.retriever";
import { buildInvestigationSummaryPrompt } from "../prompts/investigation-summary.prompt";
import { geminiProvider } from "../providers/gemini-provider";
import { InvestigationSummarySchema, InvestigationSummaryOutput } from "../../schema/investigation-summary.schema";
import { UnifiedCaseContext } from "@/services/case/unified-context.service";

export interface InvestigationSummaryChainOutput {
  result: InvestigationSummaryOutput;
  modelUsed: string;
  latencyMs: number;
  promptText: string;
  rawResponse: string;
  retrievedChunks: CleanedLawReference[];
}

/**
 * Core orchestration chain for CrimeGPT Investigation Summary Generation.
 * Retrieves legal chunks from PGVector, prompts Gemini with narrative and metadata, 
 * and validates response against InvestigationSummarySchema.
 */
export class InvestigationSummaryChain {
  /**
   * Executes the RAG flow for Investigation Summary generation.
   * 
   * @param context The unified case context.
   * @param k Number of chunks to retrieve.
   * @returns InvestigationSummaryChainOutput.
   */
  async execute(
    context: UnifiedCaseContext, 
    k = 5
  ): Promise<InvestigationSummaryChainOutput> {
    const startTime = Date.now();
    console.log(`🤖 [InvestigationSummaryChain] Initiating chain execution...`);

    // 1. Retrieve unique law sections from PGVector using the narrative
    const retrievedChunks = await lawRetriever.retrieve(context.narrative, k);
    console.log(`🤖 [InvestigationSummaryChain] Retrieved ${retrievedChunks.length} unique legal context chunks.`);

    // 2. Build prompt with unified context and laws
    const promptText = buildInvestigationSummaryPrompt(context, retrievedChunks);

    // 3. Query Gemini Flash
    const modelUsed = geminiProvider.getModelName();
    console.log(`🤖 [InvestigationSummaryChain] Dispatching RAG prompt to ${modelUsed}...`);
    const { text: rawResponse } = await geminiProvider.generateJSON(promptText);

    const latencyMs = Date.now() - startTime;
    console.log(`🤖 [InvestigationSummaryChain] Model responded in ${latencyMs}ms.`);

    // 4. Parse JSON and validate against Zod schema
    let result: InvestigationSummaryOutput;
    try {
      const rawData = JSON.parse(rawResponse);
      result = InvestigationSummarySchema.parse(rawData);
      console.log(`🤖 [InvestigationSummaryChain] Structured Investigation Summary successfully validated.`);
    } catch (err: any) {
      throw new Error(`Failed to parse or validate Investigation Summary output: ${err.message}`);
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

export const investigationSummaryChain = new InvestigationSummaryChain();
export default investigationSummaryChain;
