import Link from "next/link";
import { ChevronLeft, ShieldCheck } from "lucide-react";
import { getReporteVencimientos } from "@/lib/terreno/queries";
import VencimientosTabla from "@/components/mantencion/VencimientosTabla";

export default async function VencimientosPage({
  searchParams,
}: {
  searchParams: Promise<{ estado?: string }>;
}) {
  const [equipos, { estado }] = await Promise.all([
    getReporteVencimientos(),
    searchParams,
  ]);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <Link
        href="/mantencion"
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 transition hover:text-[#253158]"
      >
        <ChevronLeft className="h-4 w-4" /> Volver a Mantención
      </Link>

      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="inline-flex h-11 w-11 items-center justify-center rounded-lg bg-[#253158]/10 text-[#253158]">
            <ShieldCheck className="h-5 w-5" />
          </span>
          <div>
            <h1 className="text-2xl font-bold text-[#253158]">Vencimientos</h1>
            <p className="mt-0.5 text-sm text-gray-500">
              SOAP, permiso de circulación, revisión técnica y extintor por equipo.
              Las fechas se cargan en cada equipo.
            </p>
          </div>
        </div>
        <a
          href="/api/mantencion/vencimientos/pdf"
          className="rounded-lg bg-[#253158] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#1b2540]"
        >
          Descargar PDF
        </a>
      </header>

      <VencimientosTabla equipos={equipos} filtroInicial={estado} />
    </div>
  );
}
