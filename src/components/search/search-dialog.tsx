"use client";

import { useState, useEffect, useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import { 
  Search, 
  X, 
  Folder, 
  FileText, 
  ShieldAlert, 
  User, 
  Clock, 
  CornerDownLeft, 
  FileSearch,
  BookOpen
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { performGlobalSearchAction } from "@/actions/search.action";
import { SearchResultDTO } from "@/types/search.types";
import { cn } from "@/lib/utils";

interface SearchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const CATEGORIES = [
  { value: "ALL", label: "All" },
  { value: "CASE", label: "Cases" },
  { value: "DOCUMENT", label: "Documents" },
  { value: "EVIDENCE", label: "Evidence" },
  { value: "PERSON", label: "Persons" },
  { value: "ACTIVITY", label: "Activities" },
  { value: "PROFILE", label: "Profiles" },
] as const;

type SearchCategory = typeof CATEGORIES[number]["value"];

function HighlightText({ text, query }: { text: string; query: string }) {
  if (!query || !text) return <>{text}</>;
  const escapedQuery = query.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&");
  const regex = new RegExp(`(${escapedQuery})`, "gi");
  const parts = text.split(regex);
  return (
    <>
      {parts.map((part, i) =>
        regex.test(part) ? (
          <mark key={i} className="bg-amber-500/20 text-amber-900 dark:text-amber-100 dark:bg-amber-500/30 rounded-[2px] px-0.5 font-medium">
            {part}
          </mark>
        ) : (
          part
        )
      )}
    </>
  );
}

function getIconForType(type: string) {
  switch (type) {
    case "CASE":
      return Folder;
    case "DOCUMENT":
      return FileText;
    case "EVIDENCE":
      return ShieldAlert;
    case "PERSON":
      return User;
    case "ACTIVITY":
      return Clock;
    case "PROFILE":
      return FileSearch;
    default:
      return Search;
  }
}

export default function SearchDialog({ open, onOpenChange }: SearchDialogProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<SearchCategory>("ALL");
  const [results, setResults] = useState<SearchResultDTO[]>([]);
  const [recentSearches, setRecentSearches] = useState<SearchResultDTO[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isPending, startTransition] = useTransition();
  const resultsContainerRef = useRef<HTMLDivElement>(null);

  // Load recent searches from localStorage on mount/open
  useEffect(() => {
    if (open) {
      const stored = localStorage.getItem("crimegpt:recent-searches");
      if (stored) {
        try {
          setRecentSearches(JSON.parse(stored));
        } catch (e) {
          console.error("Failed to parse recent searches", e);
        }
      }
      setQuery("");
      setSelectedIndex(0);
    }
  }, [open]);

  // Perform search when query changes
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setSelectedIndex(0);
      return;
    }

    const delayDebounce = setTimeout(() => {
      startTransition(async () => {
        const response = await performGlobalSearchAction(query);
        if (response.success && response.results) {
          setResults(response.results);
          setSelectedIndex(0);
        }
      });
    }, 150); // Small debounce

    return () => clearTimeout(delayDebounce);
  }, [query]);

  // Filtered results client-side
  const filteredResults = (query.trim() === "" ? recentSearches : results).filter((item) => {
    if (category === "ALL") return true;
    return item.type === category;
  });

  // Handle item navigation & saving to recents
  const handleItemSelect = (item: SearchResultDTO) => {
    // Add to recent searches
    const updatedRecent = [
      item,
      ...recentSearches.filter((r) => r.id !== item.id),
    ].slice(0, 5); // Keep last 5

    setRecentSearches(updatedRecent);
    localStorage.setItem("crimegpt:recent-searches", JSON.stringify(updatedRecent));

    // Close and Navigate
    onOpenChange(false);
    router.push(item.url);
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!open) return;

      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) => 
          prev < filteredResults.length - 1 ? prev + 1 : prev
        );
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : 0));
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (filteredResults[selectedIndex]) {
          handleItemSelect(filteredResults[selectedIndex]);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, filteredResults, selectedIndex, recentSearches]);

  // Scroll active item into view
  useEffect(() => {
    if (resultsContainerRef.current) {
      const activeEl = resultsContainerRef.current.querySelector("[data-active='true']");
      if (activeEl) {
        activeEl.scrollIntoView({ block: "nearest" });
      }
    }
  }, [selectedIndex]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className="max-w-2xl w-[calc(100%-2rem)] p-0 gap-0 overflow-hidden bg-white/90 dark:bg-zinc-950/90 border border-zinc-200 dark:border-zinc-800 backdrop-blur-xl shadow-2xl rounded-xl top-[15%] -translate-y-0 sm:max-w-2xl sm:translate-y-0 sm:top-[15%]"
        showCloseButton={false}
      >
        <DialogTitle className="sr-only">Global Search Command Palette</DialogTitle>
        
        {/* Search Input Box */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-zinc-200 dark:border-zinc-800">
          <Search className="h-5 w-5 text-zinc-400 dark:text-zinc-500 shrink-0" />
          <input
            autoFocus
            type="text"
            placeholder="Search cases, documents, evidence, persons..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 bg-transparent border-0 text-sm font-medium outline-none text-zinc-900 dark:text-zinc-50 placeholder-zinc-400 dark:placeholder-zinc-500 py-1"
          />
          {query && (
            <button 
              onClick={() => setQuery("")}
              className="p-1 rounded-md text-zinc-400 dark:text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-850 hover:text-zinc-600 dark:hover:text-zinc-300"
            >
              <X className="h-4 w-4" />
            </button>
          )}
          <span className="rounded bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 px-1.5 py-0.5 text-[10px] font-mono text-zinc-400 dark:text-zinc-500 select-none">
            ESC
          </span>
        </div>

        {/* Category Filters */}
        <div className="flex items-center gap-1.5 px-4 py-2 bg-zinc-50/50 dark:bg-zinc-900/30 border-b border-zinc-200 dark:border-zinc-800 overflow-x-auto scrollbar-none">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.value}
              onClick={() => {
                setCategory(cat.value);
                setSelectedIndex(0);
              }}
              className={cn(
                "px-2.5 py-1 text-[11px] font-medium rounded-full transition-all border shrink-0",
                category === cat.value
                  ? "bg-zinc-900 border-zinc-900 text-white dark:bg-zinc-100 dark:border-zinc-100 dark:text-black"
                  : "bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-500 dark:text-zinc-400 hover:border-zinc-350 dark:hover:border-zinc-700"
              )}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Results Container */}
        <div 
          ref={resultsContainerRef}
          className="max-h-[360px] overflow-y-auto p-2 space-y-0.5"
        >
          {isPending && (
            <div className="flex items-center justify-center py-12 gap-2 text-xs font-medium text-zinc-400 dark:text-zinc-500">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-zinc-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-zinc-500"></span>
              </span>
              Searching database...
            </div>
          )}

          {!isPending && filteredResults.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <FileSearch className="h-8 w-8 text-zinc-300 dark:text-zinc-700 mb-2" />
              <p className="text-xs font-semibold text-zinc-400 dark:text-zinc-500">
                {query.trim() === "" 
                  ? "No recent searches" 
                  : `No results matching "${query}"`
                }
              </p>
              <p className="text-[10px] text-zinc-400 dark:text-zinc-650 mt-1">
                {query.trim() === "" 
                  ? "Items you open will appear here." 
                  : "Try different keywords or filters."
                }
              </p>
            </div>
          )}

          {!isPending && filteredResults.length > 0 && (
            <>
              {query.trim() === "" && (
                <div className="text-[10px] font-semibold text-zinc-450 dark:text-zinc-500 tracking-wider uppercase px-3 py-1.5 font-mono">
                  Recent Investigations & Assets
                </div>
              )}

              {filteredResults.map((item, idx) => {
                const ItemIcon = getIconForType(item.type);
                const isSelected = idx === selectedIndex;
                return (
                  <div
                    key={item.id}
                    onClick={() => handleItemSelect(item)}
                    onMouseEnter={() => setSelectedIndex(idx)}
                    data-active={isSelected}
                    className={cn(
                      "flex items-start gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-all border border-transparent select-none",
                      isSelected 
                        ? "bg-zinc-100/80 dark:bg-zinc-800/80 border-zinc-200/50 dark:border-zinc-750/50" 
                        : "hover:bg-zinc-50/50 dark:hover:bg-zinc-900/30"
                    )}
                  >
                    <div className={cn(
                      "flex h-8 w-8 items-center justify-center rounded-lg border text-zinc-500 dark:text-zinc-400 shrink-0",
                      isSelected 
                        ? "bg-white dark:bg-zinc-700 border-zinc-300 dark:border-zinc-600" 
                        : "bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800"
                    )}>
                      <ItemIcon className="h-4 w-4" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-semibold text-zinc-850 dark:text-zinc-100 truncate block">
                          <HighlightText text={item.title} query={query} />
                        </span>
                        {item.badge && (
                          <span className="rounded bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 px-1 py-0.2 text-[8px] font-mono text-zinc-500 dark:text-zinc-400 uppercase">
                            {item.badge.replace(/_/g, " ")}
                          </span>
                        )}
                      </div>
                      <span className="block text-[10px] text-zinc-450 dark:text-zinc-500 font-medium truncate mt-0.5">
                        {item.subtitle}
                      </span>
                      <span className="block text-[10px] text-zinc-400 dark:text-zinc-500 truncate mt-0.5">
                        <HighlightText text={item.description} query={query} />
                      </span>
                    </div>

                    {isSelected && (
                      <div className="flex items-center gap-1.5 self-center text-[10px] font-mono text-zinc-400 dark:text-zinc-500 bg-white dark:bg-zinc-800 px-1.5 py-0.5 rounded border border-zinc-200 dark:border-zinc-700 shrink-0">
                        <span>Open</span>
                        <CornerDownLeft className="h-3 w-3" />
                      </div>
                    )}
                  </div>
                );
              })}
            </>
          )}
        </div>

        {/* Footer shortcuts */}
        <div className="flex items-center justify-between px-4 py-2 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/30 text-[10px] font-mono text-zinc-400 dark:text-zinc-500 select-none">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <span className="px-1 py-0.2 rounded border bg-white dark:bg-zinc-855 border-zinc-200 dark:border-zinc-700">↑↓</span>
              Navigate
            </span>
            <span className="flex items-center gap-1">
              <span className="px-1 py-0.2 rounded border bg-white dark:bg-zinc-855 border-zinc-200 dark:border-zinc-700">Enter</span>
              Select
            </span>
          </div>
          <div>
            <span>CrimeGPT v1.4 • Core Intelligence</span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
