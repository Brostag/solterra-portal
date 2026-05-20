"use client";

import { useRouter } from "next/navigation";

interface FiltroOption {
  value: string;
  label: string;
}

interface Props {
  tipo:      string;
  entidad:   string;
  tipos:     FiltroOption[];
  entidades: FiltroOption[];
}

const selectClass =
  "w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white text-gray-700 " +
  "focus:outline-none focus:ring-2 focus:ring-[#253158]/20 focus:border-[#253158] cursor-pointer";

export default function DocumentosFiltrosMobile({ tipo, entidad, tipos, entidades }: Props) {
  const router = useRouter();

  function navegar(nextTipo: string, nextEntidad: string) {
    const params = new URLSearchParams();
    if (nextTipo)    params.set("tipo", nextTipo);
    if (nextEntidad) params.set("entidad", nextEntidad);
    const qs = params.toString();
    router.push(`/documentos${qs ? `?${qs}` : ""}`);
  }

  return (
    <div className="md:hidden bg-white rounded-xl border border-gray-200 p-4 space-y-3">
      <p className="text-xs font-semibold text-[#253158] uppercase tracking-wider">
        Filtros
      </p>

      <div>
        <label htmlFor="filtro-tipo" className="block text-xs font-medium text-gray-700 mb-1.5">
          Tipo de documento
        </label>
        <select
          id="filtro-tipo"
          value={tipo}
          onChange={(e) => navegar(e.target.value, entidad)}
          className={selectClass}
        >
          <option value="">Todos los tipos</option>
          {tipos.map((t) => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="filtro-entidad" className="block text-xs font-medium text-gray-700 mb-1.5">
          Entidad asociada
        </label>
        <select
          id="filtro-entidad"
          value={entidad}
          onChange={(e) => navegar(tipo, e.target.value)}
          className={selectClass}
        >
          <option value="">Todas las entidades</option>
          {entidades.map((en) => (
            <option key={en.value} value={en.value}>{en.label}</option>
          ))}
        </select>
      </div>
    </div>
  );
}
