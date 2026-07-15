import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { portalContext, companyScope } from "@/lib/portal";
import { PageHeader } from "@/components/ui";
import { shortDate } from "@/lib/format";
import { toggleReportPublished } from "@/lib/actions";

export default async function ReportDetailPage({
  params,
}: {
  params: Promise<{ tenant: string; id: string }>;
}) {
  const { tenant, user, isStaff } = await portalContext(params);
  const { id } = await params;

  const report = await db.report.findFirst({
    where: {
      id,
      tenantId: tenant.id,
      ...companyScope(user),
      ...(isStaff ? {} : { publishedAt: { not: null } }),
    },
    include: { company: true },
  });
  if (!report) notFound();

  return (
    <div className="max-w-3xl">
      <PageHeader
        title={report.title}
        subtitle={`${report.company.name}${report.periodLabel ? ` · ${report.periodLabel}` : ""} · ${
          report.publishedAt ? `Published ${shortDate(report.publishedAt)}` : "Draft (not visible to client)"
        }`}
        action={
          isStaff ? (
            <form action={toggleReportPublished}>
              <input type="hidden" name="reportId" value={report.id} />
              <button className="btn-secondary" type="submit">
                {report.publishedAt ? "Unpublish" : "Publish"}
              </button>
            </form>
          ) : undefined
        }
      />

      <article className="rounded-xl border border-gray-200 bg-white p-8 shadow-sm">
        <div className="whitespace-pre-wrap text-[15px] leading-relaxed text-gray-800">{report.body}</div>
      </article>
    </div>
  );
}
