import Link from "next/link";
import { ChevronLeft, Award } from "lucide-react";
import { getCertificadosMantencion } from "@/lib/terreno/queries";
import { getPortalSessionFast } from "@/lib/auth/session";
import { canAccessModule } from "@/lib/modules";
import PageHeader from "@/components/terreno/PageHeader";
import CertificadoPdfAcciones from "@/components/mantencion/CertificadoPdfAcciones";
import EliminarCertificadoMantButton from "@/components/mantencion/EliminarCertificadoMantButton";

function fechaUTC(iso: string): string {
  return new Date(iso).toLocaleDateString("es-CL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "UTC",
  });
}

export default async function CertMantPage() {
  const [items, session] = await Promise.all([
    getCertificadosMantencion(),
    getPortalSessionFast(),
  ]);

  const puedeCrear =
    !!session &&
    canAccessModule(session, "MANTENCION") &&
    (session.rol === "ADMINISTRADOR" || session.rol === "SUPERVISOR");

  // Eliminar el certificado es más restrictivo que crearlo: es el cierre de
  // la cadena, lleva firmas y se entrega al cliente.
  const puedeEliminar =
    !!session && canAccessModule(session, "MANTENCION") && session.rol === "ADMINISTRADOR";

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <Link
        href="/mantencion"
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 transition hover:text-[#253158]"
      >
        <ChevronLeft className="h-4 w-4" /> Volver a Mantención
      </Link>

      <PageHeader
        icon={<Award className="h-5 w-5" />}
        titulo="Certificados de Mantención"
        subtitulo="Acreditan que el equipo quedó en condiciones operativas"
        accion={
          puedeCrear
            ? { href: "/mantencion/certificado-mantencion/nuevo", label: "Nuevo certificado" }
            : undefined
        }
      />

      {items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white p-12 text-center">
          <p className="font-semibold text-[#253158]">Aún no hay certificados de mantención.</p>
          <p className="mt-1 text-sm text-gray-500">Emite el primero con el botón de arriba.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-gray-100 text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-4 py-3 font-semibold">N°</th>
                <th className="px-4 py-3 font-semibold">Equipo</th>
                <th className="px-4 py-3 font-semibold">Fecha</th>
                <th className="px-4 py-3 font-semibold">Encargado</th>
                <th className="px-4 py-3 font-semibold">Estado</th>
                <th className="px-4 py-3 text-right font-semibold">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {items.map((c) => (
                <tr key={c.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <Link
                      href={`/mantencion/certificado-mantencion/${c.id}`}
                      className="font-medium text-[#253158] hover:underline"
                    >
                      #{c.correlativo}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-[#253158]">{c.equipo ?? "—"}</p>
                    <p className="text-xs text-gray-400">{c.equipoCodigo ?? ""}</p>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-gray-500">{fechaUTC(c.fecha)}</td>
                  <td className="px-4 py-3 text-gray-500">{c.responsable ?? "—"}</td>
                  <td className="px-4 py-3">
                    {c.anulado ? (
                      <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-500 ring-1 ring-gray-300">
                        Anulado
                      </span>
                    ) : (
                      <span className="rounded-full bg-green-50 px-2.5 py-0.5 text-xs font-medium text-green-700 ring-1 ring-green-600/20">
                        Vigente
                      </span>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <CertificadoPdfAcciones id={c.id} anulado={c.anulado} />
                      {puedeEliminar && <EliminarCertificadoMantButton id={c.id} />}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
