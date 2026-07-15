import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { portalContext } from "@/lib/portal";
import { seatCount, monthlyTotalCents, billableSeats } from "@/lib/billing";
import { Card, PageHeader, Table } from "@/components/ui";
import { money } from "@/lib/format";
import { createTeamMember, setUserActive } from "@/lib/actions";
import { ROLES, SEAT_ROLES, type Role } from "@/lib/constants";

export default async function TeamPage({ params }: { params: Promise<{ tenant: string }> }) {
  const { tenant, user, isOwner } = await portalContext(params);
  if (!isOwner) redirect("/");

  const [team, seats] = await Promise.all([
    db.user.findMany({
      where: { tenantId: tenant.id, role: { in: [...SEAT_ROLES] } },
      orderBy: [{ active: "desc" }, { name: "asc" }],
    }),
    seatCount(tenant.id),
  ]);

  return (
    <div>
      <PageHeader
        title="Team"
        subtitle={`${seats} active seat${seats === 1 ? "" : "s"} (${tenant.includedSeats} included in your plan) · ${money(
          monthlyTotalCents(tenant, seats)
        )}/mo${
          billableSeats(tenant, seats) > 0
            ? ` (base ${money(tenant.basePriceCents)} + ${billableSeats(tenant, seats)} × ${money(tenant.seatPriceCents)})`
            : ""
        }`}
      />

      <div className="grid gap-6 xl:grid-cols-[1fr_24rem]">
        <Table headers={["Member", "Role", "Status", ""]}>
          {team.map((m) => (
            <tr key={m.id} className="hover:bg-gray-50/60">
              <td className="px-4 py-3">
                <p className="font-medium text-gray-900">{m.name}{m.id === user.id && <span className="ml-1.5 text-xs font-normal text-gray-400">(you)</span>}</p>
                <p className="text-xs text-gray-500">{m.email}</p>
              </td>
              <td className="px-4 py-3 text-gray-600">{ROLES[m.role as Role] ?? m.role}</td>
              <td className="px-4 py-3">
                <span className={`text-xs font-medium ${m.active ? "text-green-700" : "text-gray-400"}`}>
                  {m.active ? "Active" : "Deactivated"}
                </span>
              </td>
              <td className="px-4 py-3 text-right">
                {m.id !== user.id && (
                  <form action={setUserActive}>
                    <input type="hidden" name="userId" value={m.id} />
                    <input type="hidden" name="active" value={m.active ? "false" : "true"} />
                    <button className="btn-secondary text-xs" type="submit">
                      {m.active ? "Deactivate" : "Reactivate"}
                    </button>
                  </form>
                )}
              </td>
            </tr>
          ))}
        </Table>

        <Card title="Add team member">
          <p className="mb-4 text-xs text-gray-500">
            Your plan includes {tenant.includedSeats} seats; each additional active team member is{" "}
            {money(tenant.seatPriceCents)}/mo. Client logins are always free.
          </p>
          <form action={createTeamMember} className="space-y-4">
            <div>
              <label className="label" htmlFor="member-name">Name</label>
              <input id="member-name" className="input" name="name" required />
            </div>
            <div>
              <label className="label" htmlFor="member-email">Email</label>
              <input id="member-email" className="input" name="email" type="email" required />
            </div>
            <div>
              <label className="label" htmlFor="member-role">Role</label>
              <select id="member-role" className="input" name="role" defaultValue="STAFF">
                <option value="STAFF">Staff</option>
                <option value="TECH">Technician (mobile field portal)</option>
                <option value="OWNER">Owner (full admin)</option>
              </select>
            </div>
            <div>
              <label className="label" htmlFor="member-password">Temporary password (8+ characters)</label>
              <input id="member-password" className="input" name="password" type="text" required minLength={8} />
            </div>
            <button className="btn-brand" type="submit">Add member</button>
          </form>
        </Card>
      </div>
    </div>
  );
}
