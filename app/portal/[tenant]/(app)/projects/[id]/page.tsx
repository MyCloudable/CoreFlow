import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { portalContext, companyScope } from "@/lib/portal";
import { Badge, Card, PageHeader, ProgressBar, EmptyState } from "@/components/ui";
import { PROJECT_STATUSES, DELIVERABLE_STATUSES } from "@/lib/constants";
import { shortDate } from "@/lib/format";
import { addMilestone, toggleMilestone, updateProjectStatus } from "@/lib/actions";

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ tenant: string; id: string }>;
}) {
  const { tenant, user, isStaff } = await portalContext(params);
  const { id } = await params;

  const project = await db.project.findFirst({
    where: { id, tenantId: tenant.id, ...companyScope(user) },
    include: {
      company: true,
      milestones: { orderBy: { sortOrder: "asc" } },
      deliverables: { orderBy: { createdAt: "desc" } },
    },
  });
  if (!project) notFound();

  const total = project.milestones.length;
  const done = project.milestones.filter((m) => m.done).length;

  return (
    <div>
      <PageHeader
        title={project.name}
        subtitle={`${project.company.name}${project.dueDate ? ` · Due ${shortDate(project.dueDate)}` : ""}`}
        action={
          isStaff ? (
            <form action={updateProjectStatus} className="flex items-center gap-2">
              <input type="hidden" name="projectId" value={project.id} />
              <select className="input w-auto" name="status" defaultValue={project.status}>
                {Object.entries(PROJECT_STATUSES).map(([value, s]) => (
                  <option key={value} value={value}>{s.label}</option>
                ))}
              </select>
              <button className="btn-secondary" type="submit">Update</button>
            </form>
          ) : (
            <Badge map={PROJECT_STATUSES} value={project.status} />
          )
        }
      />

      {project.description && <p className="mb-6 max-w-2xl text-sm text-gray-600">{project.description}</p>}

      <div className="mb-6">
        <ProgressBar percent={total ? (done / total) * 100 : 0} />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card title={`Milestones (${done}/${total})`}>
          {project.milestones.length === 0 ? (
            <EmptyState message="No milestones yet." />
          ) : (
            <ul className="divide-y divide-gray-100">
              {project.milestones.map((m) => (
                <li key={m.id} className="flex items-center justify-between gap-3 py-2.5">
                  <div className="flex items-center gap-3">
                    {isStaff ? (
                      <form action={toggleMilestone}>
                        <input type="hidden" name="milestoneId" value={m.id} />
                        <button
                          type="submit"
                          aria-label={m.done ? "Mark incomplete" : "Mark complete"}
                          className={`flex h-5 w-5 items-center justify-center rounded border text-xs ${
                            m.done
                              ? "border-transparent bg-[var(--brand)] text-white"
                              : "border-gray-300 bg-white text-transparent hover:border-gray-400"
                          }`}
                        >
                          ✓
                        </button>
                      </form>
                    ) : (
                      <span
                        className={`flex h-5 w-5 items-center justify-center rounded border text-xs ${
                          m.done ? "border-transparent bg-[var(--brand)] text-white" : "border-gray-300 text-transparent"
                        }`}
                      >
                        ✓
                      </span>
                    )}
                    <span className={`text-sm ${m.done ? "text-gray-400 line-through" : "text-gray-900"}`}>
                      {m.title}
                    </span>
                  </div>
                  <span className="text-xs text-gray-500">{shortDate(m.dueDate)}</span>
                </li>
              ))}
            </ul>
          )}

          {isStaff && (
            <form action={addMilestone} className="mt-4 flex gap-2 border-t border-gray-100 pt-4">
              <input type="hidden" name="projectId" value={project.id} />
              <input className="input" name="title" placeholder="New milestone…" aria-label="New milestone title" required />
              <input className="input w-36" name="dueDate" type="date" aria-label="Milestone due date" />
              <button className="btn-secondary shrink-0" type="submit">Add</button>
            </form>
          )}
        </Card>

        <Card title="Deliverables on this project">
          {project.deliverables.length === 0 ? (
            <EmptyState message="No deliverables attached to this project." />
          ) : (
            <ul className="divide-y divide-gray-100">
              {project.deliverables.map((d) => (
                <li key={d.id} className="flex items-center justify-between gap-4 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-gray-900">{d.title}</p>
                    {d.linkUrl && (
                      <a href={d.linkUrl} className="text-xs text-[var(--brand)] hover:underline" target="_blank" rel="noreferrer">
                        Open link ↗
                      </a>
                    )}
                  </div>
                  <Badge map={DELIVERABLE_STATUSES} value={d.status} />
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
