import Link from "next/link";
import { ChevronLeft, FileText } from "lucide-react";
import { getPartes } from "@/lib/terreno/queries";
import PartesLista from "@/components/operacion/PartesLista";
import AutoRefresh from "@/components/terreno/AutoRefresh";
import PageHeader from "@/components/terreno/PageHeader";
import { getPortalSessionFast } from "@/lib/auth/session";
import { canAccessModule } from "@/lib/modules";

export default async function PartesDiariosPage() {
  const [partes, session] = await Promise.all([
    getPartes(),
    getPortalSessionFast(),
  ]);

  const puedeCrear = !!session && canAccessModule(session, "MANTENCION");
  // Mismo criterio que deleteParte en actions.ts: solo ADMINISTRADOR o
  // SUPERVISOR con acceso a Mantención ven el ícono de eliminar en la tabla.
  const puedeEliminar =
    !!session &&
    canAccessModule(session, "MANTENCION") &&
    (session.rol === "ADMINISTRADOR" || session.rol === "SUPERVISOR");

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <Link
        href="/mantencion"
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 transition hover:text-[#253158]"
      >
        <ChevronLeft className="h-4 w-4" /> Volver a Mantención
      </Link>

      <PageHeader
        icon={<FileText className="h-5 w-5" />}
        titulo="Órdenes de Trabajo"
        subtitulo="Registro de ingreso y salida de taller"
        accion={
          puedeCrear
            ? { href: "/mantencion/ordenes-trabajo/nuevo", label: "Nueva orden de trabajo" }
            : undefined
        }
        accionSecundaria={
          puedeCrear
            ? { href: "/mantencion/ordenes-trabajo/salida", label: "Registrar salida" }
            : undefined
        }
      />

      <AutoRefresh />
      <PartesLista partes={partes} puedeEliminar={puedeEliminar} />
    </div>
  );
}
