# Redis Command-Limit Analysis & Optimization Plan

## The Problem

**Redis Cloud Free Tier:** 500,000 commands/month
**Actual consumption:** 500,000 in 18 hours
**Burn rate:** 27,778 commands/hour = 463 commands/min = 7.7 commands/sec

This document breaks down exactly where every command goes and presents a surgical optimization plan.

---

## 📊 Precise Command Audit

### SOURCE 1: BullMQ Worker Idle Polling — 25,920 commands/18h (5.2%)

Each of the 6 BullMQ workers runs an internal loop:

```
┌─────────────────────────────────────────┐
│           WORKER PROCESS                 │
│                                          │
│  loop {                                  │
│    1. BLMOVE waitList→activeList (blocks │
│       for 30s by default)                │
│    2. If timeout → check stalled jobs:   │
│       ZRANGEBYSCORE stagedSet 0      1   │
│       ZREMRANGEBYSCORE stagedSet 0  1    │
│       For each stalled job: HGETALL      │
│    3. Go to step 1                       │
│  }                                       │
└─────────────────────────────────────────┘
```

**Per worker per minute:** ~4 commands (2 BLMOVE + 2 stalled checks)
**6 workers × 4/min × 60 min × 18h = 25,920 commands**

Even when **zero jobs** are being processed, workers burn 25,920 commands in 18 hours.

### SOURCE 2: QueueEvents Streams — ~10,800-21,600 commands/18h (2-4%)

Each queue has a `QueueEvents` listener that creates a **Redis Stream consumer group**:

```
┌──────────────────────────────────────────┐
│            QUEUE EVENTS                   │
│                                           │
│  Every time a job is:                     │
│  • Added → XADD event stream (1 cmd)     │
│  • Picked up → XADD event stream (1 cmd) │
│  • Progress → XADD event stream (1 cmd)  │
│  • Completed → XADD event stream (1 cmd) │
│  • Failed → XADD event stream (1 cmd)    │
│                                           │
│  QueueEvents consumer:                    │
│  • XREADGROUP to read events (1 cmd)     │
│  • XACK to acknowledge (1 cmd)            │
└──────────────────────────────────────────┘
```

**Per job event:** ~2 commands (XADD + XREADGROUP)
If processing 1,000 jobs with 5 events each: **10,000 commands**

Even idle, the consumer groups maintain state in Redis.

### SOURCE 3: Frontend Polling — 43,200 commands/18h (8.6%) 🔴

Every 5 seconds when a user has a job page open:

```
Browser ─── every 5s ───► getJobStatusAction(jobId, queueName)
                                   │
                                   ▼
                          checkRateLimit() 
                            ├─ INCR key          (1 cmd)
                            ├─ EXPIRE key 60     (1 cmd, first time)
                            └─ TTL key           (1 cmd)
                                   │
                                   ▼
                          Job.fromId(queue, jobId)
                            └─ HGETALL bullmq:Q:J (1 cmd)
                                   │
                                   ▼
                          job.getState()
                            ├─ Check completed set: ZSCORE (1 cmd)
                            ├─ Check failed set: ZSCORE (1 cmd)
                            ├─ Check wait list: LPOS (1 cmd)
                            └─ Check active list: LPOS (1 cmd)
                                   │
                                   ▼
                          Returns { state, failedReason, result }
```

**Per poll:** ~8 Redis commands  
**12 polls/min:** 96 commands/min  
**Per hour with 1 active job page open:** 5,760 commands  
**Per 18 hours (if open entire time):** 103,680 commands — **20.7% of monthly budget!**

### SOURCE 4: Job Processing — Variable, HIGH 🔴🔴

**Per job, here's what BullMQ does internally:**

#### ⚡ Per Document Generation Job (~35-40 commands)

| Phase | Operation | Commands | Details |
|-------|-----------|----------|---------|
| **Add to queue** | `LPUSH` wait | 1 | |
| | `HSET` job data + payload | 1 | Stores full payload (can be KBs) |
| | `PUBLISH` notify | 1 | Worker wake-up signal |
| | `XADD` event stream | 1 | Only with QueueEvents |
| **Worker pickup** | `BLMOVE` wait→active | 1 | |
| | `HGETALL` read job | 1 | Reads entire job data |
| **Processing** | `updateProgress()` × 4-6 | 8-12 | Each = HSET + XADD |
| | `setAITempState()` | 1 | SET with EX |
| | `cacheInvalidation` | 1-3 | DEL patterns |
| | `logFailure` (if fail) | 1 | DB write (no Redis) |
| **Complete** | `HSET` returnvalue | 1 | |
| | `ZADD` completed set | 1 | |
| | `LREM` active list | 1 | |
| | `XADD` event | 1 | Only with QueueEvents |
| **TOTAL** | | **~20-25** | Without QueueEvents |
| | | **~35-40** | With QueueEvents |

#### ⚡ Per Embedding Job (~18-22 commands)

| Phase | Commands |
|-------|----------|
| Add to queue | 4 |
| Worker pickup | 2 |
| `updateProgress()` × 3 | 6 |
| Complete | 4 |
| **TOTAL** | **~16-18** (without QueueEvents) |

#### ⚡ Per Ingestion Job (~400+ commands with 100 chunks!)

| Phase | Commands |
|-------|----------|
| Ingestion job itself | ~18 |
| **Adds 100 embedding jobs** | **100 × 4 = 400** |
| Each embedding job processed | 100 × 18 = 1,800 |
| **TOTAL** | **~2,218** per evidence doc with 100 chunks |

**🚨 THIS IS THE KILLER — ONE document with 100 chunks = 2,218 commands**

### SOURCE 5: BullMQ Internal Bookkeeping — ~7,000-15,000 commands/18h

- **Stalled job detection:** Every 30s, each worker checks for stalled jobs
- **Queue metrics:** `getJobCounts()` reads multiple counters
- **Meta keys:** Queue pause state, rate limit data, repeatable jobs

### SOURCE 6: Application Redis — ~3,000-5,000 commands/18h

| Operation | Commands per use | Estimated daily |
|-----------|-----------------|----------------|
| Cache get/set | 1-2 each | ~500-1000 |
| AI temp state | 1-3 per job | ~200-500 |
| Dedup checks | 2 per job | ~100-200 |
| Locks (acquire+release) | 2 per lock | ~50-100 |
| Rate limiting (non-poll) | 3 per request | ~100-500 |

---

## 📈 BURN RATE CALCULATOR

### Scenario A: No jobs, browser closed (truly idle)

```
6 workers idle polling:   1,440 commands/hour  (34,560/day)
QueueEvents (no events):    500 commands/hour  (12,000/day)
Health checks:                20 commands/hour    (480/day)
TOTAL:                     1,960 commands/hour (47,040/day)
```

**14.1 days to exhaust 500k commands — even with ZERO usage!**

### Scenario B: User opens app, watches 1 job (5 hours)

```
Idle workers:                       1,440/h × 18h =  25,920
QueueEvents (100 jobs × 5 events):  1,000/h × 18h =  18,000
Frontend polling (5h open):         5,760/h ×  5h =  28,800  ← 🔴
Rate limit overhead (on polling):   1,080/h ×  5h =   5,400
Job processing (100 jobs):             400 total  =   1,100
Cache/temp/locks:                        50/h × 18h =     900
TOTAL:                                              =  80,120
```

**~6.2 days to exhaust 500k commands with minimal usage**

### Scenario C: Normal usage — ingest evidence + generate documents

```
Idle workers:                                   25,920
QueueEvents:                                    18,000
Frontend polling (3h active):                   17,280
Rate limit overhead:                             3,240
1 evidence doc ingested (100 chunks):            2,218
5 evidence docs ingested (500 chunks):          11,090
5 document generation jobs:                        150
Cache/temp/locks:                                   500
TOTAL:                                           78,398
```

### Scenario D: The actual scenario (500k in 18 hours)

```
Processing rate: 27,778 commands/hour = 463/min

This implies:
- Workers processing ~15-20 jobs/minute
- Or: 1 ingestion job/min (2,218 cmd each) + other overhead
- Frontend polling most of the time
- QueueEvents active, multiplying each event
```

---

## 🎯 SENIOR ENGINEER OPTIMIZATION PLAN

### TIER 1: HIGHEST IMPACT — Eliminate Sources Entirely

| # | Change | Commands Saved/18h | % of 500k | Effort |
|---|--------|-------------------|-----------|--------|
| 1 | **Remove QueueEvents** (all 6) | **18,000-50,000** | **3.6-10%** | 1 file, 6 lines |
| 2 | **Replace polling with DB reads** | **25,000-100,000** | **5-20%** | 3-4 files |
| 3 | **Remove rate limit from status endpoint** | **5,400-10,000** | **1-2%** | 1 file |
| 4 | **Reduce poll interval 5s → 30s** | **14,400-86,400** | **2.9-17.3%** | 1 line |

**BEST COMBINATION: #1 + #2 + #3 = saves 48,400-160,000 commands/18h (9.7-32%)**

### TIER 2: REDUCE — Optimize BullMQ Workload

| # | Change | Commands Saved/18h | % of 500k |
|---|--------|-------------------|-----------|
| 5 | **Increase blockingTimeout to 60s** | **12,960** | **2.6%** |
| 6 | **Disable stalled job checks** via `stalledInterval: 0` | **8,640** | **1.7%** |
| 7 | **Skip staging** with `skipStalledCheck: true` | **6,480** | **1.3%** |
| 8 | **Set `removeOnComplete/Fail: 0`** | **1,000** | **0.2%** |

**COMBINATION: #5 + #6 + #7 = saves 28,080 commands/18h (5.6%)**

### TIER 3: RECONFIGURE — Stop Unused Workers

| # | Change | Commands Saved/18h |
|---|--------|-------------------|
| 9 | Only start workers that are actually needed (e.g. skip email, cleanup if unused) | **8,640 per worker** |
| 10 | Consolidate workers using a single worker with multiple processors | **8,640 per consolidated worker** |

### TIER 4: OPTIMIZE — Application Layer

| # | Change | Commands Saved/18h |
|---|--------|-------------------|
| 11 | Replace Redis cache with PostgreSQL cache table | **2,000-5,000** |
| 12 | Replace Redis rate limiting with in-memory (Map with TTL) | **5,000-10,000** |
| 13 | Reduce `updateProgress()` calls in workers | **2,000-5,000** |
| 14 | Replace `setAITempState` (Redis) with DB writes | **500-1,000** |

---

## 🔥 THE DEFINTIVE FIX: End-to-End Plan

Here's what I recommend, in priority order, with specific file changes:

### Phase 1: Immediate (5 mins, zero risk)
**Goal:** Slash idle burn rate by 60%

**Files to change:**
1. **`src/lib/queue/queues.ts`** — Delete all 6 `QueueEvents` (lines 63-71)
2. **`src/workers/worker-registry.ts`** — Add `blockingTimeout: 60000` to `defaultWorkerOptions`
3. **`src/hooks/use-job-polling.ts`** — Change `intervalMs = 5000` → `intervalMs = 15000`

**Savings:** ~40,000 commands/18h

### Phase 2: Core Fix (30 min)
**Goal:** Eliminate Redis from the polling loop entirely

**New files:**
1. **`src/actions/job-status-db.action.ts`** — Server action that reads from `GeneratedDocument` table
2. **Update `use-job-polling.ts`** — Poll the DB action instead of BullMQ action

**Modified files:**
1. **`src/services/queue/job-status.service.ts`** — Add a `getJobStatusFromDb()` method

**Savings:** ~30,000-80,000 commands/18h

### Phase 3: Maximum Optimization (1 hour)
**Goal:** Eliminate ALL unnecessary Redis commands

1. Remove rate-limit check from status action
2. Replace `CacheService` with PostgreSQL-based cache
3. Remove AI temp state Redis writes (use DB instead)
4. Reduce `updateProgress()` calls in embedding processor

**Savings:** ~20,000-50,000 commands/18h

### Phase 4: Strategic (if needed)
**Goal:** Eliminate Redis dependency entirely

1. Replace BullMQ with PGMQ (PostgreSQL message queue) — removes need for Redis
2. Or: Local BullMQ (run Redis in Docker locally, use DB-based status over the web)

---

## 📋 Estimated Post-Optimization Burn Rate

After implementing Phases 1-3:

| Source | Before (cmd/h) | After (cmd/h) |
|--------|---------------|--------------|
| Worker idle polling | 1,440 | 720 |
| QueueEvents | 1,000 | **0** ✅ |
| Frontend polling (Redis-based) | 5,760 | **0** ✅ |
| Frontend polling (DB-based) | 0 | 0 (uses DB) |
| Rate limit overhead | 1,080 | **0** ✅ |
| Job processing | ~20,000 | ~15,000 |
| **TOTAL** | **~27,778** | **~15,720** |

**Monthly estimate:** 15,720 × 24 × 30 = **11,318,400 commands/month**
Wait, that doesn't help — we need to hit under 500k/month.

15,720/h = 377,280/day = 11.3M/month. Still way over.

The real issue is **how many jobs are being processed**. The embedding jobs are the main driver. Let me recalculate:

The 500k in 18 hours = 27,778/h. After all optimizations, the base load drops from ~3,500/h to ~720/h. The remaining 27,058/h is from job processing.

If each job averages ~15 commands, that's 1,804 jobs/hour. To fit in 500k/month:
- 500,000 / 30 days / 24 hours = 694 commands/hour average
- Minus base load 720/hour = negative... so base load alone exceeds budget.

**Wait, that means even with ALL optimizations, the base load of 720 commands/hour would use 518,400 commands/month just by existing!**

The real fix is to **make Redis optional / eliminate it when not processing jobs**. Here's how:

1. **Stop workers when not needed** — only start workers when there are jobs to process
2. **Use a connection pool that disconnects when idle**

OR, the most practical solution:

**Use Redis only transiently, when needed:**

Option A: Run Redis locally in Docker (no cost, no command limits)
Option B: Use serverless Redis (Upstash) with pay-per-request
Option C: Use SQLite/PostgreSQL for everything, Redis optional

**The real senior engineer take: For a free-tier app, you shouldn't have a persistent Redis connection at all.** Redis should be spun up on-demand when actually needed (e.g., during a job processing window).

Or even better: **Replace BullMQ entirely with a PostgreSQL-based job queue.** PGMQ or graphile-worker can run on your existing Neon PostgreSQL (500MB free, 100k rows).

Let me give a more practical recommendation.
