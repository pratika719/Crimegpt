"use client";

import { useState, useEffect, useTransition } from "react";
import { 
  Search, 
  SlidersHorizontal, 
  Calendar, 
  AlertCircle, 
  Database, 
  Sparkles, 
  User, 
  Clock, 
  ChevronDown, 
  ChevronUp, 
  RefreshCw, 
  FileCode,
  AlertTriangle,
  CheckCircle2,
  Info,
  Sliders,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  Cpu
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { getAuditLogsAction, getCasesForFilterAction } from "@/actions/audit.action";
import { EnrichedActivity, AuditSeverity, AuditModule, AuditDashboardStats } from "@/services/activity/audit.service";
import { cn } from "@/lib/utils";

interface AuditDashboardClientProps {
  initialData: {
    activities: EnrichedActivity[];
    stats: AuditDashboardStats;
    pagination: {
      total: number;
      totalPages: number;
      currentPage: number;
      limit: number;
    };
  };
}

const MODULES = [
  { value: "ALL", label: "All Modules" },
  { value: "CASE", label: "Case Management" },
  { value: "DOCUMENT", label: "Documents" },
  { value: "PERSON", label: "Persons" },
  { value: "EVIDENCE", label: "Evidence" },
  { value: "CHECKLIST", label: "Checklist" },
  { value: "PROFILE", label: "Investigation Profiles" },
  { value: "DIAGNOSTICS", label: "AI Diagnostics" },
  { value: "SYSTEM", label: "System Core" },
] as const;

const SEVERITIES = [
  { value: "ALL", label: "All Severities" },
  { value: "INFO", label: "Information (INFO)" },
  { value: "SUCCESS", label: "Success (SUCCESS)" },
  { value: "WARNING", label: "Warning (WARNING)" },
  { value: "HIGH", label: "Critical (HIGH)" },
] as const;

export function AuditDashboardClient({ initialData }: AuditDashboardClientProps) {
  // Filters state
  const [search, setSearch] = useState("");
  const [caseId, setCaseId] = useState("ALL");
  const [moduleFilter, setModuleFilter] = useState<string>("ALL");
  const [severityFilter, setSeverityFilter] = useState<string>("ALL");
  const [isAiFilter, setIsAiFilter] = useState<string>("ALL"); // "ALL", "AI", "USER"
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);

  // Loaded cases list for dropdown
  const [cases, setCases] = useState<{ id: string; title: string }[]>([]);

  // Results state
  const [activities, setActivities] = useState<EnrichedActivity[]>(initialData.activities);
  const [stats, setStats] = useState<AuditDashboardStats>(initialData.stats);
  const [totalPages, setTotalPages] = useState(initialData.pagination.totalPages);
  const [totalCount, setTotalCount] = useState(initialData.pagination.total);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const [isPending, startTransition] = useTransition();

  // Load cases for filter dropdown on mount
  useEffect(() => {
    async function loadCases() {
      const response = await getCasesForFilterAction();
      if (response.success && response.cases) {
        setCases(response.cases);
      }
    }
    loadCases();
  }, []);

  // Function to perform query and update results
  const fetchLogs = (currentPage = page) => {
    startTransition(async () => {
      const filters: any = {
        search,
        caseId,
        sortOrder,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        page: currentPage,
        limit: 20,
      };

      if (moduleFilter !== "ALL") {
        filters.module = moduleFilter as AuditModule;
      }

      if (severityFilter !== "ALL") {
        filters.severity = severityFilter as AuditSeverity;
      }

      if (isAiFilter === "AI") {
        filters.isAi = true;
      } else if (isAiFilter === "USER") {
        filters.isAi = false;
      }

      const response = await getAuditLogsAction(filters);
      if (response.success && response.data) {
        setActivities(response.data.activities);
        setStats(response.data.stats);
        setTotalPages(response.data.pagination.totalPages);
        setTotalCount(response.data.pagination.total);
      }
    });
  };

  // Trigger search on filter changes
  useEffect(() => {
    setPage(1);
    fetchLogs(1);
  }, [caseId, moduleFilter, severityFilter, isAiFilter, startDate, endDate, sortOrder]);

  // Debounced query change
  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1);
      fetchLogs(1);
    }, 200);
    return () => clearTimeout(timer);
  }, [search]);

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setPage(newPage);
      fetchLogs(newPage);
    }
  };

  const clearFilters = () => {
    setSearch("");
    setCaseId("ALL");
    setModuleFilter("ALL");
    setSeverityFilter("ALL");
    setIsAiFilter("ALL");
    setStartDate("");
    setEndDate("");
    setSortOrder("desc");
    setPage(1);
  };

  const getSeverityStyles = (severity: AuditSeverity) => {
    switch (severity) {
      case "HIGH":
        return {
          badge: "bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400 border-red-200/50 dark:border-red-900/30",
          dot: "bg-red-500 ring-red-500/20",
          icon: AlertCircle,
        };
      case "WARNING":
        return {
          badge: "bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 border-amber-200/50 dark:border-amber-900/30",
          dot: "bg-amber-500 ring-amber-500/20",
          icon: AlertTriangle,
        };
      case "SUCCESS":
        return {
          badge: "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border-emerald-200/50 dark:border-emerald-900/30",
          dot: "bg-emerald-500 ring-emerald-500/20",
          icon: CheckCircle2,
        };
      default:
        return {
          badge: "bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400 border-blue-200/50 dark:border-blue-900/30",
          dot: "bg-blue-500 ring-blue-500/20",
          icon: Info,
        };
    }
  };

  return (
    <div className="p-6 md:p-8 space-y-8 max-w-7xl mx-auto">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Security & Activity Audit Trail</h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            Comprehensive compliance ledger tracking manual operations, LLM document generation, and evidence modifications.
          </p>
        </div>
        <div className="shrink-0 flex items-center gap-2">
          {isPending && <RefreshCw className="h-4 w-4 text-zinc-400 animate-spin" />}
          <button
            onClick={() => fetchLogs(page)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors shadow-xs cursor-pointer"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh
          </button>
        </div>
      </div>

      {/* Metrics Section */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="relative overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 shadow-sm">
          <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-zinc-400 dark:bg-zinc-600" />
          <div className="flex items-center justify-between text-zinc-500 dark:text-zinc-400">
            <span className="text-[10px] font-mono tracking-wider uppercase">Total Audit Logs</span>
            <Database className="h-4 w-4 shrink-0 opacity-75" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-semibold font-mono tracking-tight">{stats.totalCount}</span>
          </div>
          <p className="mt-1 text-[10px] text-zinc-400 dark:text-zinc-500">
            Logged activities for active scope
          </p>
        </div>

        <div className="relative overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 shadow-sm">
          <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-emerald-500" />
          <div className="flex items-center justify-between text-zinc-500 dark:text-zinc-400">
            <span className="text-[10px] font-mono tracking-wider uppercase">AI Generated Logs</span>
            <Sparkles className="h-4 w-4 shrink-0 text-emerald-500 opacity-75" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-semibold font-mono tracking-tight text-emerald-600 dark:text-emerald-400">{stats.aiCount}</span>
            <span className="text-[10px] font-mono text-zinc-400 dark:text-zinc-500">
              ({stats.totalCount > 0 ? Math.round((stats.aiCount / stats.totalCount) * 100) : 0}%)
            </span>
          </div>
          <p className="mt-1 text-[10px] text-zinc-400 dark:text-zinc-500">
            Intelligent legal analytics & documents
          </p>
        </div>

        <div className="relative overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 shadow-sm">
          <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-amber-500" />
          <div className="flex items-center justify-between text-zinc-500 dark:text-zinc-400">
            <span className="text-[10px] font-mono tracking-wider uppercase">Critical Audits</span>
            <AlertTriangle className="h-4 w-4 shrink-0 text-amber-500 opacity-75" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-semibold font-mono tracking-tight text-amber-600 dark:text-amber-400">{stats.severeCount}</span>
          </div>
          <p className="mt-1 text-[10px] text-zinc-400 dark:text-zinc-500">
            Warnings & deletion audit operations
          </p>
        </div>

        <div className="relative overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 shadow-sm">
          <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-blue-500" />
          <div className="flex items-center justify-between text-zinc-500 dark:text-zinc-400">
            <span className="text-[10px] font-mono tracking-wider uppercase">Investigator Operations</span>
            <User className="h-4 w-4 shrink-0 text-blue-500 opacity-75" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-semibold font-mono tracking-tight text-blue-600 dark:text-blue-400">{stats.userCount}</span>
            <span className="text-[10px] font-mono text-zinc-400 dark:text-zinc-500">
              ({stats.totalCount > 0 ? Math.round((stats.userCount / stats.totalCount) * 100) : 0}%)
            </span>
          </div>
          <p className="mt-1 text-[10px] text-zinc-400 dark:text-zinc-500">
            Manual edits & workspace adjustments
          </p>
        </div>
      </div>

      {/* Collapsible Search and Filters bar */}
      <div className="space-y-4 pt-2">
        <div className="flex flex-col md:flex-row md:items-center gap-3 justify-between">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 h-4 w-4 text-zinc-400 dark:text-zinc-500" />
            <Input
              type="text"
              placeholder="Search audit trail by description or metadata..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-10 bg-white dark:bg-zinc-900/50 border-zinc-200 dark:border-zinc-800 shadow-xs text-xs"
            />
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg border transition-colors cursor-pointer",
                showFilters || caseId !== "ALL" || moduleFilter !== "ALL" || severityFilter !== "ALL" || isAiFilter !== "ALL" || startDate || endDate
                  ? "bg-zinc-900 dark:bg-zinc-100 border-zinc-900 dark:border-zinc-100 text-white dark:text-black"
                  : "bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800"
              )}
            >
              <SlidersHorizontal className="h-3.5 w-3.5" />
              Advanced Filters
              {(caseId !== "ALL" || moduleFilter !== "ALL" || severityFilter !== "ALL" || isAiFilter !== "ALL" || startDate || endDate) && (
                <span className="ml-1 w-2 h-2 rounded-full bg-amber-400 ring-2 ring-zinc-900 dark:ring-zinc-100" />
              )}
            </button>

            {(search || caseId !== "ALL" || moduleFilter !== "ALL" || severityFilter !== "ALL" || isAiFilter !== "ALL" || startDate || endDate) && (
              <button
                onClick={clearFilters}
                className="px-3 py-2 text-xs font-medium text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors cursor-pointer"
              >
                Clear All
              </button>
            )}
          </div>
        </div>

        {/* Expandable Advanced Filters Drawer */}
        {showFilters && (
          <div className="p-5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 animate-in fade-in-50 duration-200">
            {/* Case Filter */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-semibold text-zinc-400 dark:text-zinc-500 uppercase font-mono">Case Dossier</label>
              <select
                value={caseId}
                onChange={(e) => setCaseId(e.target.value)}
                className="w-full text-xs bg-zinc-50/50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg p-2 outline-none text-zinc-900 dark:text-zinc-100 focus:border-zinc-400"
              >
                <option value="ALL">All Cases</option>
                {cases.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.title}
                  </option>
                ))}
              </select>
            </div>

            {/* Module Filter */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-semibold text-zinc-400 dark:text-zinc-500 uppercase font-mono">Platform Module</label>
              <select
                value={moduleFilter}
                onChange={(e) => setModuleFilter(e.target.value)}
                className="w-full text-xs bg-zinc-50/50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg p-2 outline-none text-zinc-900 dark:text-zinc-100 focus:border-zinc-400"
              >
                {MODULES.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Severity Filter */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-semibold text-zinc-400 dark:text-zinc-500 uppercase font-mono">Severity Level</label>
              <select
                value={severityFilter}
                onChange={(e) => setSeverityFilter(e.target.value)}
                className="w-full text-xs bg-zinc-50/50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg p-2 outline-none text-zinc-900 dark:text-zinc-100 focus:border-zinc-400"
              >
                {SEVERITIES.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>

            {/* AI vs User Toggle */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-semibold text-zinc-400 dark:text-zinc-500 uppercase font-mono">Action Origin</label>
              <select
                value={isAiFilter}
                onChange={(e) => setIsAiFilter(e.target.value)}
                className="w-full text-xs bg-zinc-50/50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg p-2 outline-none text-zinc-900 dark:text-zinc-100 focus:border-zinc-400"
              >
                <option value="ALL">All Actions</option>
                <option value="AI">AI Co-Pilot / Generative</option>
                <option value="USER">Manual Investigator Action</option>
              </select>
            </div>

            {/* Start Date */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-semibold text-zinc-400 dark:text-zinc-500 uppercase font-mono">Start Date</label>
              <div className="relative">
                <Calendar className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-zinc-400 pointer-events-none" />
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full text-xs bg-zinc-50/50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg p-2 pl-8 outline-none text-zinc-900 dark:text-zinc-100 focus:border-zinc-400"
                />
              </div>
            </div>

            {/* End Date */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-semibold text-zinc-400 dark:text-zinc-500 uppercase font-mono">End Date</label>
              <div className="relative">
                <Calendar className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-zinc-400 pointer-events-none" />
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full text-xs bg-zinc-50/50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg p-2 pl-8 outline-none text-zinc-900 dark:text-zinc-100 focus:border-zinc-400"
                />
              </div>
            </div>

            {/* Sort Order */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-semibold text-zinc-400 dark:text-zinc-500 uppercase font-mono">Sort Timeline</label>
              <select
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value as any)}
                className="w-full text-xs bg-zinc-50/50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg p-2 outline-none text-zinc-900 dark:text-zinc-100 focus:border-zinc-400"
              >
                <option value="desc">Newest First</option>
                <option value="asc">Oldest First</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Main Timeline Log list */}
      <div className="relative rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 overflow-hidden">
        {isPending && (
          <div className="absolute inset-0 bg-white/50 dark:bg-zinc-950/40 backdrop-blur-[1px] flex items-center justify-center z-10 transition-all duration-300">
            <div className="flex items-center gap-2 text-xs font-semibold text-zinc-500 dark:text-zinc-400">
              <RefreshCw className="h-4 w-4 animate-spin text-zinc-500" />
              Updating audit records...
            </div>
          </div>
        )}

        {activities.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center px-4">
            <AlertCircle className="h-10 w-10 text-zinc-350 dark:text-zinc-700 mb-3" />
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">No matching activities audited</h3>
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400 max-w-sm">
              We couldn&apos;t find any compliance trail records matching your active filters. Try adjusting your query or date filters.
            </p>
            {(search || caseId !== "ALL" || moduleFilter !== "ALL" || severityFilter !== "ALL" || isAiFilter !== "ALL" || startDate || endDate) && (
              <button
                onClick={clearFilters}
                className="mt-4 rounded-lg border border-zinc-200 dark:border-zinc-800 px-3.5 py-1.5 text-xs font-semibold hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-all cursor-pointer"
              >
                Clear Filters
              </button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-zinc-200 dark:divide-zinc-800 font-sans">
            {/* Headers row */}
            <div className="hidden md:grid grid-cols-[120px_1fr_120px_180px_100px] gap-4 px-6 py-3.5 bg-zinc-50/70 dark:bg-zinc-900/80 text-[10px] font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider font-mono select-none">
              <span>Severity / Module</span>
              <span>Audited Compliance Action</span>
              <span>Case Dossier</span>
              <span>Timestamp</span>
              <span className="text-right">Actions</span>
            </div>

            {/* List entries */}
            <div className="relative">
              {/* Vertical timeline connector */}
              <div className="absolute left-[34px] md:left-[34px] top-4 bottom-4 w-px bg-zinc-200 dark:bg-zinc-800" />

              {activities.map((activity) => {
                const isExpanded = expandedId === activity.id;
                const style = getSeverityStyles(activity.severity);
                const SeverityIcon = style.icon;

                return (
                  <div 
                    key={activity.id} 
                    className={cn(
                      "transition-all duration-100 border-l-[3px]",
                      activity.severity === "HIGH" ? "border-l-red-500" :
                      activity.severity === "WARNING" ? "border-l-amber-500" :
                      activity.severity === "SUCCESS" ? "border-l-emerald-500" :
                      "border-l-transparent",
                      isExpanded ? "bg-zinc-50/40 dark:bg-zinc-900/30" : "hover:bg-zinc-50/20 dark:hover:bg-zinc-900/10"
                    )}
                  >
                    {/* Item header container */}
                    <div 
                      onClick={() => setExpandedId(isExpanded ? null : activity.id)}
                      className="grid grid-cols-1 md:grid-cols-[120px_1fr_120px_180px_100px] gap-2 md:gap-4 px-6 py-4 items-center cursor-pointer select-none"
                    >
                      {/* Badge / Module column */}
                      <div className="flex items-center gap-3">
                        {/* Timeline node */}
                        <div className={cn(
                          "relative z-10 flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded-full bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-[8px]"
                        )}>
                          <span className={cn("h-2 w-2 rounded-full ring-4", style.dot)} />
                        </div>
                        
                        <div className="md:hidden flex items-center gap-1.5">
                          <span className={cn(
                            "rounded border px-1.5 py-0.5 text-[8.5px] font-semibold tracking-wide uppercase font-mono shadow-3xs",
                            style.badge
                          )}>
                            {activity.severity}
                          </span>
                          <span className="rounded bg-zinc-200 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 px-1.5 py-0.5 text-[8.5px] font-mono text-zinc-500 dark:text-zinc-400 font-semibold tracking-wide uppercase">
                            {activity.module}
                          </span>
                        </div>

                        <span className="hidden md:inline rounded bg-zinc-100 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-800 px-2 py-0.5 text-[9px] font-mono font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">
                          {activity.module}
                        </span>
                      </div>

                      {/* Description / Action */}
                      <div className="min-w-0 pr-4">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 line-clamp-1">
                            {activity.description}
                          </span>
                          {activity.isAi && (
                            <span className="inline-flex items-center gap-0.5 rounded bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-250/50 dark:border-emerald-900/30 px-1 py-0.2 text-[8px] font-mono font-medium text-emerald-700 dark:text-emerald-400">
                              <Sparkles className="h-2 w-2 shrink-0 animate-pulse text-emerald-500" />
                              AI GENERATED
                            </span>
                          )}
                        </div>
                        <span className="block md:hidden text-[9px] font-mono text-zinc-400 dark:text-zinc-500 mt-0.5">
                          Timestamp: {new Date(activity.createdAt).toLocaleString()}
                        </span>
                      </div>

                      {/* Case Dossier Title */}
                      <div className="truncate text-xs font-semibold text-zinc-500 dark:text-zinc-400 font-mono">
                        {activity.caseTitle}
                      </div>

                      {/* Timestamp (hidden on mobile, shown in subtitle) */}
                      <div className="hidden md:flex items-center gap-1 text-xs text-zinc-500 dark:text-zinc-400 font-mono">
                        <Clock className="h-3.5 w-3.5 text-zinc-400 dark:text-zinc-500 shrink-0" />
                        {new Date(activity.createdAt).toLocaleString()}
                      </div>

                      {/* Expander Button */}
                      <div className="flex items-center justify-end">
                        <button className="flex h-7 w-7 items-center justify-center rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-500 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors shadow-2xs">
                          {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                        </button>
                      </div>
                    </div>

                    {/* Collapsible JSON Explorer details */}
                    {isExpanded && (
                      <div className="px-6 pb-6 pt-1 border-t border-dashed border-zinc-200 dark:border-zinc-800 bg-zinc-50/30 dark:bg-zinc-950/20 text-xs animate-in slide-in-from-top-1 duration-150">
                        <div className="grid gap-6 md:grid-cols-[200px_1fr]">
                          {/* Log summary context metadata info boxes */}
                          <div className="space-y-4">
                            <div className="space-y-1">
                              <span className="text-[10px] font-semibold text-zinc-400 dark:text-zinc-500 uppercase font-mono">Activity ID</span>
                              <div className="font-mono text-[10px] select-all bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded px-1.5 py-0.5 text-zinc-600 dark:text-zinc-400 truncate">
                                {activity.id}
                              </div>
                            </div>

                            <div className="space-y-1">
                              <span className="text-[10px] font-semibold text-zinc-400 dark:text-zinc-500 uppercase font-mono">Event Severity</span>
                              <div>
                                <span className={cn(
                                  "rounded border px-2 py-0.5 text-[10px] font-mono font-semibold uppercase shadow-3xs inline-flex items-center gap-1",
                                  style.badge
                                )}>
                                  <SeverityIcon className="h-3 w-3 shrink-0" />
                                  {activity.severity}
                                </span>
                              </div>
                            </div>

                            <div className="space-y-1">
                              <span className="text-[10px] font-semibold text-zinc-400 dark:text-zinc-500 uppercase font-mono">Event Type</span>
                              <div className="font-mono text-[10px] text-zinc-600 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded px-1.5 py-0.5 inline-block">
                                {activity.activityType}
                              </div>
                            </div>

                            <div className="space-y-1">
                              <span className="text-[10px] font-semibold text-zinc-400 dark:text-zinc-500 uppercase font-mono">Origin Module</span>
                              <div className="text-[10px] text-zinc-600 dark:text-zinc-400 flex items-center gap-1.5">
                                {activity.isAi ? (
                                  <>
                                    <Sparkles className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                                    <span>AI Co-Pilot</span>
                                  </>
                                ) : (
                                  <>
                                    <User className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                                    <span>Investigator Session</span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Raw compliance JSON explorer */}
                          <div className="space-y-2">
                            <div className="flex items-center justify-between text-zinc-500 dark:text-zinc-400">
                              <span className="text-[10px] font-semibold text-zinc-400 dark:text-zinc-500 uppercase font-mono flex items-center gap-1.5">
                                <FileCode className="h-3.5 w-3.5" />
                                Audited JSON Metadata Context
                              </span>
                            </div>
                            
                            {activity.metadata && Object.keys(activity.metadata).length > 0 ? (
                              <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-950 dark:bg-black p-4 text-[10.5px] font-mono text-zinc-300 overflow-x-auto max-h-72 shadow-inner">
                                <pre>{JSON.stringify(activity.metadata, null, 2)}</pre>
                              </div>
                            ) : (
                              <div className="rounded-lg border border-dashed border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/20 p-4 text-center text-[10px] text-zinc-400 dark:text-zinc-500 font-mono">
                                No additional context metadata was recorded for this event.
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Footer pagination bar */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 bg-zinc-50/70 dark:bg-zinc-900/60 border-t border-zinc-200 dark:border-zinc-800 select-none text-xs font-medium text-zinc-500 dark:text-zinc-400">
            <div>
              Showing page <span className="font-mono text-zinc-800 dark:text-zinc-200">{page}</span> of <span className="font-mono text-zinc-800 dark:text-zinc-200">{totalPages}</span>
              <span className="hidden sm:inline"> (Total {totalCount} audits)</span>
            </div>
            
            <div className="flex items-center gap-2">
              <button
                disabled={page <= 1}
                onClick={() => handlePageChange(page - 1)}
                className="flex items-center gap-1 px-2.5 py-1.5 text-xs rounded-md border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800 disabled:opacity-40 disabled:hover:bg-white dark:disabled:hover:bg-zinc-900 transition-colors shadow-3xs cursor-pointer"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
                Previous
              </button>
              <button
                disabled={page >= totalPages}
                onClick={() => handlePageChange(page + 1)}
                className="flex items-center gap-1 px-2.5 py-1.5 text-xs rounded-md border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800 disabled:opacity-40 disabled:hover:bg-white dark:disabled:hover:bg-zinc-900 transition-colors shadow-3xs cursor-pointer"
              >
                Next
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
