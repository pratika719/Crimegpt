import { lawRetriever, CleanedLawReference } from "../retrievers/law.retriever";
import { buildLegalAnalysisPrompt } from "../prompts/legal-analysis.prompt";
import { geminiProvider } from "../providers/gemini-provider";
import { parseLegalAnalysisResult, LegalAnalysisResult } from "../types/legal-analysis.types";

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
   * @param narrative The case statement narrative.
   * @param k Number of chunks to retrieve.
   * @returns ChainOutput containing validated structured results and metadata logs.
   */
  async execute(narrative: string, k = 5): Promise<ChainOutput> {
    const startTime = Date.now();
    console.log(`🤖 [LegalAnalysisChain] Initiating chain execution...`);

    // 1. Retrieve unique law sections from PGVector
    const retrievedChunks = await lawRetriever.retrieve(narrative, k);
    console.log(`🤖 [LegalAnalysisChain] Retrieved ${retrievedChunks.length} unique legal context chunks.`);

    // 2. Build the strict prompt with context
    const promptText = buildLegalAnalysisPrompt(narrative, retrievedChunks);

    // 3. Query Gemini Flash
    const modelUsed = geminiProvider.getModelName();
    console.log(`🤖 [LegalAnalysisChain] Dispatching RAG prompt to ${modelUsed}...`);
    const rawResponse = await geminiProvider.generateJSON(promptText);

    const latencyMs = Date.now() - startTime;
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
