import { lawRetriever, CleanedLawReference } from "../retrievers/law.retriever";
import { buildAIDiagnosticsPrompt } from "../prompts/ai-diagnostics.prompt";
import { getResilientAIProvider } from "../providers/provider-factory";
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
    console.log(`🤖 [AIDiagnosticsChain] Initiating diagnostics chain...`);

    // 1. Retrieve unique law sections from PGVector using the narrative
    const retrievedChunks = await lawRetriever.retrieve(context.narrative, k);
    console.log(`🤖 [AIDiagnosticsChain] Retrieved ${retrievedChunks.length} legal context chunks.`);

    // 2. Build the prompt with unified context
    const promptText = buildAIDiagnosticsPrompt(context, retrievedChunks);

    // 3. Query Gemini
    const provider = getResilientAIProvider();
    const modelUsed = `${provider.name}:${provider.model}`;
    console.log(`🤖 [AIDiagnosticsChain] Dispatching diagnostics prompt to ${modelUsed}...`);
    const aiResult = await provider.generateJSON<unknown>({
      userPrompt: promptText,
      temperature: 0.1,
      maxTokens: Number(process.env.AI_MAX_OUTPUT_TOKENS ?? 4_000),
    });
    const rawResponse = JSON.stringify(aiResult.data);

    const latencyMs = aiResult.latencyMs;
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
