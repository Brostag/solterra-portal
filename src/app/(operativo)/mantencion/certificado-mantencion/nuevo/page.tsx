import { redirect } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { getPortalSessionFast } from "@/lib/auth/session";
import { canAccessModule } from "@/lib/modules";
import { getEquiposOptions, getResponsables } from "@/lib/terreno/queries";
import CertMantForm from "@/components/mantencion/CertMantForm";

export default async function NuevoCertMantPage() {
  const session = await getPortalSessionFast();
  if (!session) redirect("/login");

  const puede =
    canAccessModule(session, "MANTENCION") &&
    (session.rol === "ADMINISTRADOR" || session.rol === "SUPERVISOR");
  if (!puede) redirect("/mantencion/certificado-mantencion");

  const [equipos, responsables] = await Promise.all([
    getEquiposOptions(),
    getResponsables(),
  ]);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link
        href="/mantencion/certificado-mantencion"
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 transition hover:text-[#253158]"
      >
        <ChevronLeft className="h-4 w-4" /> Volver
      </Link>
      <header>
        <p className="text-xs font-semibold uppercase tracking-widest text-[#c6352e]">
          Mantención · Certificado
        </p>
        <h1 className="mt-1 text-2xl font-bold text-[#253158]">Nuevo certificado de mantención</h1>
        <p className="mt-0.5 text-sm text-gray-500">
          Acredita que el equipo quedó en condiciones operativas tras la mantención.
        </p>
      </header>

      <CertMantForm equipos={equipos} responsables={responsables} />
    </div>
  );
}
