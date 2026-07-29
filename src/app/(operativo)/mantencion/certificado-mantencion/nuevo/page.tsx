import { redirect } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { getPortalSessionFast } from "@/lib/auth/session";
import { canAccessModule } from "@/lib/modules";
import { getEquiposOptions, getResponsables } from "@/lib/terreno/queries";
import { prefillCertificadoDesdeOT } from "@/lib/terreno/cadena";
import CertMantForm from "@/components/mantencion/CertMantForm";
import OrigenBanner from "@/components/terreno/OrigenBanner";

// ?desde=<id de la orden de trabajo>: por la URL viaja solo el id. El servidor
// vuelve a leer la orden y arma la propuesta; nunca se aceptan valores del
// cliente.
type Props = { searchParams: Promise<{ desde?: string }> };

export default async function NuevoCertMantPage({ searchParams }: Props) {
  const session = await getPortalSessionFast();
  if (!session) redirect("/login");

  const puede =
    canAccessModule(session, "MANTENCION") &&
    (session.rol === "ADMINISTRADOR" || session.rol === "SUPERVISOR");
  if (!puede) redirect("/mantencion/certificado-mantencion");

  const { desde } = await searchParams;

  const [equipos, responsables, prefill] = await Promise.all([
    getEquiposOptions(),
    getResponsables(),
    // Si la orden no existe, fue eliminada o todavía no está completada devuelve
    // null: el formulario se abre vacío y más abajo se avisa por qué.
    desde ? prefillCertificadoDesdeOT(desde) : Promise.resolve(null),
  ]);

  // El horómetro y/o el odómetro pueden venir del último registro del equipo y
  // no de la orden: se avisa cuál de los dos y con qué fecha, para que se note
  // qué tan viejo es el dato. Lo normal es que solo el odómetro venga del
  // registro (la orden no lo tiene), así que nombrar los dos siempre sería falso.
  const datosDelRegistro = [
    prefill?.horometro_de_registro ? "horómetro" : null,
    prefill?.odometro_de_registro ? "odómetro" : null,
  ].filter((d): d is string => d !== null);

  const detalleOrigen = [
    [prefill?.equipo_codigo, prefill?.equipo_nombre].filter(Boolean).join(" · "),
    prefill?.dato_equipo_fecha && datosDelRegistro.length > 0
      ? `${datosDelRegistro.join(" y ")} del registro del ${prefill.dato_equipo_fecha}`
      : null,
  ]
    .filter(Boolean)
    .join(" · ");

  // Se pidió copiar una orden de trabajo y no se pudo (no existe, fue eliminada
  // o todavía no está completada). Sin aviso el usuario cree que el sistema
  // falló al copiar.
  const origenNoDisponible = Boolean(desde) && !prefill;

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

      {prefill && (
        <OrigenBanner
          titulo={`Datos copiados de la orden de trabajo ${prefill.ot_tipo} del ${prefill.fecha_ot}`}
          detalle={detalleOrigen || undefined}
          href={prefill.origen_href}
        />
      )}

      {origenNoDisponible && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
          <p className="text-sm text-amber-700">
            No se pudieron copiar los datos del documento de origen. Revísalo antes
            de continuar.
          </p>
        </div>
      )}

      <CertMantForm
        equipos={equipos}
        responsables={responsables}
        prefill={prefill ?? undefined}
      />
    </div>
  );
}
