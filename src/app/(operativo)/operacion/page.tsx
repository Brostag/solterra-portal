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
import { getPortalSessionFast } from "@/lib/auth/session";
import { canAccessModule } from "@/lib/modules";
import KpiCard from "@/components/portal/KpiCard";

function fechaCorta(iso: string): string {
  return new Date(iso).toLocaleDateString("es-CL", { day: "2-digit", month: "short" });
}

export default async function OperacionDashboard() {
  const [d, session] = await Promise.all([
    getOperacionDashboard(),
    getPortalSessionFast(),
  ]);

  // Los equipos viven en Mantención: solo linkear si la sesión puede entrar ahí.
  const veMantencion = !!session && canAccessModule(session, "MANTENCION");

  const hoy = new Date().toLocaleDateString("es-CL", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const kpis: {
    label: string;
    value: number;
    icon: typeof Package;
    href?: string;
  }[] = [
    {
      label: "Total equipos",
      value: d.kpis.totalEquipos,
      icon: Package,
      href: veMantencion ? "/mantencion/equipos" : undefined,
    },
    {
      label: "Equipos activos",
      value: d.kpis.equiposActivos,
      icon: ShieldCheck,
      href: veMantencion ? "/mantencion/equipos?estado=Activo" : undefined,
    },
    {
      label: "En mantención",
      value: d.kpis.equiposMantencion,
      icon: Settings,
      href: veMantencion
        ? `/mantencion/equipos?estado=${encodeURIComponent("En Mantención")}`
        : undefined,
    },
    {
      label: "Partes diarios hoy",
      value: d.kpis.partesHoy,
      icon: FileText,
      href: "/operacion/partes-diarios",
    },
    {
      label: "Checklists hoy",
      value: d.kpis.checklistsHoy,
      icon: ClipboardList,
      href: "/operacion/checklists",
    },
  ];

  const acciones = [
    { href: "/operacion/partes-diarios/nuevo", label: "Nuevo parte diario", icon: FileText, primary: true },
    { href: "/operacion/checklists/nuevo", label: "Nuevo checklist", icon: FolderOpen, primary: false },
  ];

  const sinActividad =
    d.partesRecientes.length === 0 && d.checklistsRecientes.length === 0;

  return (
    <div className="mx-auto max-w-6xl space-y-5">
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
        {kpis.map(({ label, value, icon, href }) => (
          <KpiCard
            key={label}
            icon={icon}
            value={value}
            label={label}
            href={href}
            variant="operativo"
          />
        ))}
      </section>

      {/* Acciones rápidas */}
      <section className="rounded-xl border border-gray-200 bg-white p-4 sm:p-5">
        <p className="mb-3 text-[11px] font-semibold uppercase tracking-widest text-gray-400">
          Acciones rápidas
        </p>
        <div className="flex flex-wrap gap-2.5">
          {acciones.map(({ href, label, icon: Icon, primary }) => (
            <Link
              key={href}
              href={href}
              className={`flex min-h-[48px] w-full items-center gap-2.5 rounded-lg px-3 py-2.5 transition-colors duration-150 sm:w-[280px] ${
                primary
                  ? "bg-[#253158] hover:bg-[#1e305e]"
                  : "border border-gray-200 bg-white hover:border-[#253158] hover:bg-[#253158]/5"
              }`}
            >
              <span
                className={`inline-flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md ${
                  primary ? "bg-white/20 text-white" : "bg-gray-100 text-[#253158]"
                }`}
              >
                <Icon className="h-4 w-4" />
              </span>
              <span
                className={`flex-1 text-[13px] font-semibold leading-tight ${
                  primary ? "text-white" : "text-[#253158]"
                }`}
              >
                {label}
              </span>
              <ArrowRight
                className={`h-4 w-4 flex-shrink-0 ${primary ? "text-white/60" : "text-gray-400"}`}
              />
            </Link>
          ))}
        </div>
      </section>

      {/* Actividad reciente */}
      <section className="overflow-hidden rounded-xl border border-gray-200 bg-white">
        <div className="border-b border-gray-100 px-5 py-3">
          <h2 className="text-sm font-semibold text-[#253158]">Actividad reciente</h2>
        </div>
        {sinActividad ? (
          <EmptyState
            icon={<ClipboardList className="h-7 w-7" />}
            texto="Aún no hay registros operacionales."
          />
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

function EmptyState({ icon, texto }: { icon: React.ReactNode; texto: string }) {
  return (
    <div className="flex flex-col items-center gap-2 px-5 py-7 text-center">
      <span className="text-gray-400 opacity-35">{icon}</span>
      <p className="text-[13px] text-gray-400">{texto}</p>
    </div>
  );
}

// Pill de estado de la actividad reciente (presentación; mismos estados de siempre).
function estadoPill(estado: string): string {
  if (estado === "Aprobado" || estado === "Apto")
    return "bg-green-50 text-green-700 border border-green-200";
  if (estado === "Rechazado" || estado === "No Apto")
    return "bg-red-50 text-[#c6352e] border border-red-200";
  if (estado === "Pendiente")
    return "bg-amber-50 text-amber-700 border border-amber-200";
  return "bg-gray-100 text-gray-600 border border-gray-200";
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
      <div className="flex items-center gap-2 px-5 py-3 text-[11px] font-semibold uppercase tracking-wide text-gray-500">
        <span className="text-[#253158]">{icon}</span>
        {titulo}
      </div>
      {items.length === 0 ? (
        <p className="px-5 pb-5 text-[13px] text-gray-400">{vacio}</p>
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
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${estadoPill(it.estado)}`}
                >
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
