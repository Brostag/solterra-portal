import Link from "next/link";
import { getPortalSessionFast } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import {
  Package,
  FileText,
  ClipboardList,
  Wrench,
  BookOpen,
  ArrowRight,
  ChevronLeft,
} from "lucide-react";
import { TourButton } from "@/components/portal/AppTour";

// Guía de uso estática del Módulo de Operación. Sin queries de datos: solo
// contenido verificado contra las pantallas reales del módulo.

type Paso = {
  icon: typeof Package;
  titulo: string;
  descripcion: string;
  tips: string[];
  href: string;
  hrefLabel: string;
};

const PASOS: Paso[] = [
  {
    icon: Package,
    titulo: "Los equipos los gestiona Mantención",
    descripcion:
      "En Operación no se crean ni editan equipos: eso vive en el módulo de Mantención. Aquí solo los seleccionas al registrar un parte diario o un checklist.",
    tips: [
      "Si falta un equipo en la lista, pídelo al encargado de Mantención.",
      "Solo aparecen los equipos ya dados de alta en la flota.",
    ],
    href: "/operacion",
    hrefLabel: "Ir a Operación",
  },
  {
    icon: FileText,
    titulo: "Registro de entrada/salida (parte diario)",
    descripcion:
      "Documenta el uso del equipo en la jornada: horómetro, odómetro, combustible, área de uso, centro de costo y el estado de los componentes al ingreso y a la salida. Adjunta fotos y firmas cuando corresponda.",
    tips: [
      "Registra la entrada al inicio y la salida con el receptor al cierre de jornada.",
      "El parte queda en estado Pendiente hasta que el supervisor lo revise.",
      "Puedes descargar el PDF del registro desde su detalle.",
    ],
    href: "/operacion/partes-diarios",
    hrefLabel: "Ir a Partes Diarios",
  },
  {
    icon: ClipboardList,
    titulo: "Check List diario (apto / no apto)",
    descripcion:
      "Inspección pre-operacional antes de usar el equipo. Marca cada ítem como OK o Falla; el resultado general queda como Apto o No Apto.",
    tips: [
      "Un resultado No Apto indica una falla que revisar antes de operar.",
      "Este checklist diario es distinto del Check List de Mantenimiento del taller (83 ítems).",
    ],
    href: "/operacion/checklists",
    hrefLabel: "Ir a Checklists",
  },
  {
    icon: Wrench,
    titulo: "¿Qué pasa después?",
    descripcion:
      "El supervisor revisa y aprueba (o rechaza) los partes pendientes. Estos registros diarios son la base con que Mantención planifica los trabajos: un plan puede partir directamente de un registro de entrada.",
    tips: [
      "Aprobar o rechazar un parte lo hace un Administrador o Supervisor.",
      "Un registro completo agiliza el plan de mantención: hereda equipo y horómetro.",
    ],
    href: "/operacion/partes-diarios",
    hrefLabel: "Ir a Partes Diarios",
  },
];

const FAQS: { q: string; a: string }[] = [
  {
    q: "¿Por qué no puedo crear un equipo desde Operación?",
    a: "Los equipos se gestionan solo en el módulo de Mantención. En Operación se seleccionan de la flota ya cargada. Si falta uno, avísale a Mantención.",
  },
  {
    q: "¿Qué significa que un parte quede «Pendiente»?",
    a: "Recién creado, el parte diario queda Pendiente de revisión. Un Administrador o Supervisor lo Aprueba o Rechaza desde el detalle del parte.",
  },
  {
    q: "¿En qué se diferencia el checklist de Operación del de Mantención?",
    a: "El de Operación es la inspección diaria pre-operacional (OK/Falla, resultado Apto o No Apto). El de Mantención es la pauta de taller de 83 ítems (SÍ/NO/N/A). Son distintos.",
  },
  {
    q: "¿Para qué sirven los registros que hago cada día?",
    a: "Además de dejar respaldo del uso del equipo, alimentan la mantención: un plan puede partir de un registro de entrada y hereda automáticamente el equipo y el horómetro.",
  },
];

export default async function AyudaOperacionPage() {
  const session = await getPortalSessionFast();
  if (!session) redirect("/login");

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <Link
        href="/operacion"
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 transition hover:text-[#253158]"
      >
        <ChevronLeft className="h-4 w-4" /> Volver a Operación
      </Link>

      {/* Encabezado */}
      <header>
        <p className="text-xs font-semibold uppercase tracking-widest text-[#c6352e]">
          Módulo de Operación · Guía de uso
        </p>
        <h1 className="mt-1 text-2xl font-bold leading-tight text-[#253158]">
          Guía de uso del Módulo de Operación
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-gray-500">
          ¿Primera vez? Sigue este orden. Es el control diario del equipo en
          terreno: registrar el uso, inspeccionar y dejar todo listo para que
          Mantención planifique.
        </p>
        <div className="mt-4">
          <TourButton module="OPERACION" />
        </div>
      </header>

      {/* Pasos numerados */}
      <ol className="space-y-4">
        {PASOS.map((paso, i) => {
          const Icon = paso.icon;
          return (
            <li
              key={paso.titulo}
              className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm"
            >
              <div className="flex items-start gap-4">
                <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-[#253158] text-sm font-bold text-white">
                  {i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <Icon className="h-4 w-4 flex-shrink-0 text-[#253158]" />
                    <h2 className="text-base font-semibold text-[#253158]">
                      {paso.titulo}
                    </h2>
                  </div>
                  <p className="mt-1.5 text-sm leading-relaxed text-gray-600">
                    {paso.descripcion}
                  </p>
                  {paso.tips.length > 0 && (
                    <ul className="mt-3 space-y-1.5">
                      {paso.tips.map((tip) => (
                        <li
                          key={tip}
                          className="flex items-start gap-2 text-[13px] leading-relaxed text-gray-500"
                        >
                          <span className="mt-1.5 h-1 w-1 flex-shrink-0 rounded-full bg-[#c6352e]" />
                          {tip}
                        </li>
                      ))}
                    </ul>
                  )}
                  <Link
                    href={paso.href}
                    className="mt-4 inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3.5 py-2 text-[13px] font-semibold text-[#253158] transition-colors hover:border-[#253158] hover:bg-[#253158]/5"
                  >
                    {paso.hrefLabel}
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </div>
            </li>
          );
        })}
      </ol>

      {/* Preguntas frecuentes */}
      <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex items-center gap-2">
          <BookOpen className="h-4 w-4 text-[#253158]" />
          <h2 className="text-base font-semibold text-[#253158]">
            Preguntas frecuentes
          </h2>
        </div>
        <dl className="mt-4 divide-y divide-gray-100">
          {FAQS.map((faq) => (
            <div key={faq.q} className="py-3.5 first:pt-0 last:pb-0">
              <dt className="text-sm font-semibold text-[#253158]">{faq.q}</dt>
              <dd className="mt-1 text-sm leading-relaxed text-gray-600">
                {faq.a}
              </dd>
            </div>
          ))}
        </dl>
      </section>
    </div>
  );
}
