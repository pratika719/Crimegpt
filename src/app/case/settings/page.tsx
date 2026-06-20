import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { SettingsClient } from "./settings-client";

export const metadata = {
  title: "Settings - CrimeGPT Intelligence Platform",
  description: "View operator profiles, system theme toggles, and clearance account settings.",
};

export default async function SettingsPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  return (
    <div className="p-6 md:p-8 max-w-2xl mx-auto space-y-8 select-none">
      <div className="border-b border-zinc-200 dark:border-zinc-800 pb-4">
        <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50 font-sans">
          Settings
        </h1>
        <p className="text-xs text-zinc-400 dark:text-zinc-500 font-mono mt-1">
          SYSTEM PARAMETERS & ACCOUNT DESK
        </p>
      </div>

      <SettingsClient user={session.user} />
    </div>
  );
}
