import Link from "next/link";
import { getPortalSessionFast } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import {
  Package,
  FileText,
  ClipboardList,
  Settings,
  ClipboardCheck,
  Award,
  ShieldCheck,
  BarChart3,
  BookOpen,
  ArrowRight,
  ChevronLeft,
} from "lucide-react";
import { TourButton } from "@/components/portal/AppTour";

// Guía de uso estática del Módulo de Mantención. Sin queries de datos: solo
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
    titulo: "Equipos (la flota)",
    descripcion:
      "Parte por aquí. Da de alta cada máquina con su código, tipo, marca, modelo y patente. También carga las fechas de vencimiento: SOAP, permiso de circulación, revisión técnica y extintor.",
    tips: [
      "Solo los equipos con estado Activo aparecen en el cotizador y en el contrato del Comercial.",
      "Las fechas de vencimiento que cargues aquí alimentan el reporte de Vencimientos.",
      "Crear o editar equipos requiere rol Administrador o Supervisor.",
    ],
    href: "/mantencion/equipos",
    hrefLabel: "Ir a Equipos",
  },
  {
    icon: FileText,
    titulo: "Paso 1: Registro de entrada/salida",
    descripcion:
      "El registro del equipo (horómetro, componentes, responsables) se hace en Operación → Partes Diarios. Es la base para planificar la mantención.",
    tips: [
      "El registro se crea y aprueba en el módulo de Operación.",
      "Desde ese registro puedes prellenar el plan de mantención (paso siguiente).",
    ],
    href: "/operacion/partes-diarios",
    hrefLabel: "Ir a Partes Diarios",
  },
  {
    icon: ClipboardList,
    titulo: "Paso 2: Planes de mantención",
    descripcion:
      "Define qué se le hará al equipo. Elige el tipo de plan: A (Según fabricante), B (Preventivo) o C (Correctivo). Puede partir de un registro de entrada, del que hereda equipo y horómetro.",
    tips: [
      "Si eliges un registro de entrada, se copian equipo, horómetro y observaciones. Todo queda editable.",
      "Describe las tareas planificadas y guarda con «Crear plan».",
      "Crear planes requiere rol Administrador o Supervisor.",
    ],
    href: "/mantencion/planes",
    hrefLabel: "Ir a Planes",
  },
  {
    icon: Settings,
    titulo: "Paso 3: Generar Orden de trabajo → Taller",
    descripcion:
      "Desde el detalle del plan, presiona «Generar OT». La orden se copia al Taller en estado Programada; cambia a En Proceso o Completada según avance el trabajo.",
    tips: [
      "Al generar la OT, el plan pasa a estado «Con OT» y la mantención aparece en el Taller.",
      "En el Taller también puedes crear una mantención directa con «Nueva mantención»: se emite ya Completada, y descarga su PDF desde el detalle.",
      "Gestionar el taller requiere rol Administrador o Supervisor.",
    ],
    href: "/mantencion/taller",
    hrefLabel: "Ir al Taller",
  },
  {
    icon: ClipboardCheck,
    titulo: "Check List de Mantenimiento",
    descripcion:
      "Deja el registro punto por punto de la revisión de taller. Son 83 ítems que se marcan como SÍ, NO o N/A según la pauta del fabricante.",
    tips: [
      "Este check list de taller es distinto del checklist diario de Operación.",
      "Se puede anular, pero no editar una vez guardado.",
    ],
    href: "/mantencion/checklist-mantencion",
    hrefLabel: "Ir a Check List",
  },
  {
    icon: Award,
    titulo: "Certificado de mantención",
    descripcion:
      "Emite el documento que acredita que el equipo quedó en condiciones operativas, con el encargado y su correlativo. Se descarga como PDF.",
    tips: [
      "Toma una copia de los datos del equipo (tipo, marca, patente) al momento de emitirlo.",
      "Se puede anular, pero no editar una vez emitido.",
    ],
    href: "/mantencion/certificado-mantencion",
    hrefLabel: "Ir a Certificados",
  },
  {
    icon: ShieldCheck,
    titulo: "Vencimientos",
    descripcion:
      "Reporte del estado de SOAP, permiso de circulación, revisión técnica y extintor por equipo. Filtra por Vigente, Por Vencer o Vencido y descárgalo en PDF.",
    tips: [
      "Las fechas no se editan aquí: se cargan en la ficha de cada equipo.",
      "Un documento «Por Vencer» te da tiempo de renovar antes de que quede Vencido.",
    ],
    href: "/mantencion/certificados",
    hrefLabel: "Ir a Vencimientos",
  },
  {
    icon: BarChart3,
    titulo: "Reportes",
    descripcion:
      "Genera y exporta datos de mantención por equipo y rango de fechas para revisarlos o entregarlos.",
    tips: [
      "El rango de fechas es obligatorio: acota el período.",
      "Se apoyan en los registros ya cargados en Operación y Mantención.",
    ],
    href: "/mantencion/reportes",
    hrefLabel: "Ir a Reportes",
  },
];

const FAQS: { q: string; a: string }[] = [
  {
    q: "¿Por qué debo crear los equipos en Mantención y no en Operación?",
    a: "Los equipos se gestionan solo en Mantención. Desde ahí alimentan los selectores de Operación, del cotizador y del contrato. En Operación únicamente se seleccionan.",
  },
  {
    q: "¿Cómo pasa un plan a ser una orden de trabajo?",
    a: "Desde el detalle del plan presionas «Generar OT». El plan queda en estado «Con OT» y la mantención aparece en el Taller para ejecutarse.",
  },
  {
    q: "¿Cuál es la diferencia entre el Check List de Mantenimiento y el checklist de Operación?",
    a: "El Check List de Mantenimiento es la pauta de taller de 83 ítems (SÍ/NO/N/A). El checklist de Operación es la inspección diaria pre-operacional (OK/Falla). Son distintos y viven en módulos distintos.",
  },
  {
    q: "¿Dónde se cargan las fechas de vencimiento de SOAP, revisión técnica, etc.?",
    a: "En la ficha de cada equipo, dentro del módulo Equipos. La pantalla de Vencimientos solo las muestra y reporta; no se editan ahí.",
  },
  {
    q: "¿Necesito un permiso especial para planificar y certificar?",
    a: "Sí. Crear planes, generar órdenes de trabajo, registrar check list y emitir certificados requiere rol Administrador o Supervisor.",
  },
];

export default async function AyudaMantencionPage() {
  const session = await getPortalSessionFast();
  if (!session) redirect("/login");

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <Link
        href="/mantencion"
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 transition hover:text-[#253158]"
      >
        <ChevronLeft className="h-4 w-4" /> Volver a Mantención
      </Link>

      {/* Encabezado */}
      <header>
        <p className="text-xs font-semibold uppercase tracking-widest text-[#c6352e]">
          Módulo de Mantención · Guía de uso
        </p>
        <h1 className="mt-1 text-2xl font-bold leading-tight text-[#253158]">
          Guía de uso del Módulo de Mantención
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-gray-500">
          ¿Primera vez? Sigue este orden. El ciclo va de la flota al plan, del
          plan a la orden de trabajo y de ahí al certificado y los vencimientos.
        </p>
        <div className="mt-4">
          <TourButton module="MANTENCION" />
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
