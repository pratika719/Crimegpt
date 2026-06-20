import { signIn, auth } from "@/auth";
import { redirect } from "next/navigation";
import { ShieldAlert } from "lucide-react";

export default async function LoginPage() {
  const session = await auth();
  if (session?.user?.id) {
    redirect("/case");
  }

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-zinc-950 text-zinc-50 select-none">
      {/* Dynamic Background Gradients */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-indigo-500/10 rounded-full blur-3xl opacity-60"></div>
      <div className="absolute top-1/4 left-1/3 w-[300px] h-[300px] bg-teal-500/10 rounded-full blur-3xl opacity-40"></div>

      <div className="relative w-full max-w-md p-8 rounded-2xl border border-zinc-800 bg-zinc-900/60 backdrop-blur-xl shadow-2xl flex flex-col items-center text-center space-y-8">
        {/* Brand Header */}
        <div className="space-y-3">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-teal-500/10 border border-teal-500/30 text-teal-400">
            <ShieldAlert className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-zinc-50 via-zinc-200 to-zinc-400 bg-clip-text text-transparent">
              Access CrimeGPT
            </h1>
            <p className="text-xs text-zinc-400 font-mono mt-1 uppercase tracking-wider">
              Law Enforcement Intelligence Platform
            </p>
          </div>
        </div>

        {/* Security Alert Banner */}
        <div className="w-full text-[11px] leading-relaxed text-zinc-400 bg-zinc-950/50 border border-zinc-800 p-4 rounded-xl text-left font-mono">
          <span className="text-teal-400 font-bold block mb-1">NOTICE TO USER:</span>
          This system is restricted to authorized operations. Authorized personnel must authenticate to access the investigation workspace. Activity is monitored and logged in compliance with guidelines.
        </div>

        {/* Auth Button */}
        <form
          action={async () => {
            "use server";
            await signIn("google");
          }}
          className="w-full"
        >
          <button
            type="submit"
            className="w-full flex items-center justify-center gap-3 rounded-xl border border-zinc-700 bg-white hover:bg-zinc-100 text-zinc-900 px-5 py-3 text-sm font-semibold shadow-sm transition-all cursor-pointer hover:border-zinc-500"
          >
            {/* Google Icon */}
            <svg className="h-4.5 w-4.5 shrink-0" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v3.93h6.58c-.28 1.45-1.11 2.68-2.34 3.51v2.91h3.79c2.22-2.05 3.71-5.07 3.71-8.38z"
              />
              <path
                fill="#34A853"
                d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.79-2.91c-1.05.7-2.4 1.12-4.14 1.12-3.18 0-5.88-2.15-6.84-5.07H1.36v3.01C3.33 21.28 7.37 24 12 24z"
              />
              <path
                fill="#FBBC05"
                d="M5.16 14.23a7.25 7.25 0 0 1 0-4.46V6.76H1.36a11.96 11.96 0 0 0 0 10.48l3.8-3.01z"
              />
              <path
                fill="#EA4335"
                d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.43-3.43C17.95 1.19 15.24 0 12 0 7.37 0 3.33 2.72 1.36 6.76l3.8 3.01c.96-2.92 3.66-5.07 6.84-5.07z"
              />
            </svg>
            <span>Continue with Google</span>
          </button>
        </form>

        {/* Footer */}
        <div className="text-[10px] text-zinc-500 font-mono">
          SECURE INTERFACE • SYSTEM REF: {new Date().getFullYear()}
        </div>
      </div>
    </div>
  );
}
