import { db } from "@/lib/db";
import { portalContext } from "@/lib/portal";
import { Card, PageHeader } from "@/components/ui";
import { TICKET_PRIORITIES } from "@/lib/constants";
import { createTicket } from "@/lib/actions";

export default async function NewTicketPage({ params }: { params: Promise<{ tenant: string }> }) {
  const { tenant, isStaff } = await portalContext(params);
  const companies = isStaff
    ? await db.clientCompany.findMany({ where: { tenantId: tenant.id }, orderBy: { name: "asc" } })
    : [];

  return (
    <div className="max-w-xl">
      <PageHeader title="New ticket" subtitle="Describe the issue or request and we'll get on it." />
      <Card>
        <form action={createTicket} className="space-y-4">
          {isStaff && (
            <div>
              <label className="label" htmlFor="t-company">Client</label>
              <select id="t-company" className="input" name="companyId" required>
                {companies.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          )}
          <div>
            <label className="label" htmlFor="t-subject">Subject</label>
            <input id="t-subject" className="input" name="subject" required placeholder="Brief summary" />
          </div>
          <div>
            <label className="label" htmlFor="t-priority">Priority</label>
            <select id="t-priority" className="input" name="priority" defaultValue="NORMAL">
              {Object.entries(TICKET_PRIORITIES).map(([value, p]) => (
                <option key={value} value={value}>{p.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="t-body">Message</label>
            <textarea id="t-body" className="input" name="body" rows={5} required placeholder="What do you need?" />
          </div>
          <button className="btn-brand" type="submit">Open ticket</button>
        </form>
      </Card>
    </div>
  );
}
