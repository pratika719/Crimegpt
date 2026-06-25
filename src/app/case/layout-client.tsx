"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { 
  FolderOpen, 
  Settings, 
  Terminal, 
  ShieldAlert,
  Search,
  BookOpen,
  LogOut,
  User,
  Sun,
  Moon
} from "lucide-react";
import { cn } from "@/lib/utils";
import SearchDialog from "@/components/search/search-dialog";

const navigation = [
  { name: "Cases", href: "/case", icon: FolderOpen, active: true },
  { name: "Legal Database", href: "#", icon: BookOpen, active: false, badge: "Coming Soon" },
  { name: "Audit Logs", href: "/case/audit", icon: Terminal, active: true },
  { name: "Settings", href: "/case/settings", icon: Settings, active: true },
];

export default function DashboardLayoutClient({
  children,
  session,
}: {
  children: React.ReactNode;
  session: any;
}) {
  const pathname = usePathname();
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">("dark");
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Initialize theme from document class
  useEffect(() => {
    const isDark = document.documentElement.classList.contains("dark") || 
                   localStorage.getItem("theme") === "dark" ||
                   (!localStorage.getItem("theme") && window.matchMedia("(prefers-color-scheme: dark)").matches);
    
    if (isDark) {
      document.documentElement.classList.add("dark");
      setTheme("dark");
    } else {
      document.documentElement.classList.remove("dark");
      setTheme("light");
    }
  }, []);

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Toggle theme helper
  const toggleTheme = () => {
    if (theme === "dark") {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
      setTheme("light");
    } else {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
      setTheme("dark");
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setIsSearchOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const userDisplayName = session?.user?.name || "Investigator";
  const userEmail = session?.user?.email || "operator@crimegpt.local";
  const userImage = session?.user?.image;

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-zinc-50 dark:bg-zinc-950 font-sans text-zinc-900 dark:text-zinc-50 transition-colors duration-200">
      {/* Sidebar */}
      <aside className="hidden md:flex h-full w-64 flex-col border-r border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shrink-0">
        {/* Brand Header */}
        <div className="flex h-16 items-center px-6 border-b border-zinc-200 dark:border-zinc-800 gap-2.5">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-900 dark:bg-zinc-100 text-white dark:text-black">
              <ShieldAlert className="h-4.5 w-4.5" />
            </div>
            <div>
              <span className="font-semibold text-sm tracking-tight block">CrimeGPT</span>
              <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-mono leading-none block">Intelligence Platform</span>
            </div>
          </Link>
        </div>

        {/* Sidebar Nav Links */}
        <nav className="flex-1 space-y-1.5 px-4 py-6 overflow-y-auto">
          <div className="text-[10px] font-semibold tracking-wider text-zinc-400 dark:text-zinc-500 uppercase px-2 mb-2 font-mono">
            Navigation
          </div>
          {navigation.map((item) => {
            const isActive = pathname === item.href || (item.href !== "/case" && pathname.startsWith(item.href));
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  "group flex items-center justify-between rounded-lg px-3 py-2 text-xs font-medium transition-all",
                  isActive
                    ? "bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-50"
                    : "text-zinc-500 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 hover:text-zinc-900 dark:hover:text-zinc-200",
                  !item.active && "cursor-not-allowed opacity-60"
                )}
                onClick={(e) => {
                  if (!item.active) e.preventDefault();
                }}
              >
                <div className="flex items-center gap-2.5">
                  <item.icon className="h-4 w-4 shrink-0" />
                  <span>{item.name}</span>
                </div>
                {item.badge && (
                  <span className="rounded bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 px-1 py-0.5 text-[8px] font-mono text-zinc-500 dark:text-zinc-400">
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* User / Operator footer */}
        <div className="border-t border-zinc-200 dark:border-zinc-800 p-4 bg-zinc-50/50 dark:bg-zinc-900/50">
          <div className="flex items-center gap-3">
            {userImage ? (
              <img
                src={userImage}
                alt={userDisplayName}
                className="h-9 w-9 rounded-full border border-zinc-300 dark:border-zinc-700 object-cover"
              />
            ) : (
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-zinc-200 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 font-bold text-xs">
                {userDisplayName.charAt(0).toUpperCase()}
              </div>
            )}
            <div className="overflow-hidden flex-1">
              <span className="block text-xs font-semibold truncate">{userDisplayName}</span>
              <span className="block text-[9px] text-zinc-400 dark:text-zinc-500 font-mono truncate">{userEmail}</span>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col h-full overflow-hidden">
        {/* Top Header Bar */}
        <header className="flex h-16 items-center justify-between border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-6 shrink-0 z-30">
          {/* Breadcrumbs */}
          <div className="flex items-center gap-2 text-xs font-mono text-zinc-400 dark:text-zinc-500">
            <span>workspace</span>
            <span>/</span>
            <span className="text-zinc-900 dark:text-zinc-50 font-medium">cases</span>
          </div>

          {/* Search Trigger Button */}
          <button 
            onClick={() => setIsSearchOpen(true)}
            className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950/30 text-zinc-400 dark:text-zinc-500 hover:border-zinc-300 dark:hover:border-zinc-700 transition-all text-xs w-60 select-none cursor-pointer"
          >
            <Search className="h-3.5 w-3.5 shrink-0" />
            <span className="flex-1 text-left text-zinc-400 dark:text-zinc-500">Search repository...</span>
            <kbd className="text-[9px] font-mono border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-1.5 py-0.5 rounded leading-none shrink-0 shadow-xs">
              Ctrl+K
            </kbd>
          </button>

          {/* User Menu & Platform Status */}
          <div className="flex items-center gap-4">
            <div className="hidden lg:flex items-center gap-1.5 rounded-full border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 px-3 py-1 text-[10px] font-mono font-medium">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="text-zinc-600 dark:text-zinc-300">System Operational</span>
            </div>

            {/* Interactive User Dropdown Trigger */}
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                className="flex items-center gap-2 rounded-full focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-zinc-900 cursor-pointer"
              >
                {userImage ? (
                  <img
                    src={userImage}
                    alt={userDisplayName}
                    className="h-8 w-8 rounded-full border border-zinc-200 dark:border-zinc-700 object-cover"
                  />
                ) : (
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-350 font-bold text-xs">
                    {userDisplayName.charAt(0).toUpperCase()}
                  </div>
                )}
              </button>

              {/* User Dropdown Menu Card */}
              {isUserMenuOpen && (
                <div className="absolute right-0 mt-2.5 w-60 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-1.5 shadow-xl ring-1 ring-black/5 focus:outline-none z-50">
                  <div className="px-3 py-2.5 border-b border-zinc-100 dark:border-zinc-800/80">
                    <span className="block text-xs font-semibold text-zinc-900 dark:text-zinc-50 truncate">{userDisplayName}</span>
                    <span className="block text-[10px] text-zinc-500 dark:text-zinc-500 font-mono truncate mt-0.5">{userEmail}</span>
                  </div>
                  
                  <div className="py-1">
                    <Link
                      href="/case/settings"
                      className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-xs text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
                      onClick={() => setIsUserMenuOpen(false)}
                    >
                      <User className="h-4 w-4 text-zinc-400" />
                      <span>Profile & Account</span>
                    </Link>

                    <button
                      onClick={() => {
                        toggleTheme();
                        setIsUserMenuOpen(false);
                      }}
                      className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-xs text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                    >
                      {theme === "dark" ? (
                        <>
                          <Sun className="h-4 w-4 text-zinc-400" />
                          <span>Switch to Light Mode</span>
                        </>
                      ) : (
                        <>
                          <Moon className="h-4 w-4 text-zinc-400" />
                          <span>Switch to Dark Mode</span>
                        </>
                      )}
                    </button>
                  </div>

                  <div className="border-t border-zinc-100 dark:border-zinc-800/80 pt-1">
                    <button
                      onClick={() => {
                        setIsUserMenuOpen(false);
                        signOut({ callbackUrl: "/" });
                      }}
                      className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-xs text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors cursor-pointer font-medium"
                    >
                      <LogOut className="h-4 w-4" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Child Content View */}
        <main className="flex-1 overflow-y-auto bg-zinc-50/50 dark:bg-zinc-950/20">
          {children}
        </main>
      </div>

      {/* Global Search Dialog */}
      <SearchDialog open={isSearchOpen} onOpenChange={setIsSearchOpen} />
    </div>
  );
}
