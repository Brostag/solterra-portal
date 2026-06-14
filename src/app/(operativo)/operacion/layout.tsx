import { redirect } from "next/navigation";
import { getPortalSessionFast } from "@/lib/auth/session";
import { canAccessModule, landingFor } from "@/lib/modules";

export default async function OperacionLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getPortalSessionFast();
  if (!session) redirect("/login");
  if (!canAccessModule(session, "OPERACION")) redirect(landingFor(session));
  return <>{children}</>;
}
