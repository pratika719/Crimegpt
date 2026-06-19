import { auditService } from "@/services/activity/audit.service";
import { AuditDashboardClient } from "@/features/audit/components/audit-dashboard-client";

export const metadata = {
  title: "Audit Logs - CrimeGPT Intelligence Platform",
  description: "View compliance records, manual operations, and AI generation audit logs.",
};

// Force dynamic so that database activities are retrieved fresh
export const dynamic = "force-dynamic";

export default async function AuditLogsPage() {
  // Fetch initial audit logs (page 1, limit 20, newest first)
  const initialData = await auditService.getAuditLogs({
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
