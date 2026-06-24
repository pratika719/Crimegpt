"use client";

import { useState, useEffect } from "react";
import { User, Shield, Moon, Sun, Key } from "lucide-react";

export function SettingsClient({ user }: { user: any }) {
  const [theme, setTheme] = useState<"light" | "dark">("dark");

  // Read current theme state from documentElement
  useEffect(() => {
    const isDark = document.documentElement.classList.contains("dark") || 
                   localStorage.getItem("theme") === "dark";
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTheme(isDark ? "dark" : "light");
  }, []);

  const toggleTheme = (newTheme: "light" | "dark") => {
    if (newTheme === "light") {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
      setTheme("light");
    } else {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
      setTheme("dark");
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Profile Information */}
      <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 space-y-4">
        <div className="flex items-center gap-2 border-b border-zinc-200 dark:border-zinc-800/80 pb-3">
          <User className="h-4 w-4 text-teal-400" />
          <h2 className="text-sm font-semibold">Profile Information</h2>
        </div>

        <div className="flex flex-col sm:flex-row gap-6 items-start sm:items-center">
          {user.image ? (
            <img
              src={user.image}
              alt={user.name || "Operator"}
              className="h-16 w-16 rounded-full border border-zinc-300 dark:border-zinc-700 object-cover"
            />
          ) : (
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-zinc-200 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 font-bold text-xl font-mono">
              {user.name ? user.name.charAt(0).toUpperCase() : "U"}
            </div>
          )}

          <div className="flex-1 space-y-3 w-full">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-mono text-zinc-400 dark:text-zinc-500 uppercase">Operator Name</label>
                <div className="mt-1 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 px-3 py-2 text-xs text-zinc-700 dark:text-zinc-300 font-medium truncate">
                  {user.name || "N/A"}
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-mono text-zinc-400 dark:text-zinc-500 uppercase">Clearance Email</label>
                <div className="mt-1 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 px-3 py-2 text-xs text-zinc-700 dark:text-zinc-300 font-medium truncate">
                  {user.email || "N/A"}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Theme Toggle Settings */}
      <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 space-y-4">
        <div className="flex items-center gap-2 border-b border-zinc-200 dark:border-zinc-800/80 pb-3">
          <Moon className="h-4 w-4 text-teal-400" />
          <h2 className="text-sm font-semibold">Theme Settings</h2>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">System Theme Mode</h3>
            <p className="text-[10px] text-zinc-400 dark:text-zinc-500 font-medium mt-0.5">Toggle workspace visual contrast setting.</p>
          </div>

          <div className="flex rounded-lg border border-zinc-200 dark:border-zinc-800 p-0.5 bg-zinc-50 dark:bg-zinc-950">
            <button
              onClick={() => toggleTheme("light")}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                theme === "light"
                  ? "bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50 shadow-sm"
                  : "text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
              }`}
            >
              <Sun className="h-3.5 w-3.5" />
              <span>Light</span>
            </button>
            <button
              onClick={() => toggleTheme("dark")}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                theme === "dark"
                  ? "bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50 shadow-sm"
                  : "text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
              }`}
            >
              <Moon className="h-3.5 w-3.5" />
              <span>Dark</span>
            </button>
          </div>
        </div>
      </div>

      {/* 3. Account Information */}
      <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 space-y-4">
        <div className="flex items-center gap-2 border-b border-zinc-200 dark:border-zinc-800/80 pb-3">
          <Key className="h-4 w-4 text-teal-400" />
          <h2 className="text-sm font-semibold">Account Information</h2>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-[10px] font-mono text-zinc-400 dark:text-zinc-500 uppercase">Operator ID Reference</label>
            <div className="mt-1 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 px-3 py-2 text-xs font-mono text-zinc-500 dark:text-zinc-400 select-all truncate">
              {user.email ? `OP-${user.email.split("@")[0].toUpperCase()}` : "N/A"}
            </div>
          </div>

          <div className="flex items-center justify-between text-xs pt-1.5">
            <span className="text-zinc-500 font-medium">Provider Desk</span>
            <div className="flex items-center gap-1.5 rounded-md border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950/50 px-2.5 py-1 text-[10px] font-mono">
              <Shield className="h-3.5 w-3.5 text-teal-500" />
              <span className="text-zinc-600 dark:text-zinc-300">Authorized Google Identity</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
