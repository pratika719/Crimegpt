import { lawRetriever, CleanedLawReference } from "../retrievers/law.retriever";
import { buildLegalAnalysisPrompt } from "../prompts/legal-analysis.prompt";
import { getResilientAIProvider } from "../providers/provider-factory";
import { parseLegalAnalysisResult, LegalAnalysisResult } from "../types/legal-analysis.types";
import { UnifiedCaseContext } from "@/services/case/unified-context.service";

export interface ChainOutput {
  result: LegalAnalysisResult;
  modelUsed: string;
  latencyMs: number;
  promptText: string;
  rawResponse: string;
  retrievedChunks: CleanedLawReference[];
}

/**
 * Core orchestration chain for CrimeGPT Legal Analysis.
 * Executes the entire RAG pipeline from query to retrieval, prompting, generation, and validation.
 */
export class LegalAnalysisChain {
  /**
   * Executes the RAG flow for legal analysis.
   * 
   * @param context The unified case context.
   * @param k Number of chunks to retrieve.
   * @returns ChainOutput containing validated structured results and metadata logs.
   */
  async execute(context: UnifiedCaseContext, k = 5): Promise<ChainOutput> {
    console.log(`🤖 [LegalAnalysisChain] Initiating chain execution...`);

    // 1. Retrieve unique law sections from PGVector using the narrative
    const retrievedChunks = await lawRetriever.retrieve(context.narrative, k);
    console.log(`🤖 [LegalAnalysisChain] Retrieved ${retrievedChunks.length} unique legal context chunks.`);

    // 2. Build the strict prompt with unified context
    const promptText = buildLegalAnalysisPrompt(context, retrievedChunks);

    // 3. Query Gemini Flash
    const provider = getResilientAIProvider();
    const modelUsed = `${provider.name}:${provider.model}`;
    console.log(`🤖 [LegalAnalysisChain] Dispatching RAG prompt to ${modelUsed}...`);
    const aiResult = await provider.generateJSON<unknown>({
      userPrompt: promptText,
      temperature: 0.1,
      maxTokens: Number(process.env.AI_MAX_OUTPUT_TOKENS ?? 4_000),
    });
    const rawResponse = JSON.stringify(aiResult.data);

    const latencyMs = aiResult.latencyMs;
    console.log(`🤖 [LegalAnalysisChain] Model responded in ${latencyMs}ms.`);

    // 4. Parse JSON and validate against Zod schema
    const result = parseLegalAnalysisResult(rawResponse);
    console.log(`🤖 [LegalAnalysisChain] Structured result successfully validated.`);

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

export const legalAnalysisChain = new LegalAnalysisChain();
export default legalAnalysisChain;
