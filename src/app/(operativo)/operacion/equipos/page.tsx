import { Package } from "lucide-react";
import { getEquipos } from "@/lib/terreno/queries";
import EquiposLista from "@/components/operacion/EquiposLista";

export default async function EquiposPage() {
  const equipos = await getEquipos();

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="inline-flex h-11 w-11 items-center justify-center rounded-lg bg-[#253158]/10 text-[#253158]">
            <Package className="h-5 w-5" />
          </span>
          <div>
            <h1 className="text-2xl font-bold text-[#253158]">Equipos</h1>
            <p className="mt-0.5 text-sm text-gray-500">Maquinaria y flota disponible</p>
          </div>
        </div>
        {/* Placeholder: el formulario de alta llega en una fase posterior */}
        <button
          type="button"
          disabled
          title="Disponible próximamente"
          className="cursor-not-allowed rounded-lg bg-[#253158]/40 px-4 py-2 text-sm font-semibold text-white opacity-60"
        >
          Nuevo equipo
        </button>
      </header>

      <EquiposLista equipos={equipos} />
    </div>
  );
}
