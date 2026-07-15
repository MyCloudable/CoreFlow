import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { adminLogin } from "@/lib/actions";
import { FoxMark } from "@/components/logo";

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const user = await getCurrentUser();
  if (user?.role === "PLATFORM_ADMIN") redirect("/admin");

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-900 p-6">
      <div className="w-full max-w-sm">
        <div className="mb-3 flex justify-center">
          <FoxMark className="h-14 w-14" />
        </div>
        <h1 className="mb-1 text-center text-xl font-semibold text-white">
          Service<span className="text-orange-500">Fox</span> Admin
        </h1>
        <p className="mb-6 text-center text-sm text-gray-400">Operator console — not for tenants or clients</p>
        <form action={adminLogin} className="space-y-4 rounded-xl bg-white p-6 shadow-lg">
          {error && (
            <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">Invalid email or password.</p>
          )}
          <div>
            <label className="label" htmlFor="email">Email</label>
            <input className="input" id="email" name="email" type="email" required autoFocus />
          </div>
          <div>
            <label className="label" htmlFor="password">Password</label>
            <input className="input" id="password" name="password" type="password" required />
          </div>
          <button className="btn w-full bg-gray-900 text-white hover:bg-gray-800" type="submit">Sign in</button>
        </form>
      </div>
    </div>
  );
}
