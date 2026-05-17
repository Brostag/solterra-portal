import { redirect } from "next/navigation";
import { getPortalSessionFast } from "@/lib/auth/session";
import Sidebar from "@/components/portal/Sidebar";
import Topbar from "@/components/portal/Topbar";
import { AuthListener } from "@/components/portal/AuthListener";

export default async function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getPortalSessionFast();
  if (!session) redirect("/login");

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <Sidebar rol={session.rol} />
      <div className="flex flex-col flex-1 overflow-hidden">
        <Topbar
          nombre={session.nombre}
          email={session.email}
          rol={session.rol}
        />
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
        <AuthListener />
      </div>
    </div>
  );
}
