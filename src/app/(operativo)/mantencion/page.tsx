import Link from "next/link";
import {
  Settings,
  ShieldCheck,
  ClipboardList,
  Wrench,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ArrowRight,
} from "lucide-react";
import { getMantencionDashboard } from "@/lib/terreno/queries";
import KpiCard from "@/components/portal/KpiCard";

const CARDS = [
  {
    href: "/mantencion/taller",
    title: "Taller / Mantenciones",
    desc: "Preventivas, correctivas y de emergencia",
    icon: Settings,
  },
  {
    href: "/mantencion/certificados",
    title: "Certificados",
    desc: "Vigencias y vencimientos de los equipos",
    icon: ShieldCheck,
  },
  {
    href: "/mantencion/reportes",
    title: "Reportes",
    desc: "Generación y exportación de datos de mantención",
    icon: ClipboardList,
  },
];

function estadoMantencionBadge(estado: string): string {
  if (estado === "Completada") return "bg-green-50 text-green-700 ring-1 ring-green-600/20";
  if (estado === "En Proceso") return "bg-amber-50 text-amber-700 ring-1 ring-amber-600/20";
  if (estado === "Programada") return "bg-blue-50 text-blue-700 ring-1 ring-blue-600/20";
  return "bg-gray-100 text-gray-600 ring-1 ring-gray-500/20";
}

function estadoCertBadge(estado: string): string {
  if (estado === "Vigente") return "bg-green-50 text-green-700 ring-1 ring-green-600/20";
  if (estado === "Por Vencer") return "bg-amber-50 text-amber-700 ring-1 ring-amber-600/20";
  if (estado === "Vencido") return "bg-red-50 text-[#c6352e] ring-1 ring-red-600/20";
  return "bg-gray-100 text-gray-600 ring-1 ring-gray-500/20";
}

function fechaCorta(iso: string): string {
  return new Date(iso).toLocaleDateString("es-CL", { day: "2-digit", month: "short" });
}

// fecha_vencimiento es @db.Date (medianoche UTC): formatear en UTC.
function fechaCortaUTC(iso: string): string {
  return new Date(iso).toLocaleDateString("es-CL", {
    day: "2-digit",
    month: "short",
    timeZone: "UTC",
  });
}

export default async function MantencionHub() {
  const d = await getMantencionDashboard();

  const hoy = new Date().toLocaleDateString("es-CL", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const kpis = [
    {
      label: "Equipos en mantención",
      value: d.kpis.equiposEnMantencion,
      icon: Wrench,
      href: `/mantencion/equipos?estado=${encodeURIComponent("En Mantención")}`,
    },
    {
      label: "Mantenciones abiertas",
      value: d.kpis.mantencionesAbiertas,
      icon: Settings,
      href: "/mantencion/taller",
    },
    {
      label: "Mantenciones completadas",
      value: d.kpis.mantencionesCompletadas,
      icon: CheckCircle2,
      href: "/mantencion/taller?estado=Completada",
    },
    {
      label: "Certificados vigentes",
      value: d.kpis.certificadosVigentes,
      icon: ShieldCheck,
      href: "/mantencion/certificados",
    },
    {
      label: "Certificados por vencer",
      value: d.kpis.certificadosPorVencer,
      icon: Clock,
      href: `/mantencion/certificados?estado=${encodeURIComponent("Por Vencer")}`,
    },
    {
      label: "Certificados vencidos",
      value: d.kpis.certificadosVencidos,
      icon: AlertTriangle,
      href: "/mantencion/certificados?estado=Vencido",
    },
  ];

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      {/* Encabezado */}
      <header>
        <p className="text-xs font-semibold uppercase tracking-widest text-[#c6352e]">
          Módulo de Mantención
        </p>
        <h1 className="mt-1 text-2xl font-bold text-[#253158]">
          Planificación de trabajos, mantenciones y certificados
        </h1>
        <p className="mt-1 text-sm capitalize text-gray-400">{hoy}</p>
      </header>

      {/* KPIs */}
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
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

      {/* Accesos a los submódulos */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {CARDS.map(({ href, title, desc, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className="group flex items-center gap-3.5 rounded-xl border border-gray-200 bg-white px-5 py-4 transition-all duration-200 hover:border-[#253158]/30 hover:shadow-md"
          >
            <span className="inline-flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-lg bg-[#253158]/10 text-[#253158]">
              <Icon className="h-5 w-5" />
            </span>
            <span className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="text-[15px] font-semibold leading-tight text-[#253158]">
                {title}
              </span>
              <span className="text-xs leading-snug text-gray-500">{desc}</span>
            </span>
            <span className="inline-flex flex-shrink-0 items-center gap-1 text-[13px] font-medium text-[#c6352e]">
              Abrir
              <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
            </span>
          </Link>
        ))}
      </div>

      {/* Listas */}
      <div className="grid gap-5 lg:grid-cols-2">
        {/* Mantenciones en curso */}
        <section className="overflow-hidden rounded-xl border border-gray-200 bg-white">
          <div className="flex items-center justify-between border-b border-gray-100 px-5 py-3">
            <h2 className="text-sm font-semibold text-[#253158]">Mantenciones en curso</h2>
            <Link
              href="/mantencion/taller"
              className="inline-flex items-center gap-1 text-xs font-medium text-[#c6352e] hover:underline"
            >
              Ver todas <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          {d.mantencionesEnCurso.length === 0 ? (
            <EmptyState
              icon={<Wrench className="h-7 w-7" />}
              texto="No hay mantenciones abiertas."
            />
          ) : (
            <ul className="divide-y divide-gray-100">
              {d.mantencionesEnCurso.map((m) => (
                <li key={m.id}>
                  <Link
                    href={`/mantencion/taller/${m.id}`}
                    className="flex items-center justify-between gap-3 px-5 py-3 transition hover:bg-gray-50"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium text-[#253158]">
                        {m.equipo ?? "Equipo —"}
                      </p>
                      <p className="text-xs text-gray-500">
                        {m.tipo} · {fechaCorta(m.fecha_inicio)}
                      </p>
                    </div>
                    <span
                      className={`flex-shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${estadoMantencionBadge(
                        m.estado,
                      )}`}
                    >
                      {m.estado}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Certificados por vencer */}
        <section className="overflow-hidden rounded-xl border border-gray-200 bg-white">
          <div className="flex items-center justify-between border-b border-gray-100 px-5 py-3">
            <h2 className="text-sm font-semibold text-[#253158]">Certificados por vencer</h2>
            <Link
              href="/mantencion/certificados"
              className="inline-flex items-center gap-1 text-xs font-medium text-[#c6352e] hover:underline"
            >
              Ver todos <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          {d.certificadosPorVencer.length === 0 ? (
            <EmptyState
              icon={<ShieldCheck className="h-7 w-7" />}
              texto="No hay certificados próximos a vencer."
            />
          ) : (
            <ul className="divide-y divide-gray-100">
              {d.certificadosPorVencer.map((c) => (
                <li key={`${c.id}-${c.tipo}`}>
                  <Link
                    href={`/mantencion/equipos/${c.id}`}
                    className="flex items-center justify-between gap-3 px-5 py-3 transition hover:bg-gray-50"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium text-[#253158]">
                        {c.equipo ?? "Equipo —"}
                      </p>
                      <p className="text-xs text-gray-500">
                        {c.tipo} · vence {fechaCortaUTC(c.fecha_vencimiento)}
                      </p>
                    </div>
                    <span
                      className={`flex-shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${estadoCertBadge(
                        c.estado,
                      )}`}
                    >
                      {c.estado}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
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
