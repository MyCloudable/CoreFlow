import { db } from "@/lib/db";
import { portalContext, companyScope } from "@/lib/portal";
import { Badge, Card, PageHeader, EmptyState, Table } from "@/components/ui";
import { DELIVERABLE_STATUSES } from "@/lib/constants";
import { shortDate } from "@/lib/format";
import { createDeliverable, setDeliverableStatus } from "@/lib/actions";

export default async function DeliverablesPage({ params }: { params: Promise<{ tenant: string }> }) {
  const { tenant, user, isStaff } = await portalContext(params);

  const [deliverables, companies, projects] = await Promise.all([
    db.deliverable.findMany({
      where: { tenantId: tenant.id, ...companyScope(user) },
      include: { company: true, project: true },
      orderBy: { createdAt: "desc" },
    }),
    isStaff
      ? db.clientCompany.findMany({ where: { tenantId: tenant.id }, orderBy: { name: "asc" } })
      : Promise.resolve([]),
    isStaff
      ? db.project.findMany({ where: { tenantId: tenant.id }, include: { company: true }, orderBy: { name: "asc" } })
      : Promise.resolve([]),
  ]);

  return (
    <div>
      <PageHeader
        title="Deliverables"
        subtitle={isStaff ? "Work you've shipped to clients." : "Everything delivered to you — review and approve."}
      />

      {deliverables.length === 0 ? (
        <EmptyState message="No deliverables yet." />
      ) : (
        <Table headers={isStaff ? ["Deliverable", "Client", "Project", "Delivered", "Status", ""] : ["Deliverable", "Project", "Delivered", "Status", ""]}>
          {deliverables.map((d) => (
            <tr key={d.id} className="hover:bg-gray-50/60">
              <td className="px-4 py-3">
                <p className="font-medium text-gray-900">{d.title}</p>
                {d.description && <p className="max-w-md truncate text-xs text-gray-500">{d.description}</p>}
                {d.linkUrl && (
                  <a href={d.linkUrl} target="_blank" rel="noreferrer" className="text-xs text-[var(--brand)] hover:underline">
                    Open link ↗
                  </a>
                )}
              </td>
              {isStaff && <td className="px-4 py-3 text-gray-600">{d.company.name}</td>}
              <td className="px-4 py-3 text-gray-600">{d.project?.name ?? "—"}</td>
              <td className="px-4 py-3 text-gray-600">{shortDate(d.deliveredAt)}</td>
              <td className="px-4 py-3"><Badge map={DELIVERABLE_STATUSES} value={d.status} /></td>
              <td className="px-4 py-3 text-right">
                {isStaff && d.status === "IN_PROGRESS" && (
                  <form action={setDeliverableStatus}>
                    <input type="hidden" name="deliverableId" value={d.id} />
                    <input type="hidden" name="status" value="DELIVERED" />
                    <button className="btn-secondary text-xs" type="submit">Mark delivered</button>
                  </form>
                )}
                {!isStaff && d.status === "DELIVERED" && (
                  <form action={setDeliverableStatus}>
                    <input type="hidden" name="deliverableId" value={d.id} />
                    <input type="hidden" name="status" value="APPROVED" />
                    <button className="btn-brand text-xs" type="submit">Approve</button>
                  </form>
                )}
              </td>
            </tr>
          ))}
        </Table>
      )}

      {isStaff && (
        <div className="mt-8 max-w-xl">
          <Card title="New deliverable">
            <form action={createDeliverable} className="space-y-4">
              <div>
                <label className="label" htmlFor="deliverable-company">Client</label>
                <select id="deliverable-company" className="input" name="companyId" required>
                  {companies.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label" htmlFor="deliverable-project">Project (optional — must belong to the same client)</label>
                <select id="deliverable-project" className="input" name="projectId" defaultValue="">
                  <option value="">None</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>{p.company.name} — {p.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label" htmlFor="deliverable-title">Title</label>
                <input id="deliverable-title" className="input" name="title" required placeholder="Q3 brand guidelines PDF" />
              </div>
              <div>
                <label className="label" htmlFor="deliverable-description">Description</label>
                <textarea id="deliverable-description" className="input" name="description" rows={2} />
              </div>
              <div>
                <label className="label" htmlFor="deliverable-link">Link (Drive, Dropbox, Figma…)</label>
                <input id="deliverable-link" className="input" name="linkUrl" type="url" placeholder="https://…" />
              </div>
              <button className="btn-brand" type="submit">Add deliverable</button>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
}
