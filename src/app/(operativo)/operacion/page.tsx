import Link from "next/link";
import { Package, FileText, FolderOpen, ArrowRight } from "lucide-react";

const CARDS = [
  {
    href: "/operacion/equipos",
    title: "Equipos",
    desc: "Maquinaria y flota disponible",
    icon: Package,
  },
  {
    href: "/operacion/partes-diarios",
    title: "Partes Diarios",
    desc: "Horómetro, kilometraje y combustible por turno",
    icon: FileText,
  },
  {
    href: "/operacion/checklists",
    title: "Checklists",
    desc: "Inspección pre-operacional del equipo",
    icon: FolderOpen,
  },
];

export default function OperacionHub() {
  return (
    <div className="mx-auto max-w-5xl">
      <header className="mb-8">
        <p className="text-xs font-semibold uppercase tracking-widest text-[#c6352e]">
          Módulo de Operación
        </p>
        <h1 className="mt-1 text-2xl font-bold text-[#253158]">
          Control diario de equipos y partes operacionales
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
