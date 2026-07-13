# Redis Architecture & Free Tier Exhaustion Analysis

## Overview

CrimeGPT uses Redis Cloud (free tier ≈ **30MB memory, ~30 connections**) for two distinct purposes:
1. **BullMQ job queue** — background job orchestration (document gen, AI, embeddings, etc.)
2. **Application cache layer** — rate limiting, temp AI state, deduplication, distributed locks, general caching

The free tier is being exhausted largely by **BullMQ's Redis data retention** combined with **aggressive frontend polling**.

---

## 🗺️ Redis Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        FRONTEND (Next.js browser)                       │
│                                                                         │
│  useJobPolling() ─── every 5s ─────► getJobStatusAction()              │
│                                           │                            │
│  KeepWarm() ───── every 5min ──────► /api/warmup                      │
└───────────────────────────────────────────┬─────────────────────────────┘
                                            │
                                            ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                        NEXT.JS SERVER (Server Actions)                  │
│                                                                         │
│  Server Actions:                                                        │
│  ┌──────────────────┐  ┌───────────────────────────┐                    │
│  │ getJobStatusAction│  │ document-generation action │  ...more actions │
│  │                  │  │ & other server actions       │                  │
│  └────────┬─────────┘  └──────────┬────────────────┘                    │
│           │                       │                                     │
│   checkRateLimit()          checkRateLimit()                            │
│           │                       │                                     │
└───────────┼───────────────────────┼─────────────────────────────────────┘
            │                       │
            ▼                       ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         REDIS CLOUD (30MB free tier)                     │
│                                                                         │
│  ┌────────────────────────────────────────────────────────────────┐     │
│  │  BULLMQ — THE MAIN CULPRIT (~20-25MB of memory)                │     │
│  │                                                                │     │
│  │  bullmq:document-generation:id          (job data + payload)   │     │
│  │  bullmq:ai-generation:id                (job data + payload)    │     │
│  │  bullmq:embedding:id                    (job data + payload)   │     │
│  │  bullmq:ingestion:id                    (job data + payload)   │     │
│  │  bullmq:email:id                        (job data + payload)   │     │
│  │  bullmq:cleanup:id                      (job data + payload)   │     │
│  │                                                                │     │
│  │  bullmq:document-generation:events     (QueueEvents streams)   │     │
│  │  bullmq:ai-generation:events                                  │     │
│  │  bullmq:embedding:events                                     │     │
│  │  bullmq:ingestion:events                                     │     │
│  │  bullmq:email:events                                         │     │
│  │  bullmq:cleanup:events                                       │     │
│  │                                                                │     │
│  │  bullmq:document-generation:metrics   (BullMQ metrics data)   │     │
│  │  (similar for other 5 queues)                                 │     │
│  │                                                                │     │
│  │  bullmq:document-generation:stalled    (stalled job tracking)  │     │
│  │  (similar for other 5 queues)                                 │     │
│  │                                                                │     │
│  │  bullmq:QUEUE_NAME:id                  (repeatable jobs,       │     │
│  │                                        meta, offsets, etc.)   │     │
│  └────────────────────────────────────────────────────────────────┘     │
│                                                                         │
│  ┌────────────────────────────────────────────────────────────────┐     │
│  │  APPLICATION CACHE (~3-5MB)                                    │     │
│  │                                                                │     │
│  │  rate-limit:job-status:{userId}    (TTL: 60s)                  │     │
│  │  rate-limit:document-generation:... (TTL: varies)              │     │
│  │  cache:law-retrieval:{hash}        (TTL: varies)               │     │
│  │  cache:query-embedding:{hash}      (TTL: varies)               │     │
│  │  cache:case-dashboard:{userId}     (TTL: varies)               │     │
│  │  cache:case-detail:...             (TTL: varies)               │     │
│  │  cache:case-search:...             (TTL: varies)               │     │
│  │  cache:ai-summary:{caseId}         (TTL: varies)               │     │
│  │  temp:ai-state:{requestId}         (TTL: 900s = 15min)        │     │
│  │  dedupe:ai-request:{hash}          (TTL: 300s = 5min)         │     │
│  │  dedupe:document-generation:...    (TTL: varies)               │     │
│  │  lock:document-generation:...      (TTL: ~60s)                │     │
│  └────────────────────────────────────────────────────────────────┘     │
└─────────────────────────────────────────────────────────────────────────┘
            │                                   │
            ▼                                   ▼
┌────────────────────────────┐  ┌──────────────────────────────┐
│  WORKER PROCESS (BullMQ)    │  │  POSTGRESQL (Neon free tier)  │
│                             │  │                              │
│  Polls Redis every ~100ms   │  │  Plenty of space — 500MB     │
│  (BullMQ internal polling)  │  │  Not the bottleneck          │
│  Reads job, processes,      │  │                              │
│  writes result back to      │  │  Stores:                     │
│  Redis + PostgreSQL          │  │  - Cases, evidence, persons │
└────────────────────────────┘  │  - Generated documents       │
                                 │  - AI request logs           │
                                 │  - All persistent data       │
                                 └──────────────────────────────┘
```

---

## 🔍 Memory Consumption Breakdown

### Stage 1: BullMQ Job Retention (THE #1 CULPRIT)

BullMQ stores **every job** in Redis as a hash with keys like:
- `bullmq:{queueName}:{jobId}` — job data + payload

Each job stores:
- Job ID, name, timestamp
- **Full payload** (the `data` object — can be large for document gen with case context)
- Return value, failed reason, stacktrace
- Processing logs (if enabled)
- Progress, attemptsMade, timestamp, delay, etc.

**Conservative estimate per job:** 2-10KB depending on payload size.

**Current retention settings** (from `retry-policy.ts`):

| Queue | removeOnComplete | removeOnFail |
|-------|-----------------|--------------|
| DOCUMENT_GENERATION | `age: 3600s, count: 500` | `age: 86400s, count: 1000` |
| AI_GENERATION | `age: 3600s, count: 500` | `age: 86400s, count: 1000` |
| EMBEDDING | `age: 3600s, count: 1000` | `age: 86400s, count: 2000` |
| INGESTION | `age: 3600s, count: 1000` | `age: 86400s, count: 2000` |
| EMAIL | `age: 3600s, count: 500` | `age: 86400s, count: 1000` |
| CLEANUP | `age: 3600s, count: 500` | `age: 86400s, count: 1000` |

**This means:**
- ✅ Completed jobs stay in Redis for **1 hour** (3600s) — up to **4000 total** across all queues
- ❌ **Failed jobs stay for 24 hours** (86400s) — up to **8000 total** across all queues!

**At ~3KB avg per job, that's 36MB just for failed + completed jobs at capacity!** Your 30MB Redis fills up quickly.

### Stage 2: QueueEvents Streams (THE #2 CULPRIT)

`QueueEvents` (in `queues.ts`) creates **Redis Stream consumer groups** for each queue:
- `bullmq:{queueName}:events`

These streams store every event emitted by BullMQ (job added, completed, failed, progress, etc.). They maintain consumer groups that **grow unbounded** unless explicitly trimmed. Even with `skipVersionCheck: true`, the streams still accumulate events.

6 queues × stream data = **~5-10MB** of accumulated events over time.

### Stage 3: BullMQ Internal Metadata

Each queue has:
- **Stalled job tracking** — jobs that were picked up but never completed
- **Repeatable job records** — if you have repeatable/cron jobs
- **Queue metrics** — if BullMQ's metrics collector is active (by default it's off, but worth confirming)
- **Queue meta key** — rate limit counters, pause state, etc.

**~1-2MB** for 6 queues.

### Stage 4: Application Cache (~2-5MB total, TTL-expiring)

| Cache Type | Keys | TTL | Impact |
|------------|------|-----|--------|
| Rate limit counters | `rate-limit:*` | 60s | ~few KB, negligible |
| AI temp state | `temp:ai-state:*` | 900s (15min) | Could accumulate if many requests fail |
| Deduplication | `dedupe:*` | 300s (5min) | Negligible |
| Distributed locks | `lock:*` | ~60s | Negligible |
| General cache | `cache:*` | Varies | Depends on usage (~1-3MB) |

---

## 🔄 Polling Chain (REQUEST limit exhaustion)

The user mentioned "request limit" exhausted too. Here's the full request chain:

### Frontend Polling (per active job)

```
Browser ──every 5s──► getJobStatusAction() ──► checkRateLimit(60/min) ──► BullMQ Job.fromId() + job.getState() ──► Redis READ
```

**Per poll cycle (1 job):**
1. 1 HTTP request (Next.js server action)
2. 1 rate-limit INCR + EXPIRE + TTL (3 Redis commands)
3. 1 BullMQ `Job.fromId()` → Redis HGETALL (1 Redis command)
4. 1 `job.getState()` → Redis GET (1 Redis command)

**Total per poll: ~5 Redis commands**

**At 5s interval:** 12 polls/min × 5 commands = **60 Redis commands/min per user per job**

**The rate limit allows 60 polls/min** — so a user with 1 active job can hit the rate limit easily. But the **Redis Cloud free tier also has a connection/command limit** (typically ~1000 commands/hour or similar).

### KeepWarm Pings

Browser pings `/api/warmup` every 5 minutes, which calls:
- `EMBEDDING_SERVICE_URL/health` (HTTP to FastAPI)
- `WORKER_HEALTH_URL` /ready (HTTP to worker)

These don't directly hit Redis, but the worker's /ready endpoint does `pingRedis()`, which is 1 Redis command.

### BullMQ Workers' Internal Polling

Every BullMQ **worker** internally polls Redis on a **short interval (~100-200ms)** using `BRPOPLPUSH` or blocking list operations. Each worker:
```
Worker → Redis: BRPOP from bullmq:{queue}:wait
Worker → Redis: BLPUSH to bullmq:{queue}:active  
Worker → Redis: HSET job data updates
...
```

So you have **6 workers** all continuously polling Redis. On the free tier with limited commands, this internal BullMQ polling alone burns through your command allowance.

---

## 📊 Summary: Why Redis Free Tier Gets Exhausted

| Factor | Memory Impact | Request/Command Impact |
|--------|--------------|----------------------|
| **Failed jobs kept for 24h** | 🔴 ~15-20MB | Low |
| **Completed jobs kept for 1h** | 🟡 ~8-10MB | Low |
| **QueueEvents streams** | 🟡 ~5-10MB | Low |
| **Frontend polling every 5s** | 🟢 Negligible | 🔴 ~60 Redis commands/min per user |
| **BullMQ workers internal polling** | 🟢 Negligible | 🔴 ~600+ commands/min (6 workers) |
| **Application cache** | 🟢 ~2-5MB | 🟡 Varies |
| **BullMQ meta + stalled tracking** | 🟢 ~1-2MB | Low |

**The exhaustion cascade:**
1. Memory fills up from **accumulated completed/failed jobs** + **QueueEvents streams**
2. Redis Cloud free tier hits its memory limit (30MB)
3. Once memory is full, old keys get evicted (LRU), but BullMQ data is retained by design
4. The eviction causes **performance degradation** — reads/writes get slower
5. Eventually, Redis Cloud may throttle or disconnect

---

## 💡 Solutions (Ranked: Best → Simplest)

### Solution A (🏆 RECOMMENDED): Database-based Status Polling + Aggressive Cleanup

**Approach: Stop hitting Redis for job status. Use PostgreSQL instead. Also purge BullMQ data aggressively.**

**Part 1 — DB-based status polling:**
- Add a `status` column to the `GeneratedDocument` table (already exists in Prisma)
- Workers update `GeneratedDocument.status` when jobs complete/fail
- Frontend polls a **database query** instead of `getJobStatusAction()`
- Redis is completely removed from the polling loop

**Part 2 — Aggressive BullMQ cleanup:**
- Set `removeOnComplete: { age: 0, count: 0 }` — delete completed jobs instantly
- Set `removeOnFail: { age: 300, count: 5 }` — only keep last 5 failed jobs for 5 min
- **Remove all `QueueEvents`** — you don't need event listeners
- Set `storeJobs: false` on worker options to not store job return values in Redis

**Impact:** Redis memory drops from ~30MB+ to ~3-5MB.

---

### Solution B (Quick Win): Aggressive Purge Only

**Just modify `retry-policy.ts` and remove QueueEvents. No schema/DB changes.**

Changes needed:
1. `removeOnComplete: { age: 0, count: 0 }` for all queues
2. `removeOnFail: { age: 300, count: 5 }` for all queues  
3. Remove all 6 `QueueEvents` from `queues.ts`
4. Reduce polling interval from 5s → 15s
5. Reduce rate limit from 60/min → 20/min

**Impact:** Redis memory drops to ~5-10MB. The polling still hits Redis but less frequently.

---

### Solution C (Alternative): Switch from Redis to PostgreSQL for Everything

If you want to eliminate Redis entirely:
- Replace BullMQ with **PGMQ** (PostgreSQL message queue) or **Graphile Worker**
- Replace Redis caching with PostgreSQL or in-memory LRU cache
- Replace rate limiting with a DB-based implementation
- Replace distributed locks with PostgreSQL `SELECT ... FOR UPDATE` or advisory locks

This is the most radical change but eliminates Redis cost entirely.

---

## 🔧 Immediate Action Items (Before Deciding)

1. **Check current Redis memory usage:**
   ```bash
   # Via redis-cli
   redis-cli -u $REDIS_URL INFO MEMORY | grep used_memory_human
   
   # List largest keys
   redis-cli -u $REDIS_URL --bigkeys
   ```

2. **Purge accumulated stale data manually:**
   ```bash
   # Delete all completed jobs
   redis-cli -u $REDIS_URL EVAL "redis.call('DEL', unpack(redis.call('KEYS', 'bullmq:*:completed')))" 0
   
   # Delete QueueEvents streams
   redis-cli -u $REDIS_URL EVAL "for _,k in ipairs(redis.call('KEYS','bullmq:*:events')) do redis.call('DEL',k) end" 0
   ```

3. **Verify with `MEMORY USAGE` per key type:**
   ```bash
   redis-cli -u $REDIS_URL --bigkeys
   ```

---

## 🎯 My Recommendation

**Go with Solution A (DB-based status + aggressive cleanup)**. Here's why:

- ✅ **Eliminates Redis from the hot polling path** — every status check reads from PostgreSQL instead
- ✅ **PostgreSQL (Neon) has 500MB free** — you won't hit limits
- ✅ **Workers already update PostgreSQL** when jobs complete (they save results to DB)
- ✅ **Redis memory drops dramatically** — from ~30MB to ~3MB
- ✅ **Fewer Redis commands** — no more polling commands, no QueueEvents, fewer rate limit checks per user

If you want, I can implement Solution A for you. It involves:
1. Modifying `retry-policy.ts` for aggressive job cleanup
2. Removing `QueueEvents` from `queues.ts`
3. Creating a **database-based job status service** (reads from `GeneratedDocument` table instead of BullMQ)
4. Updating `useJobPolling` to call the DB-based action instead
5. Making workers update status in the DB (they already do this partially)
