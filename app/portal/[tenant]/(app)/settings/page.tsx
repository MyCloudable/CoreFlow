import { redirect } from "next/navigation";
import { portalContext } from "@/lib/portal";
import { Card, PageHeader } from "@/components/ui";
import { updateBranding } from "@/lib/actions";

export default async function SettingsPage({ params }: { params: Promise<{ tenant: string }> }) {
  const { tenant, isOwner } = await portalContext(params);
  if (!isOwner) redirect("/");

  return (
    <div className="max-w-xl">
      <PageHeader
        title="Portal settings"
        subtitle="How your portal looks to clients. Changes apply immediately."
      />

      <Card>
        <form action={updateBranding} className="space-y-4">
          <div>
            <label className="label" htmlFor="settings-name">Business name</label>
            <input id="settings-name" className="input" name="name" defaultValue={tenant.name} required />
          </div>
          <div>
            <label className="label" htmlFor="settings-color">Brand color</label>
            <div className="flex items-center gap-3">
              <input
                id="settings-color"
                type="color"
                name="brandColor"
                defaultValue={tenant.brandColor}
                className="h-10 w-14 cursor-pointer rounded-md border border-gray-300 bg-white p-1"
              />
              <span className="text-xs text-gray-500">Used for buttons, links, and accents across the portal.</span>
            </div>
          </div>
          <div>
            <label className="label" htmlFor="settings-logo">Logo URL (square works best; leave blank to use your initial)</label>
            <input id="settings-logo" className="input" name="logoUrl" type="url" defaultValue={tenant.logoUrl ?? ""} placeholder="https://…/logo.png" />
          </div>
          <div>
            <label className="label" htmlFor="settings-support">Support email (shown to clients on the login page)</label>
            <input id="settings-support" className="input" name="supportEmail" type="email" defaultValue={tenant.supportEmail ?? ""} />
          </div>
          <button className="btn-brand" type="submit">Save settings</button>
        </form>
      </Card>

      <p className="mt-4 text-xs text-gray-500">
        Your portal address: <span className="font-mono">{tenant.slug}.{process.env.ROOT_DOMAIN ?? "localhost:3000"}</span>
      </p>
    </div>
  );
}
