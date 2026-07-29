import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { esSoporte } from "@/lib/soporte";
import { landingFor } from "@/lib/modules";
import type { UserSession } from "@/types";

// Guard de acceso de la bandeja de soporte. SERVER-ONLY: arrastra getSession →
// prisma → redirect. El vocabulario de presentación (colores, etiquetas,
// formato de fecha) vive en `./vocabulario`, que sí es importable desde un
// componente cliente. No devolver constantes de UI desde acá.

/**
 * Guard de las páginas de la bandeja. Usa getSession() (la que valida contra
 * Supabase Auth), no getPortalSessionFast: los reportes pueden contener RUT,
 * montos y datos de clientes de terceros. El middleware no reemplaza este
 * chequeo. Quien no es la cuenta técnica vuelve a su landing, no ve un 403.
 */
export async function requireSoporte(): Promise<UserSession> {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!esSoporte(session)) redirect(landingFor(session));
  return session;
}
