import { caseClient } from "@/lib/api";
import { CasesDashboardClient } from "@/features/case/components/cases-dashboard-client";
import { requireUser } from "@/lib/auth/session";

export default async function CasesPage() {
  await requireUser();

  const cases = await caseClient.list().catch(() => []);

  return <CasesDashboardClient initialCases={cases as any} />;
}