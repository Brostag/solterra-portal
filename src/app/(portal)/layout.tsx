import { redirect } from "next/navigation";
import { getPortalSessionFast } from "@/lib/auth/session";
import PortalShell from "@/components/portal/PortalShell";

export default async function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getPortalSessionFast();
  if (!session) redirect("/login");

  return (
    <PortalShell nombre={session.nombre} email={session.email} rol={session.rol}>
      {children}
    </PortalShell>
  );
}
