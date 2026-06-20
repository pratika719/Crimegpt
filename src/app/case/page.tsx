import { CaseService } from "@/services/case/case.services";
import { CasesDashboardClient } from "@/features/case/components/cases-dashboard-client";
import { auth } from "@/auth";
import { redirect } from "next/navigation";

export default async function CasesPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const service = new CaseService();
  const cases = await service.getCases(session.user.id);

  return <CasesDashboardClient initialCases={cases} />;
}