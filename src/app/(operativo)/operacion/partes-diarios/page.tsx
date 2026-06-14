import Link from "next/link";
import { ChevronLeft, FileText } from "lucide-react";

export default function PartesDiariosPage() {
  return (
    <div className="mx-auto max-w-5xl">
      <Link
        href="/operacion"
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 transition hover:text-[#253158]"
      >
        <ChevronLeft className="h-4 w-4" /> Volver a Operación
      </Link>
      <header className="mb-8 mt-4 flex items-start gap-3">
        <span className="inline-flex h-11 w-11 items-center justify-center rounded-lg bg-[#253158]/10 text-[#253158]">
          <FileText className="h-5 w-5" />
        </span>
        <div>
          <h1 className="text-2xl font-bold text-[#253158]">Partes Diarios</h1>
          <p className="mt-0.5 text-sm text-gray-500">
            Horómetro, kilometraje y combustible por turno
          </p>
        </div>
      </header>
      <div className="rounded-xl border border-dashed border-gray-300 bg-white p-10 text-center">
        <p className="font-semibold text-[#253158]">Pantalla en construcción</p>
        <p className="mt-1 text-sm text-gray-500">
          La funcionalidad de este módulo se integrará en una fase posterior.
        </p>
      </div>
    </div>
  );
}
