# CrimeGPT v2 Automated Audit

Generated at: 2026-07-01T13:30:27.374Z

## Summary

| Severity | Count |
|---|---:|
| Critical | 16 |
| Warning | 91 |
| Info | 0 |

## Findings

| Severity | File | Rule | Message |
|---|---|---|---|
| warning | `src/actions/ai-diagnostics.action.ts` | CONSOLE_LOGGING | Use structured logging instead of console statements. |
| warning | `src/actions/audit.action.ts` | CONSOLE_LOGGING | Use structured logging instead of console statements. |
| warning | `src/actions/case-activity.action.ts` | CONSOLE_LOGGING | Use structured logging instead of console statements. |
| critical | `src/actions/case-activity.action.ts` | ACTION_WITHOUT_ZOD | Mutation Server Action appears to lack Zod validation. |
| warning | `src/actions/case-metadata.action.ts` | CONSOLE_LOGGING | Use structured logging instead of console statements. |
| critical | `src/actions/case-metadata.action.ts` | ACTION_WITHOUT_ZOD | Mutation Server Action appears to lack Zod validation. |
| warning | `src/actions/case.action.ts` | CONSOLE_LOGGING | Use structured logging instead of console statements. |
| critical | `src/actions/case.action.ts` | ACTION_WITHOUT_ZOD | Mutation Server Action appears to lack Zod validation. |
| warning | `src/actions/checklist.action.ts` | CONSOLE_LOGGING | Use structured logging instead of console statements. |
| critical | `src/actions/checklist.action.ts` | ACTION_WITHOUT_ZOD | Mutation Server Action appears to lack Zod validation. |
| critical | `src/actions/document-generation.action.ts` | NO_PRISMA_IN_ACTIONS | Server Actions should call services, not Prisma directly. |
| warning | `src/actions/document-generation.action.ts` | WEAK_CATCH | Catch block may swallow errors without returning or throwing. |
| warning | `src/actions/document-generation.action.ts` | CONSOLE_LOGGING | Use structured logging instead of console statements. |
| critical | `src/actions/document-generation.action.ts` | ACTION_WITHOUT_ZOD | Mutation Server Action appears to lack Zod validation. |
| warning | `src/actions/document.action.ts` | CONSOLE_LOGGING | Use structured logging instead of console statements. |
| critical | `src/actions/document.action.ts` | ACTION_WITHOUT_ZOD | Mutation Server Action appears to lack Zod validation. |
| warning | `src/actions/evidence.action.ts` | CONSOLE_LOGGING | Use structured logging instead of console statements. |
| critical | `src/actions/evidence.action.ts` | ACTION_WITHOUT_ZOD | Mutation Server Action appears to lack Zod validation. |
| warning | `src/actions/fir.action.ts` | CONSOLE_LOGGING | Use structured logging instead of console statements. |
| critical | `src/actions/fir.action.ts` | ACTION_WITHOUT_ZOD | Mutation Server Action appears to lack Zod validation. |
| critical | `src/actions/investigation-profile.action.ts` | ACTION_WITHOUT_ZOD | Mutation Server Action appears to lack Zod validation. |
| warning | `src/actions/investigation-summary.action.ts` | CONSOLE_LOGGING | Use structured logging instead of console statements. |
| critical | `src/actions/investigation-summary.action.ts` | ACTION_WITHOUT_ZOD | Mutation Server Action appears to lack Zod validation. |
| warning | `src/actions/legal-analysis.action.ts` | CONSOLE_LOGGING | Use structured logging instead of console statements. |
| critical | `src/actions/legal-analysis.action.ts` | ACTION_WITHOUT_ZOD | Mutation Server Action appears to lack Zod validation. |
| warning | `src/actions/person.action.ts` | CONSOLE_LOGGING | Use structured logging instead of console statements. |
| critical | `src/actions/person.action.ts` | ACTION_WITHOUT_ZOD | Mutation Server Action appears to lack Zod validation. |
| warning | `src/actions/search.action.ts` | CONSOLE_LOGGING | Use structured logging instead of console statements. |
| warning | `src/ai/chains/ai-diagnostics.chain.ts` | CONSOLE_LOGGING | Use structured logging instead of console statements. |
| warning | `src/ai/chains/ai-diagnostics.chain.ts` | AI_WITHOUT_TIMEOUT | AI call appears to lack timeout/cancellation handling. |
| warning | `src/ai/chains/ai-diagnostics.chain.ts` | AI_WITHOUT_ERROR_BOUNDARY | AI provider call appears to lack explicit error handling. |
| warning | `src/ai/chains/legal-analysis.chain.ts` | CONSOLE_LOGGING | Use structured logging instead of console statements. |
| warning | `src/ai/chains/legal-analysis.chain.ts` | AI_WITHOUT_TIMEOUT | AI call appears to lack timeout/cancellation handling. |
| warning | `src/ai/chains/legal-analysis.chain.ts` | AI_WITHOUT_ERROR_BOUNDARY | AI provider call appears to lack explicit error handling. |
| warning | `src/ai/embeddings/embedding-provider.ts` | AI_WITHOUT_TIMEOUT | AI call appears to lack timeout/cancellation handling. |
| warning | `src/ai/embeddings/embedding-provider.ts` | AI_WITHOUT_ERROR_BOUNDARY | AI provider call appears to lack explicit error handling. |
| warning | `src/ai/ingestion/ingest-laws.ts` | WEAK_CATCH | Catch block may swallow errors without returning or throwing. |
| warning | `src/ai/ingestion/ingest-laws.ts` | CONSOLE_LOGGING | Use structured logging instead of console statements. |
| warning | `src/ai/ingestion/loader/ipc.loader.ts` | WEAK_CATCH | Catch block may swallow errors without returning or throwing. |
| warning | `src/ai/ingestion/loader/ipc.loader.ts` | CONSOLE_LOGGING | Use structured logging instead of console statements. |
| warning | `src/ai/ingestion/splitters/legal.splitter.ts` | CONSOLE_LOGGING | Use structured logging instead of console statements. |
| warning | `src/ai/prompts/fir-generation.prompt.ts` | AI_WITHOUT_TIMEOUT | AI call appears to lack timeout/cancellation handling. |
| warning | `src/ai/prompts/fir-generation.prompt.ts` | AI_WITHOUT_ERROR_BOUNDARY | AI provider call appears to lack explicit error handling. |
| warning | `src/ai/prompts/investigation-summary.prompt.ts` | AI_WITHOUT_TIMEOUT | AI call appears to lack timeout/cancellation handling. |
| warning | `src/ai/prompts/investigation-summary.prompt.ts` | AI_WITHOUT_ERROR_BOUNDARY | AI provider call appears to lack explicit error handling. |
| warning | `src/ai/prompts/legal-analysis.prompt.ts` | AI_WITHOUT_TIMEOUT | AI call appears to lack timeout/cancellation handling. |
| warning | `src/ai/prompts/legal-analysis.prompt.ts` | AI_WITHOUT_ERROR_BOUNDARY | AI provider call appears to lack explicit error handling. |
| warning | `src/ai/providers/gemini-provider.ts` | WEAK_CATCH | Catch block may swallow errors without returning or throwing. |
| warning | `src/ai/providers/gemini-provider.ts` | CONSOLE_LOGGING | Use structured logging instead of console statements. |
| warning | `src/ai/types/legal-analysis.types.ts` | AI_WITHOUT_TIMEOUT | AI call appears to lack timeout/cancellation handling. |
| warning | `src/ai/vector/pgvector.ts` | CONSOLE_LOGGING | Use structured logging instead of console statements. |
| critical | `src/app/api/health/route.ts` | NO_PRISMA_IN_UI | React/App surface should not access Prisma directly. |
| warning | `src/app/api/health/route.ts` | CONSOLE_LOGGING | Use structured logging instead of console statements. |
| warning | `src/app/case/[id]/page.tsx` | WEAK_CATCH | Catch block may swallow errors without returning or throwing. |
| warning | `src/app/case/[id]/page.tsx` | CONSOLE_LOGGING | Use structured logging instead of console statements. |
| warning | `src/app/page.tsx` | AI_WITHOUT_TIMEOUT | AI call appears to lack timeout/cancellation handling. |
| warning | `src/app/page.tsx` | AI_WITHOUT_ERROR_BOUNDARY | AI provider call appears to lack explicit error handling. |
| warning | `src/auth.ts` | WEAK_CATCH | Catch block may swallow errors without returning or throwing. |
| warning | `src/auth.ts` | CONSOLE_LOGGING | Use structured logging instead of console statements. |
| warning | `src/components/case/case-analysis-panel.tsx` | WEAK_CATCH | Catch block may swallow errors without returning or throwing. |
| warning | `src/components/case/case-analysis-panel.tsx` | CONSOLE_LOGGING | Use structured logging instead of console statements. |
| warning | `src/components/case/case-checklist-section.tsx` | WEAK_CATCH | Catch block may swallow errors without returning or throwing. |
| warning | `src/components/case/case-checklist-section.tsx` | CONSOLE_LOGGING | Use structured logging instead of console statements. |
| warning | `src/components/search/search-dialog.tsx` | WEAK_CATCH | Catch block may swallow errors without returning or throwing. |
| warning | `src/components/search/search-dialog.tsx` | CONSOLE_LOGGING | Use structured logging instead of console statements. |
| warning | `src/lib/pdf-export.ts` | CONSOLE_LOGGING | Use structured logging instead of console statements. |
| warning | `src/lib/prisma.ts` | CONSOLE_LOGGING | Use structured logging instead of console statements. |
| critical | `src/scripts/audit-crimegpt.ts` | NO_PRISMA_IN_ACTIONS | Server Actions should call services, not Prisma directly. |
| critical | `src/scripts/audit-crimegpt.ts` | NO_AI_PROVIDER_IN_ACTIONS | Server Actions should not call Gemini directly. |
| warning | `src/scripts/audit-crimegpt.ts` | NO_LANGCHAIN_IN_ACTIONS | Server Actions should not contain retrieval or chain orchestration. |
| warning | `src/scripts/audit-crimegpt.ts` | CONSOLE_LOGGING | Use structured logging instead of console statements. |
| warning | `src/scripts/audit-crimegpt.ts` | AI_WITHOUT_ERROR_BOUNDARY | AI provider call appears to lack explicit error handling. |
| warning | `src/scripts/check-cases.ts` | WEAK_CATCH | Catch block may swallow errors without returning or throwing. |
| warning | `src/scripts/check-cases.ts` | CONSOLE_LOGGING | Use structured logging instead of console statements. |
| warning | `src/scripts/migrate-cases.ts` | WEAK_CATCH | Catch block may swallow errors without returning or throwing. |
| warning | `src/scripts/migrate-cases.ts` | CONSOLE_LOGGING | Use structured logging instead of console statements. |
| warning | `src/scripts/test-checklist.ts` | WEAK_CATCH | Catch block may swallow errors without returning or throwing. |
| warning | `src/scripts/test-checklist.ts` | CONSOLE_LOGGING | Use structured logging instead of console statements. |
| warning | `src/scripts/test-diagnostics.ts` | WEAK_CATCH | Catch block may swallow errors without returning or throwing. |
| warning | `src/scripts/test-diagnostics.ts` | CONSOLE_LOGGING | Use structured logging instead of console statements. |
| warning | `src/scripts/test-fir.ts` | WEAK_CATCH | Catch block may swallow errors without returning or throwing. |
| warning | `src/scripts/test-fir.ts` | CONSOLE_LOGGING | Use structured logging instead of console statements. |
| warning | `src/scripts/test-fir.ts` | AI_WITHOUT_TIMEOUT | AI call appears to lack timeout/cancellation handling. |
| warning | `src/scripts/test-investigation-summary.ts` | WEAK_CATCH | Catch block may swallow errors without returning or throwing. |
| warning | `src/scripts/test-investigation-summary.ts` | CONSOLE_LOGGING | Use structured logging instead of console statements. |
| warning | `src/scripts/test-loader.ts` | WEAK_CATCH | Catch block may swallow errors without returning or throwing. |
| warning | `src/scripts/test-loader.ts` | CONSOLE_LOGGING | Use structured logging instead of console statements. |
| warning | `src/scripts/test-retrieval.ts` | WEAK_CATCH | Catch block may swallow errors without returning or throwing. |
| warning | `src/scripts/test-retrieval.ts` | CONSOLE_LOGGING | Use structured logging instead of console statements. |
| warning | `src/scripts/test-timeline.ts` | WEAK_CATCH | Catch block may swallow errors without returning or throwing. |
| warning | `src/scripts/test-timeline.ts` | CONSOLE_LOGGING | Use structured logging instead of console statements. |
| warning | `src/services/case/ai-diagnostics.service.ts` | WEAK_CATCH | Catch block may swallow errors without returning or throwing. |
| warning | `src/services/case/ai-diagnostics.service.ts` | CONSOLE_LOGGING | Use structured logging instead of console statements. |
| warning | `src/services/case/case.services.ts` | CONSOLE_LOGGING | Use structured logging instead of console statements. |
| warning | `src/services/case/legal-analysis.services.ts` | CONSOLE_LOGGING | Use structured logging instead of console statements. |
| warning | `src/services/case-metadata/case-metadata.service.ts` | CONSOLE_LOGGING | Use structured logging instead of console statements. |
| warning | `src/services/checklist/checklist.service.ts` | CONSOLE_LOGGING | Use structured logging instead of console statements. |
| warning | `src/services/document-engine/document-generator.service.ts` | WEAK_CATCH | Catch block may swallow errors without returning or throwing. |
| warning | `src/services/document-engine/document-generator.service.ts` | CONSOLE_LOGGING | Use structured logging instead of console statements. |
| warning | `src/services/document-engine/document-generator.service.ts` | AI_WITHOUT_TIMEOUT | AI call appears to lack timeout/cancellation handling. |
| warning | `src/services/document-engine/document.service.ts` | CONSOLE_LOGGING | Use structured logging instead of console statements. |
| warning | `src/services/evidence/evidence.service.ts` | CONSOLE_LOGGING | Use structured logging instead of console statements. |
| warning | `src/services/investigation-summary/investigation-summary.service.ts` | AI_WITHOUT_TIMEOUT | AI call appears to lack timeout/cancellation handling. |
| warning | `src/services/investigation-summary/investigation-summary.service.ts` | AI_WITHOUT_ERROR_BOUNDARY | AI provider call appears to lack explicit error handling. |
| warning | `src/services/pdf/pdf-export.service.ts` | CONSOLE_LOGGING | Use structured logging instead of console statements. |
| warning | `src/services/pdf/pdf-template-renderer.ts` | CONSOLE_LOGGING | Use structured logging instead of console statements. |
| warning | `src/services/person/person.service.ts` | CONSOLE_LOGGING | Use structured logging instead of console statements. |

## Notes

This audit is static and heuristic-based.

Manual review is still required for:

- authorization correctness
- case ownership checks
- prompt quality
- retrieval quality
- database indexing
- deployment readiness
