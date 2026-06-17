"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  FolderOpen, 
  Settings, 
  Activity, 
  Database, 
  User, 
  Terminal, 
  ShieldAlert,
  Search,
  BookOpen
} from "lucide-react";
import { cn } from "@/lib/utils";

const navigation = [
  { name: "Cases", href: "/case", icon: FolderOpen, active: true },
  { name: "Legal Database", href: "#", icon: BookOpen, active: false, badge: "Coming Soon" },
  { name: "Audit Logs", href: "#", icon: Terminal, active: false, badge: "Admin Only" },
  { name: "System Config", href: "#", icon: Settings, active: false },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-zinc-50 dark:bg-zinc-950 font-sans text-zinc-900 dark:text-zinc-50">
      {/* Sidebar */}
      <aside className="hidden md:flex h-full w-64 flex-col border-r border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
        {/* Brand Header */}
        <div className="flex h-16 items-center px-6 border-b border-zinc-200 dark:border-zinc-800 gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-900 dark:bg-zinc-100 text-white dark:text-black">
            <ShieldAlert className="h-4.5 w-4.5" />
          </div>
          <div>
            <span className="font-semibold text-sm tracking-tight block">CrimeGPT</span>
            <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-mono leading-none block">Intelligence Platform</span>
          </div>
        </div>

        {/* Sidebar Nav Links */}
        <nav className="flex-1 space-y-1.5 px-4 py-6">
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
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-zinc-200 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700">
              <User className="h-4 w-4 text-zinc-600 dark:text-zinc-400" />
            </div>
            <div className="overflow-hidden">
              <span className="block text-xs font-medium truncate">Investigator #309</span>
              <span className="block text-[10px] text-zinc-400 dark:text-zinc-500 font-mono truncate">Clearance Level III</span>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col h-full overflow-hidden">
        {/* Top Header Bar */}
        <header className="flex h-16 items-center justify-between border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-6 shrink-0">
          {/* Breadcrumbs */}
          <div className="flex items-center gap-2 text-xs font-mono text-zinc-400 dark:text-zinc-500">
            <span>workspace</span>
            <span>/</span>
            <span className="text-zinc-900 dark:text-zinc-50 font-medium">cases</span>
          </div>

          {/* Platform Status */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 rounded-full border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 px-3 py-1 text-[10px] font-mono font-medium">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="text-zinc-600 dark:text-zinc-300">System Operational</span>
            </div>
          </div>
        </header>

        {/* Child Content View */}
        <main className="flex-1 overflow-y-auto bg-zinc-50/50 dark:bg-zinc-950/20">
          {children}
        </main>
      </div>
    </div>
  );
}
