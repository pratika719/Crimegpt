import { auditService } from "@/services/activity/audit.service";
import { AuditDashboardClient } from "@/features/audit/components/audit-dashboard-client";
import { auth } from "@/auth";
import { redirect } from "next/navigation";

export const metadata = {
  title: "Audit Logs - CrimeGPT Intelligence Platform",
  description: "View compliance records, manual operations, and AI generation audit logs.",
};

// Force dynamic so that database activities are retrieved fresh
export const dynamic = "force-dynamic";

export default async function AuditLogsPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  // Fetch initial audit logs (page 1, limit 20, newest first)
  const initialData = await auditService.getAuditLogs(session.user.id, {
    page: 1,
    limit: 20,
    sortOrder: "desc",
  });

  return (
    <div className="min-h-full">
      <AuditDashboardClient initialData={initialData} />
    </div>
  );
}
