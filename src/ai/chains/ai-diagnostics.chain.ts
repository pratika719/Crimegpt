import { lawRetriever, CleanedLawReference } from "../retrievers/law.retriever";
import { buildAIDiagnosticsPrompt } from "../prompts/ai-diagnostics.prompt";
import { geminiProvider } from "../providers/gemini-provider";
import { parseAIDiagnosticsResult, AIDiagnosticsResult } from "../types/ai-diagnostics.types";
import { UnifiedCaseContext } from "@/services/case/unified-context.service";

export interface DiagnosticsChainOutput {
  result: AIDiagnosticsResult;
  modelUsed: string;
  latencyMs: number;
  promptText: string;
  rawResponse: string;
  retrievedChunks: CleanedLawReference[];
}

export class AIDiagnosticsChain {
  async execute(context: UnifiedCaseContext, k = 5): Promise<DiagnosticsChainOutput> {
    const startTime = Date.now();
    console.log(`🤖 [AIDiagnosticsChain] Initiating diagnostics chain...`);

    // 1. Retrieve unique law sections from PGVector using the narrative
    const retrievedChunks = await lawRetriever.retrieve(context.narrative, k);
    console.log(`🤖 [AIDiagnosticsChain] Retrieved ${retrievedChunks.length} legal context chunks.`);

    // 2. Build the prompt with unified context
    const promptText = buildAIDiagnosticsPrompt(context, retrievedChunks);

    // 3. Query Gemini
    const modelUsed = geminiProvider.getModelName();
    console.log(`🤖 [AIDiagnosticsChain] Dispatching diagnostics prompt to ${modelUsed}...`);
    const { text: rawResponse } = await geminiProvider.generateJSON(promptText);

    const latencyMs = Date.now() - startTime;
    console.log(`🤖 [AIDiagnosticsChain] Model responded in ${latencyMs}ms.`);

    // 4. Parse and validate
    const result = parseAIDiagnosticsResult(rawResponse);
    console.log(`🤖 [AIDiagnosticsChain] Diagnostics result successfully validated.`);

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

//can add token counting
//add error handling


export const aiDiagnosticsChain = new AIDiagnosticsChain();
export default aiDiagnosticsChain;
