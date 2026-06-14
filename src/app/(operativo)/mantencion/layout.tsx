import { redirect } from "next/navigation";
import { getPortalSessionFast } from "@/lib/auth/session";
import { canAccessModule, landingFor } from "@/lib/modules";

export default async function MantencionLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getPortalSessionFast();
  if (!session) redirect("/login");
  if (!canAccessModule(session, "MANTENCION")) redirect(landingFor(session));
  return <>{children}</>;
}
