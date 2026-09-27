import { auditClient } from "@/lib/api";
import { AuditDashboardClient } from "@/features/audit/components/audit-dashboard-client";
import { requireUser } from "@/lib/auth/session";

export const metadata = {
  title: "Audit Logs - CrimeGPT Intelligence Platform",
  description: "View compliance records, manual operations, and AI generation audit logs.",
};

export const dynamic = "force-dynamic";

export default async function AuditLogsPage() {
  await requireUser();

  // Fetch initial audit logs (page 1, limit 20, newest first)
  const initialData = await auditClient.getLogs({
    page: 1,
    limit: 20,
    sortOrder: "desc",
  }).catch(() => ({
    activities: [],
    stats: { totalCount: 0, aiCount: 0, severeCount: 0, userCount: 0 },
    pagination: { total: 0, totalPages: 1, currentPage: 1, limit: 20 },
  }));

  return (
    <div className="min-h-full">
      <AuditDashboardClient initialData={initialData} />
    </div>
  );
}
