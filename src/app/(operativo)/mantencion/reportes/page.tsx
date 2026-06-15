import Link from "next/link";
import { ChevronLeft, ClipboardList } from "lucide-react";
import { getEquiposOptions } from "@/lib/terreno/queries";
import ReportesCliente from "@/components/mantencion/ReportesCliente";

export default async function ReportesPage() {
  const equipos = await getEquiposOptions();

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <Link
        href="/mantencion"
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 transition hover:text-[#253158]"
      >
        <ChevronLeft className="h-4 w-4" /> Volver a Mantención
      </Link>

      <header className="flex items-start gap-3">
        <span className="inline-flex h-11 w-11 items-center justify-center rounded-lg bg-[#253158]/10 text-[#253158]">
          <ClipboardList className="h-5 w-5" />
        </span>
        <div>
          <h1 className="text-2xl font-bold text-[#253158]">Reportes</h1>
          <p className="mt-0.5 text-sm text-gray-500">
            Generación y exportación de datos de mantención
          </p>
        </div>
      </header>

      <ReportesCliente equipos={equipos} />
    </div>
  );
}
