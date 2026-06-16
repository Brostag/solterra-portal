import Link from "next/link";
import {
  Package,
  ShieldCheck,
  Settings,
  FileText,
  ClipboardList,
  FolderOpen,
  ArrowRight,
} from "lucide-react";
import {
  getOperacionDashboard,
  type ParteResumen,
  type ChecklistResumen,
} from "@/lib/terreno/queries";

function fechaCorta(iso: string): string {
  return new Date(iso).toLocaleDateString("es-CL", { day: "2-digit", month: "short" });
}

export default async function OperacionDashboard() {
  const d = await getOperacionDashboard();

  const hoy = new Date().toLocaleDateString("es-CL", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const kpis = [
    { label: "Total equipos", value: d.kpis.totalEquipos, icon: Package },
    { label: "Equipos activos", value: d.kpis.equiposActivos, icon: ShieldCheck },
    { label: "En mantención", value: d.kpis.equiposMantencion, icon: Settings },
    { label: "Partes diarios hoy", value: d.kpis.partesHoy, icon: FileText },
    { label: "Checklists hoy", value: d.kpis.checklistsHoy, icon: ClipboardList },
  ];

  const acciones = [
    { href: "/operacion/partes-diarios/nuevo", label: "Nuevo parte diario", icon: FileText },
    { href: "/operacion/checklists/nuevo", label: "Nuevo checklist", icon: FolderOpen },
  ];

  const sinActividad =
    d.partesRecientes.length === 0 && d.checklistsRecientes.length === 0;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {/* Encabezado */}
      <header>
        <p className="text-xs font-semibold uppercase tracking-widest text-[#c6352e]">
          Módulo de Operación
        </p>
        <h1 className="mt-1 text-2xl font-bold text-[#253158]">
          Control diario de equipos y partes operacionales
        </h1>
        <p className="mt-1 text-sm capitalize text-gray-400">{hoy}</p>
      </header>

      {/* KPIs */}
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {kpis.map(({ label, value, icon: Icon }) => (
          <div
            key={label}
            className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm"
          >
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-[#253158]/10 text-[#253158]">
              <Icon className="h-[18px] w-[18px]" />
            </span>
            <p className="mt-3 text-2xl font-bold text-[#253158]">{value}</p>
            <p className="text-xs text-gray-500">{label}</p>
          </div>
        ))}
      </section>

      {/* Acciones rápidas */}
      <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <h2 className="font-semibold text-[#253158]">Acciones rápidas</h2>
        <div className="mt-4 grid gap-2.5 sm:grid-cols-2">
          {acciones.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="group flex items-center gap-3 rounded-lg border border-gray-200 px-4 py-3 transition hover:border-[#253158]/30 hover:bg-gray-50"
            >
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-[#253158]/10 text-[#253158]">
                <Icon className="h-[18px] w-[18px]" />
              </span>
              <span className="flex-1 text-sm font-medium text-[#253158]">{label}</span>
              <ArrowRight className="h-4 w-4 text-gray-400 transition group-hover:translate-x-0.5 group-hover:text-[#c6352e]" />
            </Link>
          ))}
        </div>
      </section>

      {/* Actividad reciente */}
      <section className="rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-100 px-5 py-4">
          <h2 className="font-semibold text-[#253158]">Actividad reciente</h2>
        </div>
        {sinActividad ? (
          <EmptyState texto="Aún no hay registros operacionales." />
        ) : (
          <div className="grid gap-px bg-gray-100 sm:grid-cols-2">
            <ActividadColumna
              titulo="Últimos partes diarios"
              icon={<FileText className="h-4 w-4" />}
              vacio="Sin partes diarios aún."
              items={d.partesRecientes.map((p: ParteResumen) => ({
                id: p.id,
                principal: p.equipo ?? "Equipo —",
                secundario: p.operador ?? "",
                fecha: p.fecha,
                estado: p.estado,
              }))}
            />
            <ActividadColumna
              titulo="Últimos checklists"
              icon={<ClipboardList className="h-4 w-4" />}
              vacio="Sin checklists aún."
              items={d.checklistsRecientes.map((c: ChecklistResumen) => ({
                id: c.id,
                principal: c.equipo ?? "Equipo —",
                secundario: c.operador ?? "",
                fecha: c.fecha,
                estado: c.estado_general,
              }))}
            />
          </div>
        )}
      </section>
    </div>
  );
}

function EmptyState({ texto }: { texto: string }) {
  return (
    <div className="px-5 py-12 text-center">
      <p className="text-sm text-gray-500">{texto}</p>
    </div>
  );
}

type ActividadItem = {
  id: string;
  principal: string;
  secundario: string;
  fecha: string;
  estado: string;
};

function ActividadColumna({
  titulo,
  icon,
  vacio,
  items,
}: {
  titulo: string;
  icon: React.ReactNode;
  vacio: string;
  items: ActividadItem[];
}) {
  return (
    <div className="bg-white">
      <div className="flex items-center gap-2 px-5 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
        <span className="text-[#253158]">{icon}</span>
        {titulo}
      </div>
      {items.length === 0 ? (
        <p className="px-5 pb-5 text-sm text-gray-400">{vacio}</p>
      ) : (
        <ul className="divide-y divide-gray-100">
          {items.map((it) => (
            <li key={it.id} className="flex items-center justify-between gap-3 px-5 py-2.5">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-[#253158]">{it.principal}</p>
                {it.secundario && (
                  <p className="truncate text-xs text-gray-500">{it.secundario}</p>
                )}
              </div>
              <div className="flex flex-shrink-0 items-center gap-2 text-xs text-gray-400">
                <span>{fechaCorta(it.fecha)}</span>
                <span className="rounded-full bg-gray-100 px-2 py-0.5 font-medium text-gray-600">
                  {it.estado}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
