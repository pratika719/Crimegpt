# CrimeGPT v2 Automated Audit

Generated at: 2026-07-10T10:06:50.834Z

## Summary

| Severity | Count |
|---|---:|
| Critical | 0 |
| Warning | 82 |
| Info | 0 |

## Findings

| Severity | File | Rule | Message |
|---|---|---|---|
| warning | `src/actions/ai-diagnostics.action.ts` | CONSOLE_LOGGING | Use structured logging instead of console statements. |
| warning | `src/actions/audit.action.ts` | CONSOLE_LOGGING | Use structured logging instead of console statements. |
| warning | `src/actions/case-metadata.action.ts` | WEAK_CATCH | Catch block may swallow errors without returning or throwing. |
| warning | `src/actions/case-metadata.action.ts` | CONSOLE_LOGGING | Use structured logging instead of console statements. |
| warning | `src/actions/case.action.ts` | WEAK_CATCH | Catch block may swallow errors without returning or throwing. |
| warning | `src/actions/case.action.ts` | CONSOLE_LOGGING | Use structured logging instead of console statements. |
| warning | `src/actions/checklist.action.ts` | WEAK_CATCH | Catch block may swallow errors without returning or throwing. |
| warning | `src/actions/checklist.action.ts` | CONSOLE_LOGGING | Use structured logging instead of console statements. |
| warning | `src/actions/document-generation.action.ts` | WEAK_CATCH | Catch block may swallow errors without returning or throwing. |
| warning | `src/actions/document-generation.action.ts` | CONSOLE_LOGGING | Use structured logging instead of console statements. |
| warning | `src/actions/document.action.ts` | WEAK_CATCH | Catch block may swallow errors without returning or throwing. |
| warning | `src/actions/document.action.ts` | CONSOLE_LOGGING | Use structured logging instead of console statements. |
| warning | `src/actions/evidence.action.ts` | WEAK_CATCH | Catch block may swallow errors without returning or throwing. |
| warning | `src/actions/evidence.action.ts` | CONSOLE_LOGGING | Use structured logging instead of console statements. |
| warning | `src/actions/investigation-profile.action.ts` | WEAK_CATCH | Catch block may swallow errors without returning or throwing. |
| warning | `src/actions/investigation-profile.action.ts` | CONSOLE_LOGGING | Use structured logging instead of console statements. |
| warning | `src/actions/job-status.actions.ts` | WEAK_CATCH | Catch block may swallow errors without returning or throwing. |
| warning | `src/actions/person.action.ts` | WEAK_CATCH | Catch block may swallow errors without returning or throwing. |
| warning | `src/actions/person.action.ts` | CONSOLE_LOGGING | Use structured logging instead of console statements. |
| warning | `src/actions/search.action.ts` | CONSOLE_LOGGING | Use structured logging instead of console statements. |
| warning | `src/ai/chains/ai-diagnostics.chain.ts` | CONSOLE_LOGGING | Use structured logging instead of console statements. |
| warning | `src/ai/chains/ai-diagnostics.chain.ts` | AI_WITHOUT_TIMEOUT | AI call appears to lack timeout/cancellation handling. |
| warning | `src/ai/chains/ai-diagnostics.chain.ts` | AI_WITHOUT_ERROR_BOUNDARY | AI provider call appears to lack explicit error handling. |
| warning | `src/ai/chains/legal-analysis.chain.ts` | CONSOLE_LOGGING | Use structured logging instead of console statements. |
| warning | `src/ai/chains/legal-analysis.chain.ts` | AI_WITHOUT_TIMEOUT | AI call appears to lack timeout/cancellation handling. |
| warning | `src/ai/chains/legal-analysis.chain.ts` | AI_WITHOUT_ERROR_BOUNDARY | AI provider call appears to lack explicit error handling. |
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
| warning | `src/ai/types/legal-analysis.types.ts` | AI_WITHOUT_TIMEOUT | AI call appears to lack timeout/cancellation handling. |
| warning | `src/ai/vector/pgvector.ts` | CONSOLE_LOGGING | Use structured logging instead of console statements. |
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
| warning | `src/env.ts` | CONSOLE_LOGGING | Use structured logging instead of console statements. |
| warning | `src/env.ts` | AI_WITHOUT_TIMEOUT | AI call appears to lack timeout/cancellation handling. |
| warning | `src/env.ts` | AI_WITHOUT_ERROR_BOUNDARY | AI provider call appears to lack explicit error handling. |
| warning | `src/lib/cache/cache.ts` | WEAK_CATCH | Catch block may swallow errors without returning or throwing. |
| warning | `src/lib/cache/cache.ts` | CONSOLE_LOGGING | Use structured logging instead of console statements. |
| warning | `src/lib/logger.ts` | AI_WITHOUT_TIMEOUT | AI call appears to lack timeout/cancellation handling. |
| warning | `src/lib/logger.ts` | AI_WITHOUT_ERROR_BOUNDARY | AI provider call appears to lack explicit error handling. |
| warning | `src/lib/pdf-export.ts` | CONSOLE_LOGGING | Use structured logging instead of console statements. |
| warning | `src/lib/prisma.ts` | CONSOLE_LOGGING | Use structured logging instead of console statements. |
| warning | `src/lib/queue/bullmq-connection.ts` | CONSOLE_LOGGING | Use structured logging instead of console statements. |
| warning | `src/lib/redis/redis.ts` | CONSOLE_LOGGING | Use structured logging instead of console statements. |
| warning | `src/lib/worker/worker-concurrency.ts` | AI_WITHOUT_TIMEOUT | AI call appears to lack timeout/cancellation handling. |
| warning | `src/lib/worker/worker-concurrency.ts` | AI_WITHOUT_ERROR_BOUNDARY | AI provider call appears to lack explicit error handling. |
| warning | `src/services/ai/ai-observability.service.ts` | WEAK_CATCH | Catch block may swallow errors without returning or throwing. |
| warning | `src/services/case/ai-diagnostics.service.ts` | CONSOLE_LOGGING | Use structured logging instead of console statements. |
| warning | `src/services/case/legal-analysis.services.ts` | CONSOLE_LOGGING | Use structured logging instead of console statements. |
| warning | `src/services/case-metadata/case-metadata.service.ts` | CONSOLE_LOGGING | Use structured logging instead of console statements. |
| warning | `src/services/checklist/checklist.service.ts` | CONSOLE_LOGGING | Use structured logging instead of console statements. |
| warning | `src/services/document-engine/document-generator.service.ts` | WEAK_CATCH | Catch block may swallow errors without returning or throwing. |
| warning | `src/services/document-engine/document.service.ts` | CONSOLE_LOGGING | Use structured logging instead of console statements. |
| warning | `src/services/evidence/evidence.service.ts` | CONSOLE_LOGGING | Use structured logging instead of console statements. |
| warning | `src/services/investigation-summary/investigation-summary.service.ts` | AI_WITHOUT_TIMEOUT | AI call appears to lack timeout/cancellation handling. |
| warning | `src/services/investigation-summary/investigation-summary.service.ts` | AI_WITHOUT_ERROR_BOUNDARY | AI provider call appears to lack explicit error handling. |
| warning | `src/services/pdf/pdf-export.service.ts` | CONSOLE_LOGGING | Use structured logging instead of console statements. |
| warning | `src/services/pdf/pdf-template-renderer.ts` | CONSOLE_LOGGING | Use structured logging instead of console statements. |
| warning | `src/services/queue/job-status.service.ts` | WEAK_CATCH | Catch block may swallow errors without returning or throwing. |
| warning | `src/workers/document-generator.processor.ts` | WEAK_CATCH | Catch block may swallow errors without returning or throwing. |
| warning | `src/workers/document-generator.processor.ts` | AI_WITHOUT_TIMEOUT | AI call appears to lack timeout/cancellation handling. |
| warning | `src/workers/embedding.processor.ts` | WEAK_CATCH | Catch block may swallow errors without returning or throwing. |
| warning | `src/workers/index.ts` | WEAK_CATCH | Catch block may swallow errors without returning or throwing. |
| warning | `src/workers/ingestion.processor.ts` | WEAK_CATCH | Catch block may swallow errors without returning or throwing. |

## Notes

This audit is static and heuristic-based.

Manual review is still required for:

- authorization correctness
- case ownership checks
- prompt quality
- retrieval quality
- database indexing
- deployment readiness
