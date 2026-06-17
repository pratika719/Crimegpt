import { CaseService } from "@/services/case/case.services";
import { CasesDashboardClient } from "@/features/case/components/cases-dashboard-client";

export default async function CasesPage() {
  const service = new CaseService();
  const cases = await service.getCases();

  return <CasesDashboardClient initialCases={cases} />;
}