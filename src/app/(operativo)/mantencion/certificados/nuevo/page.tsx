import { redirect } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { getPortalSessionFast } from "@/lib/auth/session";
import { canAccessModule } from "@/lib/modules";
import { getEquiposOptions } from "@/lib/terreno/queries";
import CertificadoForm from "@/components/mantencion/CertificadoForm";

export default async function NuevoCertificadoPage() {
  const session = await getPortalSessionFast();
  if (!session) redirect("/login");

  const puedeCrear =
    canAccessModule(session, "MANTENCION") &&
    (session.rol === "ADMINISTRADOR" || session.rol === "SUPERVISOR");
  if (!puedeCrear) redirect("/mantencion/certificados");

  const equipos = await getEquiposOptions();

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link
        href="/mantencion/certificados"
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 transition hover:text-[#253158]"
      >
        <ChevronLeft className="h-4 w-4" /> Volver a certificados
      </Link>
      <header>
        <p className="text-xs font-semibold uppercase tracking-widest text-[#c6352e]">
          Mantención · Certificados
        </p>
        <h1 className="mt-1 text-2xl font-bold text-[#253158]">Nuevo certificado</h1>
        <p className="mt-0.5 text-sm text-gray-500">
          Registra un documento, su número y su fecha de vencimiento.
        </p>
      </header>

      <CertificadoForm equipos={equipos} />
    </div>
  );
}
