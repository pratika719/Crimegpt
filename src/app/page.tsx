import Link from "next/link";
import Image from "next/image";
import { auth } from "@/auth";
import { 
  ShieldAlert, 
  Terminal, 
  Database, 
  Brain, 
  Cpu, 
  ArrowRight, 
  CheckCircle2, 
  FileText, 
  History, 
  Lock,
  GitBranch
} from "lucide-react";

export const metadata = {
  title: "CrimeGPT - AI-Powered Case Intelligence Platform",
  description: "Next-generation legal analysis, RAG-powered FIR generation, and compliance auditing for law enforcement and legal professionals.",
};

export default async function LandingPage() {
  const session = await auth();
  const isLoggedIn = !!session?.user?.id;

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-50 font-sans antialiased overflow-x-hidden select-none">
      {/* Dynamic Background Mesh Grid */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1f293710_1px,transparent_1px),linear-gradient(to_bottom,#1f293710_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]"></div>

      {/* Glow Elements */}
      <div className="absolute top-[-10%] left-[20%] w-[600px] h-[600px] bg-teal-500/10 rounded-full blur-3xl opacity-50 pointer-events-none"></div>
      <div className="absolute top-[20%] right-[-10%] w-[500px] h-[500px] bg-indigo-500/10 rounded-full blur-3xl opacity-30 pointer-events-none"></div>

      {/* 1. Header/Navigation */}
      <header className="relative border-b border-zinc-900 bg-zinc-950/80 backdrop-blur-md z-50 sticky top-0">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-500/10 border border-teal-500/30 text-teal-400">
              <ShieldAlert className="h-4.5 w-4.5" />
            </div>
            <div>
              <span className="font-semibold text-sm tracking-tight block">CrimeGPT</span>
              <span className="text-[10px] text-zinc-500 font-mono leading-none block">Intelligence Engine</span>
            </div>
          </div>

          <nav className="hidden md:flex items-center gap-8 text-xs font-medium text-zinc-400">
            <a href="#features" className="hover:text-zinc-200 transition-colors">Features</a>
            <a href="#workflow" className="hover:text-zinc-200 transition-colors">AI Workflow</a>
            <a href="#stack" className="hover:text-zinc-200 transition-colors">Technology</a>
            <a href="#architecture" className="hover:text-zinc-200 transition-colors">Architecture</a>
          </nav>

          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-1.5 rounded-full border border-zinc-900 bg-zinc-900/30 px-3 py-1 text-[10px] font-mono font-medium text-zinc-400">
              <span className="h-1.5 w-1.5 rounded-full bg-teal-500 animate-pulse"></span>
              <span>Platform v1.2 Active</span>
            </div>
            <Link
              href={isLoggedIn ? "/case" : "/login"}
              className="rounded-lg bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 hover:border-zinc-700 text-zinc-200 px-4 py-1.5 text-xs font-semibold shadow-sm transition-all"
            >
              {isLoggedIn ? "Dashboard" : "Log In"}
            </Link>
          </div>
        </div>
      </header>

      {/* 2. Hero Section */}
      <section className="relative pt-24 pb-16 px-6 text-center max-w-5xl mx-auto space-y-8 z-10">
        <div className="inline-flex items-center gap-2 rounded-full border border-teal-500/30 bg-teal-500/5 px-3 py-1 text-xs text-teal-400 font-mono">
          <Brain className="h-3.5 w-3.5" />
          <span>Cognitive Legal Reasoning Engine</span>
        </div>

        <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-b from-zinc-50 via-zinc-100 to-zinc-400 leading-tight">
          Next-Generation AI <br/>
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-indigo-500">Case Dossier Intelligence</span>
        </h1>

        <p className="max-w-2xl mx-auto text-sm sm:text-base text-zinc-400 leading-relaxed">
          Accelerate investigations, analyze narratives, check legal parameters, and draft compliant reports. Powered by custom RAG pipelines, verified through detailed compliance logs, and fully secured at user-level.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
          <Link
            href={isLoggedIn ? "/case" : "/login"}
            className="group inline-flex items-center gap-2 rounded-xl bg-teal-500 hover:bg-teal-400 text-zinc-950 px-5 py-3 text-sm font-bold shadow-lg transition-all cursor-pointer shadow-teal-500/10"
          >
            <span>{isLoggedIn ? "Go to Dashboard" : "Start Investigation"}</span>
            <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
          </Link>
          <a
            href="#features"
            className="inline-flex items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900/30 hover:bg-zinc-900/80 text-zinc-300 px-5 py-3 text-sm font-semibold transition-all"
          >
            <span>Explore Features</span>
          </a>
        </div>
      </section>

      {/* 3. Product Demo */}
      <section className="relative max-w-6xl mx-auto px-6 pb-24 z-10">
        <div className="relative rounded-2xl border border-zinc-800/80 bg-zinc-900/20 backdrop-blur-sm p-2 shadow-2xl overflow-hidden group">
          {/* Glass Bar */}
          <div className="flex items-center gap-1.5 px-4 py-2 border-b border-zinc-900/50 bg-zinc-950/40 rounded-t-xl">
            <div className="h-2.5 w-2.5 rounded-full bg-zinc-800"></div>
            <div className="h-2.5 w-2.5 rounded-full bg-zinc-800"></div>
            <div className="h-2.5 w-2.5 rounded-full bg-zinc-800"></div>
            <span className="text-[10px] text-zinc-600 font-mono ml-4 select-none">crimegpt_workspace_dossier.exe</span>
          </div>

          <div className="relative aspect-[16/9] w-full rounded-b-xl overflow-hidden bg-zinc-950">
            <Image
              src="/images/crimegpt_demo.png"
              alt="CrimeGPT Platform Screenshot Mockup"
              fill
              className="object-cover transition-transform duration-700 group-hover:scale-[1.01]"
              priority
            />
          </div>
        </div>
      </section>

      {/* 4. Features Section */}
      <section id="features" className="max-w-6xl mx-auto px-6 py-20 border-t border-zinc-900 space-y-16">
        <div className="text-center space-y-4">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-100">
            Security & Intelligence Built-In
          </h2>
          <p className="max-w-xl mx-auto text-xs sm:text-sm text-zinc-400">
            Engineered with deep relational security, compliance logs, and advanced legal processing patterns.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="p-6 rounded-2xl border border-zinc-900 bg-zinc-900/20 space-y-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-teal-500/10 text-teal-400">
              <Lock className="h-5 w-5" />
            </div>
            <h3 className="font-bold text-zinc-200">Scoped Data Isolation</h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Every data fetch and mutation in the repository layer is dynamically scoped by user ID. Absolute security prevents cross-user access to case files.
            </p>
          </div>

          <div className="p-6 rounded-2xl border border-zinc-900 bg-zinc-900/20 space-y-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-teal-500/10 text-teal-400">
              <History className="h-5 w-5" />
            </div>
            <h3 className="font-bold text-zinc-200">Automatic Audit Log</h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Compliance auditing captures every case update, evidence registration, and AI document generation with detailed metadata. Exportable and permanent.
            </p>
          </div>

          <div className="p-6 rounded-2xl border border-zinc-900 bg-zinc-900/20 space-y-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-teal-500/10 text-teal-400">
              <FileText className="h-5 w-5" />
            </div>
            <h3 className="font-bold text-zinc-200">Legal Document Factory</h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Instantly compile compliant legal drafts, FIR structures, Investigation Summaries, Remand Requests, and Case Diaries with incremental version history.
            </p>
          </div>
        </div>
      </section>

      {/* 5. AI Workflow */}
      <section id="workflow" className="max-w-6xl mx-auto px-6 py-20 border-t border-zinc-900 space-y-16">
        <div className="text-center space-y-4">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-100">
            How CrimeGPT Works
          </h2>
          <p className="max-w-xl mx-auto text-xs sm:text-sm text-zinc-400">
            An overview of the platform&apos;s multi-step RAG extraction and legal document generation pipeline.
          </p>
        </div>

        <div className="relative grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="relative flex flex-col items-center text-center space-y-3 z-10">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-zinc-900 border border-zinc-800 text-teal-400 font-mono text-sm font-bold">
              01
            </div>
            <h4 className="font-semibold text-zinc-200 text-sm">Narrative Ingestion</h4>
            <p className="text-[11px] text-zinc-500 max-w-[200px]">
              Input incident reports, transcripts, or notes containing critical investigative facts.
            </p>
          </div>

          <div className="relative flex flex-col items-center text-center space-y-3 z-10">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-zinc-900 border border-zinc-800 text-teal-400 font-mono text-sm font-bold">
              02
            </div>
            <h4 className="font-semibold text-zinc-200 text-sm">Semantic Retrieval</h4>
            <p className="text-[11px] text-zinc-500 max-w-[200px]">
              Our PGVector RAG searches local legal databases to extract sections matching the narrative.
            </p>
          </div>

          <div className="relative flex flex-col items-center text-center space-y-3 z-10">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-zinc-900 border border-zinc-800 text-teal-400 font-mono text-sm font-bold">
              03
            </div>
            <h4 className="font-semibold text-zinc-200 text-sm">AI Legal Analysis</h4>
            <p className="text-[11px] text-zinc-500 max-w-[200px]">
              Gemini evaluates the case context against retrieved laws to compile structured insights.
            </p>
          </div>

          <div className="relative flex flex-col items-center text-center space-y-3 z-10">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-zinc-900 border border-zinc-800 text-teal-400 font-mono text-sm font-bold">
              04
            </div>
            <h4 className="font-semibold text-zinc-200 text-sm">Compliant Generation</h4>
            <p className="text-[11px] text-zinc-500 max-w-[200px]">
              Output is structured, validated against strict JSON schemas, and formatted as legal drafts.
            </p>
          </div>
        </div>
      </section>

      {/* 6. Technology Stack */}
      <section id="stack" className="max-w-6xl mx-auto px-6 py-20 border-t border-zinc-900 space-y-16">
        <div className="text-center space-y-4">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-100">
            Engineered with Modern Tech
          </h2>
          <p className="max-w-xl mx-auto text-xs sm:text-sm text-zinc-400">
            Engineered for high performance, accuracy, and enterprise-grade reliability.
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          <div className="p-5 rounded-xl border border-zinc-900/60 bg-zinc-900/10 space-y-2">
            <Cpu className="h-5 w-5 mx-auto text-teal-400" />
            <h4 className="font-semibold text-zinc-200 text-sm">Gemini Flash 1.5</h4>
            <p className="text-[10px] text-zinc-500 font-mono">LLM Reasoning Engine</p>
          </div>
          <div className="p-5 rounded-xl border border-zinc-900/60 bg-zinc-900/10 space-y-2">
            <Database className="h-5 w-5 mx-auto text-teal-400" />
            <h4 className="font-semibold text-zinc-200 text-sm">Neon & PGVector</h4>
            <p className="text-[10px] text-zinc-500 font-mono">Vector Storage & Embeddings</p>
          </div>
          <div className="p-5 rounded-xl border border-zinc-900/60 bg-zinc-900/10 space-y-2">
            <GitBranch className="h-5 w-5 mx-auto text-teal-400" />
            <h4 className="font-semibold text-zinc-200 text-sm">Prisma ORM</h4>
            <p className="text-[10px] text-zinc-500 font-mono">Relational DB Adapter</p>
          </div>
          <div className="p-5 rounded-xl border border-zinc-900/60 bg-zinc-900/10 space-y-2">
            <Terminal className="h-5 w-5 mx-auto text-teal-400" />
            <h4 className="font-semibold text-zinc-200 text-sm">Next.js & React</h4>
            <p className="text-[10px] text-zinc-500 font-mono">Dynamic Server Actions</p>
          </div>
        </div>
      </section>

      {/* 7. Architecture Section */}
      <section id="architecture" className="max-w-6xl mx-auto px-6 py-20 border-t border-zinc-900 space-y-16">
        <div className="text-center space-y-4">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-100">
            Secure Architecture Pattern
          </h2>
          <p className="max-w-xl mx-auto text-xs sm:text-sm text-zinc-400">
            Compliance and security are implemented at the lowest possible layer.
          </p>
        </div>

        <div className="p-8 rounded-2xl border border-zinc-900 bg-zinc-900/10 font-mono text-xs text-zinc-400 leading-relaxed space-y-4 max-w-3xl mx-auto">
          <div className="flex items-center justify-between border-b border-zinc-900 pb-3">
            <span className="text-teal-400 font-bold">ARCHITECTURE COMPONENT</span>
            <span className="text-zinc-500">FLOW STATUS</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-zinc-200 font-semibold w-32">Server Action</span>
            <span className="text-zinc-500">&rarr;</span>
            <span className="flex-1">Retrieves active Google session via Auth.js v5 and obtains the Investigator&apos;s user ID.</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-zinc-200 font-semibold w-32">Service Layer</span>
            <span className="text-zinc-500">&rarr;</span>
            <span className="flex-1">Accepts user ID as primary identifier and triggers RAG embedding comparisons.</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-zinc-200 font-semibold w-32">Repository Layer</span>
            <span className="text-zinc-500">&rarr;</span>
            <span className="flex-1">Scopes database query where case: &#123; userId &#125; before fetching or updating data.</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-zinc-200 font-semibold w-32">Database Layer</span>
            <span className="text-zinc-500">&rarr;</span>
            <span className="flex-1">Neon PostgreSQL handles schema relations, cascading deletions on user account removal.</span>
          </div>
        </div>
      </section>

      {/* 8. Why CrimeGPT */}
      <section className="max-w-6xl mx-auto px-6 py-20 border-t border-zinc-900 space-y-16">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
          <div className="space-y-6">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-100 leading-tight">
              Designed For High-Stakes Operations
            </h2>
            <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed">
              When processing police records and legal cases, security and consistency are critical. CrimeGPT is built with this design principle:
            </p>
            <ul className="space-y-3.5 text-xs text-zinc-300">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-4.5 w-4.5 text-teal-400 shrink-0 mt-0.5" />
                <span>**Absolute Relational Scoping**: Scoping is handled at the database client query level, eliminating any risk of cross-user profile visibility.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-4.5 w-4.5 text-teal-400 shrink-0 mt-0.5" />
                <span>**Observability Logs**: All AI interactions, vector matches, and tokens are stored in audit logs.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-4.5 w-4.5 text-teal-400 shrink-0 mt-0.5" />
                <span>**Incremental Versioning**: Never lose an edits history. Document generations are stored as version updates, ensuring absolute legal trail compliance.</span>
              </li>
            </ul>
          </div>
          <div className="relative rounded-2xl border border-zinc-900 bg-zinc-950 p-6 space-y-4 shadow-xl">
            <h4 className="font-mono text-[10px] text-zinc-500 uppercase tracking-widest">System Diagnostics Check</h4>
            <div className="space-y-2 font-mono text-[11px] text-zinc-400">
              <p className="text-teal-400">CONNECTING TO NEON POOLER... CONNECTED</p>
              <p className="text-teal-400">VERIFYING PGVECTOR SEARCH EXTENSION... OK</p>
              <p className="text-teal-400">CHECKING COMPLIANCE AUDIT ENGINE... OK</p>
              <p className="text-teal-400">VERIFYING USER SESSION ISOLATION SHELL... SECURED</p>
              <div className="border-t border-zinc-900 pt-3 mt-4 text-[10px] text-zinc-500">
                CRIMEGPT CORE AGENT REPORT (OK)
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 9. Final CTA Card */}
      <section className="max-w-6xl mx-auto px-6 pb-24">
        <div className="relative rounded-3xl border border-zinc-800 bg-gradient-to-br from-zinc-900 via-zinc-950 to-zinc-900 p-8 sm:p-12 text-center space-y-6 overflow-hidden">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-teal-500/5 rounded-full blur-3xl pointer-events-none"></div>

          <h2 className="text-2xl sm:text-4xl font-bold tracking-tight text-zinc-100">
            Establish Your Secure Investigation Desk
          </h2>
          <p className="max-w-lg mx-auto text-xs sm:text-sm text-zinc-400 leading-relaxed">
            Register via authorized Google OAuth in seconds and begin creating case dossiers, evidence timelines, and legal documents.
          </p>
          <div className="pt-4">
            <Link
              href={isLoggedIn ? "/case" : "/login"}
              className="group inline-flex items-center gap-2 rounded-xl bg-teal-500 hover:bg-teal-400 text-zinc-950 px-6 py-3.5 text-sm font-bold shadow-lg transition-all"
            >
              <span>{isLoggedIn ? "Go to Workspace" : "Authenticate & Get Started"}</span>
              <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </div>
        </div>
      </section>

      {/* 10. Footer */}
      <footer className="border-t border-zinc-900 bg-zinc-950 py-12 px-6">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <ShieldAlert className="h-4 w-4 text-zinc-600" />
            <span className="text-xs font-semibold text-zinc-500 font-mono">CRIMEGPT SYSTEM GATEWAY</span>
          </div>
          <div className="text-[10px] text-zinc-600 font-mono">
            &copy; {new Date().getFullYear()} CrimeGPT Platform. Classified Law Enforcement Sensitive. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
