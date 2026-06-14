import Link from "next/link";
import { Settings, ShieldCheck, ClipboardList, ArrowRight } from "lucide-react";

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

export default function MantencionHub() {
  return (
    <div className="mx-auto max-w-5xl">
      <header className="mb-8">
        <p className="text-xs font-semibold uppercase tracking-widest text-[#c6352e]">
          Módulo de Mantención
        </p>
        <h1 className="mt-1 text-2xl font-bold text-[#253158]">
          Planificación de trabajos, mantenciones y certificados
        </h1>
      </header>
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
    </div>
  );
}
