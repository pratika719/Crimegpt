"use client";

import { useState, useMemo } from "react";
import { Search, FolderOpen, SlidersHorizontal, Plus, Calendar, AlertCircle } from "lucide-react";
import { CreateCaseDialog } from "./create-case-dialog";
import { CaseCard } from "./case-card";
import { Input } from "@/components/ui/input";
import type { CaseModel as Case } from "@/generated/prisma/models";

type CasesDashboardClientProps = {
  initialCases: Case[];
};

type StatusFilter = "ALL" | "OPEN" | "UNDER_INVESTIGATION" | "CLOSED";
type SortOption = "newest" | "oldest" | "title";

export function CasesDashboardClient({ initialCases }: CasesDashboardClientProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [sortBy, setSortBy] = useState<SortOption>("newest");

  if (initialCases.length === 0) {
    return (
      <div className="p-6 md:p-12 max-w-5xl mx-auto space-y-12 animate-fade-in">
        {/* Header Hero Section with Premium Gradients */}
        <div className="relative overflow-hidden rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-gradient-to-br from-zinc-50 via-white to-zinc-100/50 dark:from-zinc-950 dark:via-zinc-900 dark:to-zinc-900/50 p-8 md:p-12 shadow-xl">
          {/* Background Ambient Glow */}
          <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-br from-blue-500/10 to-indigo-500/10 dark:from-blue-500/20 dark:to-indigo-500/20 blur-3xl rounded-full pointer-events-none" />
          
          <div className="relative max-w-2xl space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-[11px] font-semibold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
              <span className="flex h-1.5 w-1.5 rounded-full bg-blue-500 animate-ping" />
              Introducing CrimeGPT Dossier Intelligence
            </div>
            
            <h1 className="text-3xl md:text-5xl font-bold tracking-tight bg-gradient-to-r from-zinc-900 via-zinc-800 to-zinc-600 dark:from-white dark:via-zinc-200 dark:to-zinc-400 bg-clip-text text-transparent">
              Elevate Your Legal & Incident Analysis
            </h1>
            
            <p className="text-xs md:text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">
              CrimeGPT is a comprehensive incident intelligence and automated drafting suite. Streamline police record indexing, analyze witness statements, check statutory legal compliance, and draft professional court-ready files in minutes.
            </p>
            
            <div className="pt-2">
              <CreateCaseDialog 
                triggerClass="flex items-center gap-2 px-6 py-3.5 text-xs font-semibold bg-blue-600 hover:bg-blue-500 dark:bg-blue-500 dark:hover:bg-blue-400 text-white rounded-xl shadow-lg hover:shadow-blue-500/20 transition-all hover:-translate-y-0.5 cursor-pointer"
                triggerText="Create Your First Case"
              />
            </div>
          </div>
        </div>

        {/* Workflow Timeline / Feature Grid */}
        <div className="space-y-6">
          <div className="text-center md:text-left">
            <h2 className="text-base font-semibold tracking-tight">Structured Case Workflow</h2>
            <p className="text-xs text-zinc-500 mt-1">Get started in four simple steps to build a complete case portfolio.</p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <StepCard 
              step="1"
              title="Narrative Intake"
              description="Input the raw incident report or victim statement. CrimeGPT processes semantic concepts."
              colorClass="border-blue-500/20 dark:border-blue-500/10"
              icon={<FolderOpen className="h-5 w-5 text-blue-500" />}
            />
            <StepCard 
              step="2"
              title="Dossier Building"
              description="Add structured profiles for victims, suspects, witnesses, seized weapons/vehicles, and medical evidence."
              colorClass="border-amber-500/20 dark:border-amber-500/10"
              icon={<AlertCircle className="h-5 w-5 text-amber-500" />}
            />
            <StepCard 
              step="3"
              title="Statutory Analysis"
              description="Run similarity search against pgvector to map incident facts to actual IPC/BNS statutory codes."
              colorClass="border-emerald-500/20 dark:border-emerald-500/10"
              icon={<Search className="h-5 w-5 text-emerald-500" />}
            />
            <StepCard 
              step="4"
              title="Draft Reports"
              description="Generate prosecution-ready FIRs, Chargesheets, Case Diaries, and Remand Applications using structured context."
              colorClass="border-purple-500/20 dark:border-purple-500/10"
              icon={<Calendar className="h-5 w-5 text-purple-500" />}
            />
          </div>
        </div>
      </div>
    );
  }

  // Dynamically calculate stats based on initial raw data
  const stats = useMemo(() => {
    const total = initialCases.length;
    const open = initialCases.filter((c) => c.status === "OPEN").length;
    const active = initialCases.filter((c) => c.status === "UNDER_INVESTIGATION").length;
    const closed = initialCases.filter((c) => c.status === "CLOSED").length;
    
    return { total, open, active, closed };
  }, [initialCases]);

  // Filter and sort cases
  const filteredAndSortedCases = useMemo(() => {
    return initialCases
      .filter((c) => {
        const matchesSearch = 
          c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          c.narrative.toLowerCase().includes(searchQuery.toLowerCase());
        
        const matchesStatus = 
          statusFilter === "ALL" || 
          c.status === statusFilter;

        return matchesSearch && matchesStatus;
      })
      .sort((a, b) => {
        if (sortBy === "title") {
          return a.title.localeCompare(b.title);
        }
        
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        
        if (sortBy === "oldest") {
          return dateA - dateB;
        }
        
        // newest default
        return dateB - dateA;
      });
  }, [initialCases, searchQuery, statusFilter, sortBy]);

  return (
    <div className="p-6 md:p-8 space-y-8 max-w-7xl mx-auto">
      {/* Top Banner Dashboard Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Investigation Cases</h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            Real-time directory of profiles, active operations, and legal status logs.
          </p>
        </div>
        <div className="shrink-0 sm:self-end">
          <CreateCaseDialog />
        </div>
      </div>

      {/* Metrics Section */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard 
          title="All Records" 
          value={stats.total} 
          description="Total archived dossiers"
          indicatorColor="bg-zinc-500"
        />
        <StatCard 
          title="Pending Action" 
          value={stats.open} 
          description="Newly registered cases"
          indicatorColor="bg-blue-500"
        />
        <StatCard 
          title="Active Inquests" 
          value={stats.active} 
          description="Under investigation status"
          indicatorColor="bg-amber-500"
        />
        <StatCard 
          title="Resolved Cases" 
          value={stats.closed} 
          description="Legally closed files"
          indicatorColor="bg-emerald-500"
        />
      </div>

      {/* Filter Toolbar (Linear-style segment controls) */}
      <div className="flex flex-col md:flex-row md:items-center gap-4 justify-between pt-2">
        <div className="flex flex-wrap items-center gap-2">
          {/* Status Tabs */}
          <div className="inline-flex items-center rounded-lg bg-zinc-100 dark:bg-zinc-800/80 p-1 border border-zinc-200/50 dark:border-zinc-700/30">
            {(["ALL", "OPEN", "UNDER_INVESTIGATION", "CLOSED"] as const).map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition-all ${
                  statusFilter === status
                    ? "bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50 shadow-sm border border-zinc-200/20"
                    : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200"
                }`}
              >
                {status === "UNDER_INVESTIGATION" 
                  ? "Investigating" 
                  : status.charAt(0) + status.slice(1).toLowerCase()}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Search Box */}
          <div className="relative w-full md:w-64">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-zinc-400 dark:text-zinc-500" />
            <Input
              type="search"
              placeholder="Filter by title, content..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 text-xs h-9 bg-white dark:bg-zinc-900/50 border-zinc-200 dark:border-zinc-800"
            />
          </div>

          {/* Sort Menu */}
          <div className="flex items-center gap-1.5 shrink-0">
            <SlidersHorizontal className="h-3.5 w-3.5 text-zinc-400" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="bg-transparent text-xs font-medium text-zinc-600 dark:text-zinc-400 outline-none border border-zinc-200 dark:border-zinc-800 rounded-lg px-2.5 py-1.5 bg-white dark:bg-zinc-900"
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="title">Case Title</option>
            </select>
          </div>
        </div>
      </div>

      {/* Grid List View */}
      {filteredAndSortedCases.length === 0 ? (
        <EmptyState 
          isFilterActive={searchQuery !== "" || statusFilter !== "ALL"} 
          onClear={() => {
            setSearchQuery("");
            setStatusFilter("ALL");
          }} 
        />
      ) : (
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {filteredAndSortedCases.map((caseItem) => (
            <CaseCard key={caseItem.id} case={caseItem} />
          ))}
        </div>
      )}
    </div>
  );
}

function StatCard({
  title,
  value,
  description,
  indicatorColor,
}: {
  title: string;
  value: number;
  description: string;
  indicatorColor: string;
}) {
  return (
    <div className="relative overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 shadow-sm">
      {/* Decorative vertical line indicating state */}
      <div className={`absolute left-0 top-0 bottom-0 w-[3px] ${indicatorColor}`} />
      
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider font-mono">
          {title}
        </span>
      </div>
      <div className="mt-3 flex items-baseline gap-2">
        <span className="text-3xl font-semibold font-mono tracking-tight">{value}</span>
      </div>
      <p className="mt-1 text-[10px] text-zinc-400 dark:text-zinc-500">
        {description}
      </p>
    </div>
  );
}

function EmptyState({ 
  isFilterActive, 
  onClear 
}: { 
  isFilterActive: boolean; 
  onClear: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-zinc-300 dark:border-zinc-800 py-16 px-4 bg-white dark:bg-zinc-900/10">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-500 mb-4">
        {isFilterActive ? <AlertCircle className="h-6 w-6" /> : <FolderOpen className="h-6 w-6" />}
      </div>
      <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
        {isFilterActive ? "No matching records found" : "No cases active"}
      </h3>
      <p className="mt-1.5 text-xs text-zinc-500 dark:text-zinc-400 max-w-sm text-center">
        {isFilterActive 
          ? "We couldn't find any dossiers matching your current search parameters." 
          : "Register your first official investigation dossier to start logging evidence and tracking intelligence."}
      </p>
      
      <div className="mt-5">
        {isFilterActive ? (
          <button 
            onClick={onClear}
            className="rounded-lg border border-zinc-200 dark:border-zinc-800 px-3.5 py-1.5 text-xs font-semibold hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
          >
            Clear Filters
          </button>
        ) : (
          <CreateCaseDialog />
        )}
      </div>
    </div>
  );
}

function StepCard({
  step,
  title,
  description,
  colorClass,
  icon,
}: {
  step: string;
  title: string;
  description: string;
  colorClass: string;
  icon: React.ReactNode;
}) {
  return (
    <div className={`relative overflow-hidden rounded-xl border bg-white dark:bg-zinc-900 p-5 shadow-sm hover:shadow-md transition-all hover:scale-[1.02] ${colorClass}`}>
      <div className="flex items-center justify-between gap-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-zinc-50 dark:bg-zinc-800/50">
          {icon}
        </div>
        <span className="text-2xl font-bold font-mono text-zinc-300 dark:text-zinc-700/80">0{step}</span>
      </div>
      <h3 className="mt-4 text-xs font-semibold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider font-mono">
        {title}
      </h3>
      <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
        {description}
      </p>
    </div>
  );
}
