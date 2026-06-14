import Link from "next/link";
import { ChevronLeft, ShieldCheck } from "lucide-react";

export default function CertificadosPage() {
  return (
    <div className="mx-auto max-w-5xl">
      <Link
        href="/mantencion"
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 transition hover:text-[#253158]"
      >
        <ChevronLeft className="h-4 w-4" /> Volver a Mantención
      </Link>
      <header className="mb-8 mt-4 flex items-start gap-3">
        <span className="inline-flex h-11 w-11 items-center justify-center rounded-lg bg-[#253158]/10 text-[#253158]">
          <ShieldCheck className="h-5 w-5" />
        </span>
        <div>
          <h1 className="text-2xl font-bold text-[#253158]">Certificados</h1>
          <p className="mt-0.5 text-sm text-gray-500">
            Vigencias y vencimientos de los equipos
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
