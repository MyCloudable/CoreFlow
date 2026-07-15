import { db } from "@/lib/db";
import { portalContext, companyScope } from "@/lib/portal";
import { Badge, Card, PageHeader, ProgressBar, EmptyState, Table, RowLink } from "@/components/ui";
import { PROJECT_STATUSES } from "@/lib/constants";
import { shortDate } from "@/lib/format";
import { createProject } from "@/lib/actions";

export default async function ProjectsPage({ params }: { params: Promise<{ tenant: string }> }) {
  const { tenant, user, isStaff } = await portalContext(params);

  const [projects, companies] = await Promise.all([
    db.project.findMany({
      where: { tenantId: tenant.id, ...companyScope(user) },
      include: { company: true, milestones: true },
      orderBy: { createdAt: "desc" },
    }),
    isStaff
      ? db.clientCompany.findMany({ where: { tenantId: tenant.id }, orderBy: { name: "asc" } })
      : Promise.resolve([]),
  ]);

  return (
    <div>
      <PageHeader title="Projects" subtitle={isStaff ? "All client projects." : "Your projects and progress."} />

      {projects.length === 0 ? (
        <EmptyState message="No projects yet." />
      ) : (
        <Table headers={isStaff ? ["Project", "Client", "Progress", "Status", "Due"] : ["Project", "Progress", "Status", "Due"]}>
          {projects.map((p) => {
            const total = p.milestones.length;
            const done = p.milestones.filter((m) => m.done).length;
            return (
              <tr key={p.id} className="hover:bg-gray-50/60">
                <td className="px-4 py-3">
                  <RowLink href={`/projects/${p.id}`}>{p.name}</RowLink>
                </td>
                {isStaff && <td className="px-4 py-3 text-gray-600">{p.company.name}</td>}
                <td className="px-4 py-3"><ProgressBar percent={total ? (done / total) * 100 : 0} /></td>
                <td className="px-4 py-3"><Badge map={PROJECT_STATUSES} value={p.status} /></td>
                <td className="px-4 py-3 text-gray-600">{shortDate(p.dueDate)}</td>
              </tr>
            );
          })}
        </Table>
      )}

      {isStaff && (
        <div className="mt-8 max-w-xl">
          <Card title="New project">
            <form action={createProject} className="space-y-4">
              <div>
                <label className="label" htmlFor="project-company">Client</label>
                <select id="project-company" className="input" name="companyId" required>
                  {companies.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label" htmlFor="project-name">Project name</label>
                <input id="project-name" className="input" name="name" required placeholder="Website redesign" />
              </div>
              <div>
                <label className="label" htmlFor="project-description">Description</label>
                <textarea id="project-description" className="input" name="description" rows={2} />
              </div>
              <div>
                <label className="label" htmlFor="project-due">Due date</label>
                <input id="project-due" className="input" name="dueDate" type="date" />
              </div>
              <button className="btn-brand" type="submit">Create project</button>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
}
