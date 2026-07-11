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
    <div className="mx-auto max-w-6xl space-y-6">
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
        {kpis.map(({ label, value, icon: Icon, href }) => (
          <Link
            key={label}
            href={href}
            className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-[#253158]/30 hover:shadow-md"
          >
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-[#253158]/10 text-[#253158]">
              <Icon className="h-[18px] w-[18px]" />
            </span>
            <p className="mt-3 text-2xl font-bold text-[#253158]">{value}</p>
            <p className="text-xs text-gray-500">{label}</p>
          </Link>
        ))}
      </section>

      {/* Accesos a los submódulos */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {CARDS.map(({ href, title, desc, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className="group rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-[#253158]/30 hover:shadow-md"
          >
            <span className="inline-flex h-11 w-11 items-center justify-center rounded-lg bg-[#253158]/10 text-[#253158]">
              <Icon className="h-5 w-5" />
            </span>
            <h2 className="mt-4 font-semibold text-[#253158]">{title}</h2>
            <p className="mt-1 text-sm text-gray-500">{desc}</p>
            <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-[#c6352e]">
              Abrir
              <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
            </span>
          </Link>
        ))}
      </div>

      {/* Listas */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Mantenciones en curso */}
        <section className="rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
            <h2 className="font-semibold text-[#253158]">Mantenciones en curso</h2>
            <Link
              href="/mantencion/taller"
              className="inline-flex items-center gap-1 text-sm font-medium text-[#c6352e] hover:underline"
            >
              Ver todas <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          {d.mantencionesEnCurso.length === 0 ? (
            <EmptyState texto="No hay mantenciones abiertas." />
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
        <section className="rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
            <h2 className="font-semibold text-[#253158]">Certificados por vencer</h2>
            <Link
              href="/mantencion/certificados"
              className="inline-flex items-center gap-1 text-sm font-medium text-[#c6352e] hover:underline"
            >
              Ver todos <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          {d.certificadosPorVencer.length === 0 ? (
            <EmptyState texto="No hay certificados próximos a vencer." />
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

function EmptyState({ texto }: { texto: string }) {
  return (
    <div className="px-5 py-12 text-center">
      <p className="text-sm text-gray-500">{texto}</p>
    </div>
  );
}
