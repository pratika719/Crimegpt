import { caseClient } from "@/lib/api";
import { CasesDashboardClient } from "@/features/case/components/cases-dashboard-client";
import { requireUser } from "@/lib/auth/session";

export default async function CasesPage() {
  await requireUser();

  let cases: any[] = [];
  let initialError: string | null = null;

  try {
    cases = await caseClient.list();
  } catch (err: any) {
    console.error("[CasesPage SSR] Failed to fetch cases:", err);
    initialError = err?.message || "Failed to fetch cases during server rendering";
  }

  return <CasesDashboardClient initialCases={cases} initialError={initialError} />;
}