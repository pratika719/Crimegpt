# Groq/Llama document-generation migration

## Why this changed

CrimeGPT document generation previously depended directly on Gemini and could multiply quota failures through provider retries and BullMQ attempts. The generation path now uses a provider-neutral contract, Groq-hosted Llama 3.3 70B as the default, and an optional single Gemini fallback.

## Architecture

The existing flow is preserved:

`Server Action -> request service -> BullMQ -> document worker -> DocumentGeneratorService -> ResilientAIProvider -> PostgreSQL`

`AITextProvider` owns the stable text/JSON contract and result metadata. `GroqLlamaProvider` calls the OpenAI-compatible `/chat/completions` endpoint with `fetch`. `GeminiTextProvider` adapts the existing Gemini integration. `ResilientAIProvider` permits at most two primary calls and one fallback call.

PostgreSQL remains the source of truth. Redis remains responsible for BullMQ, locks, limits, and temporary progress. Provider calls are not made by the document-generation Server Action.

## Configuration

```dotenv
AI_PROVIDER=groq
AI_FALLBACK_PROVIDER=gemini
ENABLE_AI_FALLBACK=true

GROQ_API_KEY=
GROQ_MODEL=llama-3.3-70b-versatile
GROQ_BASE_URL=https://api.groq.com/openai/v1
GROQ_REQUEST_TIMEOUT_MS=60000

GEMINI_API_KEY=
GEMINI_MODEL=gemini-2.0-flash

AI_MAX_CONTEXT_CHARS=50000
AI_MAX_OUTPUT_TOKENS=4000
AI_DOCUMENT_DAILY_LIMIT=5
AI_REGENERATE_DAILY_LIMIT=2
LAW_RETRIEVAL_TOP_K=4
```

The primary key is required for the selected provider. A fallback key is required only when fallback is enabled for that provider. Defaults are safe for production, but secrets must be supplied through the deployment secret manager.

## Reliability behavior

- JSON is requested with a strict JSON-only contract and parsed from plain, fenced, or safely isolated object/array responses.
- Registered Zod schemas remain the final document contract. Invalid output never reaches PostgreSQL or the UI.
- Quota, auth, and configuration failures are not retried on the same provider.
- Transient timeouts, short rate limits, network failures, and 5xx responses may receive one same-provider retry.
- Fallback is attempted once for provider-level failures. Validation/application/database/Redis failures do not trigger fallback.
- The maximum provider-call budget is three: two primary calls and one fallback call.
- Document-generation BullMQ attempts are one so provider retries cannot multiply across queue retries. Queue delivery remains durable; idempotency and Redis locking remain unchanged.

## Prompt and latency changes

All document requests include Indian legal-drafting scope, factual grounding, anti-hallucination rules, missing-data behavior, a legal caution, and a strict JSON contract. Retrieval defaults to four law chunks. Context is capped at 50,000 characters; deterministic trimming preserves the high-priority beginning and the JSON schema tail, and truncation is recorded in telemetry.

Prompts, full retrieved chunks, generated documents, API keys, endpoints, and raw provider error bodies are not written to operational logs. `AIRequestLog.modelUsed` stores `provider:model`; token metadata also records fallback and context-truncation state without requiring a database migration.

## Deployment

1. Add the Groq secret and the environment values above to the app and worker deployments.
2. Keep the Gemini secret only when fallback is enabled.
3. Deploy the worker and app from the same revision.
4. Confirm Redis/PostgreSQL readiness and that the document worker is registered.
5. Generate a low-risk FIR in staging, verify `groq:llama-3.3-70b-versatile` in `AIRequestLog.modelUsed`, then verify a mocked fallback.
6. Roll out to production and monitor latency, error category, fallback use, and token counts.

## Manual checklist

- [ ] Groq generates FIR and charge sheet documents.
- [ ] Plain and fenced JSON parse successfully.
- [ ] Persistent invalid JSON fails with a clean message after bounded calls.
- [ ] Groq quota/rate-limit/outage behavior remains within the three-call budget.
- [ ] Gemini fallback records `fallbackUsed=true` and the Gemini model.
- [ ] Missing victim/accused and an existing document do not call a provider.
- [ ] `forceRegenerate=true` creates a new queued generation within the regeneration limit.
- [ ] The UI polls every five seconds and exposes no raw provider error.

## Rollback

No code rollback is required. Set:

```dotenv
AI_PROVIDER=gemini
ENABLE_AI_FALLBACK=false
```

Keep `GEMINI_API_KEY` configured and restart both app and worker processes. Re-enable Groq later by restoring the primary/fallback variables.
