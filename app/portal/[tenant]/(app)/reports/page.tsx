import { db } from "@/lib/db";
import { portalContext, companyScope } from "@/lib/portal";
import { Card, PageHeader, EmptyState, Table, RowLink } from "@/components/ui";
import { shortDate } from "@/lib/format";
import { createReport, toggleReportPublished } from "@/lib/actions";

export default async function ReportsPage({ params }: { params: Promise<{ tenant: string }> }) {
  const { tenant, user, isStaff } = await portalContext(params);

  const [reports, companies] = await Promise.all([
    db.report.findMany({
      where: {
        tenantId: tenant.id,
        ...companyScope(user),
        // Clients only ever see published reports.
        ...(isStaff ? {} : { publishedAt: { not: null } }),
      },
      include: { company: true },
      orderBy: { createdAt: "desc" },
    }),
    isStaff
      ? db.clientCompany.findMany({ where: { tenantId: tenant.id }, orderBy: { name: "asc" } })
      : Promise.resolve([]),
  ]);

  return (
    <div>
      <PageHeader
        title="Reports"
        subtitle={isStaff ? "Client-facing reports. Unpublished drafts are only visible to your team." : "Reports prepared for you."}
      />

      {reports.length === 0 ? (
        <EmptyState message="No reports yet." />
      ) : (
        <Table headers={isStaff ? ["Report", "Client", "Period", "Published", ""] : ["Report", "Period", "Published"]}>
          {reports.map((r) => (
            <tr key={r.id} className="hover:bg-gray-50/60">
              <td className="px-4 py-3"><RowLink href={`/reports/${r.id}`}>{r.title}</RowLink></td>
              {isStaff && <td className="px-4 py-3 text-gray-600">{r.company.name}</td>}
              <td className="px-4 py-3 text-gray-600">{r.periodLabel ?? "—"}</td>
              <td className="px-4 py-3 text-gray-600">
                {r.publishedAt ? shortDate(r.publishedAt) : <span className="text-amber-600">Draft</span>}
              </td>
              {isStaff && (
                <td className="px-4 py-3 text-right">
                  <form action={toggleReportPublished}>
                    <input type="hidden" name="reportId" value={r.id} />
                    <button className="btn-secondary text-xs" type="submit">
                      {r.publishedAt ? "Unpublish" : "Publish"}
                    </button>
                  </form>
                </td>
              )}
            </tr>
          ))}
        </Table>
      )}

      {isStaff && (
        <div className="mt-8 max-w-xl">
          <Card title="New report">
            <form action={createReport} className="space-y-4">
              <div>
                <label className="label" htmlFor="report-company">Client</label>
                <select id="report-company" className="input" name="companyId" required>
                  {companies.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label" htmlFor="report-title">Title</label>
                <input id="report-title" className="input" name="title" required placeholder="Monthly performance report" />
              </div>
              <div>
                <label className="label" htmlFor="report-period">Period</label>
                <input id="report-period" className="input" name="periodLabel" placeholder="July 2026" />
              </div>
              <div>
                <label className="label" htmlFor="report-body">Body</label>
                <textarea id="report-body" className="input" name="body" rows={8} required placeholder="Write the report…" />
              </div>
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input type="checkbox" name="publish" value="1" defaultChecked />
                Publish immediately (visible to the client)
              </label>
              <button className="btn-brand" type="submit">Create report</button>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
}
