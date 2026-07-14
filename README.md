# CrimeGPT: Enterprise-Grade AI-Powered Case Intelligence Platform

[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue?logo=typescript)](https://www.typescriptlang.org/)
[![Next.js 15](https://img.shields.io/badge/Next.js-15.5-black?logo=next.js)](https://nextjs.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.110-009688?logo=fastapi)](https://fastapi.tiangolo.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?logo=postgresql)](https://www.postgresql.org/)
[![Redis](https://img.shields.io/badge/Redis-7-DC382D?logo=redis)](https://redis.io/)
[![Docker](https://img.shields.io/badge/Docker-Orchestrated-2496ED?logo=docker)](https://www.docker.com/)

**CrimeGPT** is a production-ready, backend-engineered legal intelligence system built for law enforcement agencies, private investigators, and legal professionals. It automates incident narrative ingestion, performs fast semantic search against legal structures, drafts legally compliant documents (such as FIRs, Case Diaries, and Remand Requests), and compiles strict compliance audit trails.

> 🌐 **Live Demo Portal:** [crimegpt-eight.vercel.app](https://crimegpt-eight.vercel.app/)

---

## 🏗️ Architectural Overview & System Flow

CrimeGPT follows a strict **Controller-Service-Repository** pattern. It decouples incoming requests from business logic, database queries, and AI pipelines to ensure high reliability, security, and testability.

```mermaid
graph TD
    A[Frontend: Next.js Views / React 19] -->|Invokes Server Actions| B[Controller Layer: src/actions]
    B -->|Authenticates & Scopes| C[Service Layer: src/services]
    C -->|Orchestrates DB Mutations| D[Repository Layer: src/repositories]
    C -->|Pushes Heavy Tasks| E[BullMQ Queue Manager]
    E -->|Redis Queue Store| F[BullMQ Worker Service]
    C -->|Queries Context| G[AI Engine: src/ai]
    G -->|Similarity Search| H[(pgvector Store / Neon DB)]
    G -->|Generates Diagnostics| I[Google Gemini API]
    F -->|Process Ingestion / Document Generation| D
    F -->|Calls Embedding API| J[FastAPI Local Embedding Service]
    D -->|Executes SQL via Prisma| H
```

### Decoupled Service Architecture

- **Client / View Layer (`src/app`)**: Powered by React 19 and Next.js App Router, using Server Actions to handle client requests securely without exposing raw API endpoints.
- **Controller / Action Layer (`src/actions`)**: Validates input schemas using **Zod**, parses active user sessions, extracts the authenticated `userId`, and routes parameters to the business layer.
- **Service Layer (`src/services`)**: Implements application-specific logic, manages transaction limits, coordinates multiple repository updates, and triggers background processing.
- **Repository Layer (`src/repositories`)**: Encapsulates all SQL statements and Prisma operations. Strictly enforces tenant-level database scoping.
- **Asynchronous Worker Layer (`src/workers`)**: Independent service consuming jobs via **BullMQ** to process intensive vector computations and document compilation out-of-band.

---

## 🛠️ Key Technical Features & Engineering Highlights

### 1. High-Performance Local Semantic RAG Pipeline
* **Local Embedding Computation**: To minimize latency and API usage costs, embeddings are processed on-premise using a custom Python **FastAPI microservice** loading the HuggingFace `sentence-transformers/all-MiniLM-L6-v2` model. This generates **384-dimensional** normalized vector vectors.
* **Vector Storage**: Employs Serverless Neon PostgreSQL with the `pgvector` extension, queryable directly through raw Prisma SQL commands.
* **Context Optimization**: Implements a custom `DeduplicatedVectorStoreRetriever` that fetches $k \times 2$ similarity candidates and filters out duplicate or overlapping text segments to preserve LLM context windows.

### 2. Robust Asynchronous Task Processing (BullMQ & Redis)
* **Out-of-Band Compilation**: Complex document generations (e.g., FIRs, Charge Sheets) and asset vectorizations are offloaded from the Next.js server to an isolated node worker utilizing **BullMQ** backed by **Redis**.
* **Resilience & Fault Tolerance**: Jobs are configured with exponential backoff retry strategies to handle transient AI provider API or database connection rate limits.
* **Job Telemetry**: A custom, lightweight `JobStatus` table in PostgreSQL tracks progress states (`pending`, `active`, `completed`, `failed`), providing reactive status polling for front-end progress indicators.

### 3. Immutable Security & Scope Scoping
* **Tenant Isolation**: To guarantee that sensitive case information never leaks between users, all repository queries are rigidly scoped by the active Google OAuth session ID (`userId`).
* **Connection Stability**: Utilizes a persistent PG pool and Prisma Client singleton cached on `globalThis` to prevent connection exhaustion during Next.js hot-reloads—crucial when running on serverless databases with strict connection limits.
* **Input Hardening**: Comprehensive input vetting via **Zod** schema validations at all Server Action ingress points.

### 4. Enterprise-Grade Telemetry & Deep Monitoring
* **Structured Logging**: Implements JSON logging using **Pino** and **Pino-Pretty** to format warnings, critical exceptions, and query latencies.
* **Self-Healing Health Checks**: Exposes a deep health endpoint (`/api/health/deep`) that checks connection latency and status for Neon DB, Redis, BullMQ queue connectivity, pgvector extension availability, FastAPI embedding services, and Gemini API reachability.

---

## ⚙️ Technology Stack

| Layer | Technologies |
| :--- | :--- |
| **Core Framework** | Next.js 15.5 (App Router, Server Actions) |
| **Runtime & Language** | Node.js (Node 20+) & TypeScript |
| **Frontend UI** | React 19, Tailwind CSS, Lucide Icons, Shadcn UI |
| **Databases** | Neon Serverless PostgreSQL, Redis (BullMQ queue store) |
| **ORM / Data Access**| Prisma ORM & raw pg pool clients |
| **AI / NLP** | Google Gemini 1.5 Flash (via LangChain), FastAPI + SentenceTransformers |
| **Queueing System** | BullMQ & ioredis |
| **Authentication** | NextAuth v5 (Auth.js) with Google OAuth 2.0 |
| **Testing** | Vitest for unit & integration testing |
| **Log Management** | Pino & Pino-Pretty |
| **Containerization** | Docker, Docker-Compose (Multi-stage builds) |

---

## 📁 Repository Structure

```bash
crimegpt/
├── prisma/                  # Database migration schemas
├── embedding-service/      # Python FastAPI HuggingFace embedding engine
├── public/                  # Static assets & icons
├── src/
│   ├── app/                 # Next.js pages, routing layouts & client views
│   ├── actions/             # Server Actions (Controller endpoints)
│   ├── services/            # Core business logic layer
│   ├── repositories/        # Database access layer (scoped queries)
│   ├── ai/                  # RAG, chains, prompt templates & indexing
│   │   ├── chains/          # LangChain orchestrations
│   │   ├── embeddings/      # Embedding service integrations
│   │   ├── ingestion/       # Vector database seeder scripts
│   │   └── vector/          # Vector store initializers
│   ├── lib/                 # Singletons (db connection pools, redis, pino logger)
│   ├── scripts/             # Diagnostic, seed, and status checking tools
│   ├── types/               # TypeScript type definitions and DTOs
│   └── workers/             # BullMQ consumer processes
├── Dockerfile               # Production Dockerfile for Web App
├── Dockerfile.worker        # Production Dockerfile for BullMQ Worker
└── docker-compose.yml       # Dev/Prod multi-container orchestrator
```

---

## 🚀 Getting Started

### Local Installation

#### 1. Clone the repository
```bash
git clone https://github.com/yourusername/crimegpt.git
cd crimegpt
```

#### 2. Set Up Environment Variables
Create a `.env` file in the root directory:
```env
DATABASE_URL="postgresql://crimegpt:crimegpt@localhost:5434/crimegpt?schema=public"
REDIS_URL="redis://localhost:6381"
GEMINI_API_KEY="your-gemini-api-key"
AUTH_SECRET="a-highly-secure-jwt-secret-string"
AUTH_URL="http://localhost:3000"

# Google OAuth Credentials
AUTH_GOOGLE_ID="google-client-id"
AUTH_GOOGLE_SECRET="google-client-secret"

# Embedding Provider
EMBEDDING_PROVIDER="fastapi"
EMBEDDING_SERVICE_URL="http://localhost:8000"

# Diagnostics / API Keys
HEALTHCHECK_SECRET="your-health-secret"
```

#### 3. Spin Up Supporting Services (Docker)
This starts PostgreSQL (with pgvector) and Redis:
```bash
docker compose up -d postgres redis
```

#### 4. Run the Embedding Service Locally
Navigate to the `embedding-service` folder, create a python virtual environment, install dependencies, and start FastAPI:
```bash
cd embedding-service
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

#### 5. Install Node Dependencies & Run Database Migrations
```bash
cd ..
npm install
npm run postinstall  # Generates Prisma client
npx prisma db push   # Syncs database schema
```

#### 6. Ingest Statutory Law Data into the Vector DB
```bash
npm run ingest:laws
```

#### 7. Launch Development Servers
Start the main Next.js portal and the background worker:
```bash
# Terminal 1: Run Next.js Dev Server
npm run dev

# Terminal 2: Run BullMQ Worker
npm run worker:dev
```
Open [http://localhost:3000](http://localhost:3000) to view the portal.

---

## 🐳 Microservices Deployment (Docker Compose)

For production staging, you can build and start all containers (Web Portal, Worker service, FastAPI Embedding API, Database, and Redis Cache) using the following orchestrations:

```bash
# Build and run the entire suite in the background
npm run docker:up

# Check runtime logs
npm run docker:logs

# Tear down the stack
npm run docker:down
```

---

## 🧪 Testing & Developer Tooling

CrimeGPT comes with comprehensive developer test utilities:

```bash
# Run unit & integration test suites
npm run test

# Check database case counts
npx tsx src/scripts/check-cases.ts

# Test LLM semantic vector retrievals
npm run test-retrieval

# Verify active queue counts in Redis
npm run queue:check
```

---

*🔒 Designed for Enterprise Security and Legal Compliance. Untracked architectural design artifacts and audits are maintained locally under `/docs/`.*
