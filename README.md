# CrimeGPT: AI-Powered Case Intelligence Platform

CrimeGPT is a next-generation backend-engineered legal intelligence system designed for law enforcement agencies, investigators, and legal professionals. It leverages advanced Retrieval-Augmented Generation (RAG) to automate incident narrative ingestion, perform semantic search against legal structures, draft compliant documents (such as FIRs and Investigation Summaries), and generate detailed compliance audit trails.

---

## 🚀 Key Features

* **AI Legal Analysis**: Evaluates case narratives against retrieved statutory laws to compile structured offense assessments and legal section recommendations.
* **Semantic Legal RAG**: Implements local HuggingFace MiniLM vector embeddings coupled with a PostgreSQL `pgvector` store to search legal databases.
* **Compliant Document Generation**: Dynamically compiles and versions formal legal documents (FIRs, Remand Requests, Case Diaries) backed by strict schema validation.
* **Granular Data Isolation**: Secures user case files through a strict repository-level isolation layer based on active Google OAuth sessions.
* **Compliance Audit Logs**: Captures and logs every database mutation and document edit to compile an immutable investigation trail.

---

## 🛠️ Technology Stack

* **Framework**: Next.js 15 (App Router, Server Actions)
* **Language**: TypeScript / React 19
* **Database**: Neon Serverless PostgreSQL with `pgvector`
* **ORM**: Prisma ORM
* **Auth**: NextAuth v5 (Auth.js) with Google OAuth 2.0
* **AI & Embeddings**: Google Gemini 1.5 Flash (via LangChain), Local MiniLM Embeddings (384 Dimensions)
* **Styling**: Tailwind CSS & Lucide Icons

---

## 📖 Collaborator Onboarding & Architecture

If you are joining the team as a collaborator, please read the complete onboarding guide:

👉 **[COLLABORATOR.md](file:///d:/crimegpt/COLLABORATOR.md)**

This guide covers:
1. **Detailed Architecture & Mermaid Diagrams**
2. **Directory Structures**
3. **Core Engineering Guidelines (User scoping & DB pool singleton lifecycle)**
4. **Local Setup & Environment Configurations**
5. **Running Standalone Test Scripts**

---

## 💻 Quick Start

To launch the project locally:

1. Setup your environment variables in `.env` (refer to the guide).
2. Generate the Prisma client:
   ```bash
   npm run postinstall
   ```
3. Run the development server:
   ```bash
   npm run dev
   ```
4. Access the portal at `http://localhost:3000`.

---

*Classified Law Enforcement Sensitive. Designed and built with enterprise security compliance.*
