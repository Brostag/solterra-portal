import { getPortalSessionFast } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import InstantLink from "@/components/portal/InstantLink";
import {
  Settings,
  Building2,
  Calculator,
  FileText,
  ShoppingCart,
  FolderOpen,
  ShieldCheck,
  BookOpen,
  ArrowRight,
} from "lucide-react";

// Guía de uso estática del Módulo Comercial. Sin queries de datos: solo
// contenido verificado contra las pantallas reales del portal.

type Paso = {
  icon: typeof Settings;
  titulo: string;
  descripcion: string;
  tips: string[];
  href: string;
  hrefLabel: string;
};

const PASOS: Paso[] = [
  {
    icon: Settings,
    titulo: "Configuración de la empresa",
    descripcion:
      "Parte por aquí. Carga la razón social, el RUT, la dirección, el logo y el IVA. Estos datos aparecen en los PDF de cotizaciones y contratos.",
    tips: [
      "Los cambios solo se aplican a documentos generados después de guardar, no a los ya emitidos.",
      "El IVA que definas aquí es el valor por defecto del cotizador.",
      "Solo los Administradores acceden a esta pantalla.",
    ],
    href: "/configuracion",
    hrefLabel: "Ir a Configuración",
  },
  {
    icon: Building2,
    titulo: "Empresas (clientes y proveedores)",
    descripcion:
      "Registra una vez cada cliente, arrendataria o proveedor. Una empresa puede tener varios roles a la vez. Los datos del representante legal quedan guardados para el contrato.",
    tips: [
      "Registra al cliente aquí antes de cotizar o contratar: lo vas a necesitar en los selectores.",
      "El representante legal guardado se reutiliza en el contrato marco.",
      "El rol Usuario no puede crear ni editar empresas.",
    ],
    href: "/empresas",
    hrefLabel: "Ir a Empresas",
  },
  {
    icon: Calculator,
    titulo: "Cotizador → Generar cotización",
    descripcion:
      "Arma el presupuesto en vivo: agrega equipos por horas o por días con sus fechas, ajusta gastos generales y descuento, y revisa el total en el resumen. Presiona «Generar cotización» para guardarla.",
    tips: [
      "«Equipo de la flota» llena el equipo desde Mantención; igual puedes escribirlo a mano.",
      "El N° de cotización usa el formato Solterra (NNN R0/AA) y es editable.",
      "Compartir por PDF, WhatsApp o correo usa la vista previa y no guarda la cotización.",
      "Administradores y Supervisores pueden guardar su lista de gastos por defecto.",
    ],
    href: "/cotizador",
    hrefLabel: "Ir al Cotizador",
  },
  {
    icon: FileText,
    titulo: "Cotizaciones",
    descripcion:
      "Aquí quedan guardadas las cotizaciones formales. Cambian de estado Borrador → Emitida → Anulada. Puedes verlas, descargar el PDF, editar los borradores y anularlas.",
    tips: [
      "Solo los borradores se pueden editar; una vez Emitida queda fija.",
      "El número correlativo no se reordena aunque elimines una cotización.",
      "Una cotización Emitida no se elimina: si ya no aplica, anúlala.",
    ],
    href: "/cotizaciones",
    hrefLabel: "Ir a Cotizaciones",
  },
  {
    icon: FileText,
    titulo: "Contrato Marco",
    descripcion:
      "Formaliza el arriendo. Al asociar una cotización se autocompletan cliente, fechas y equipos. Define la vigencia según las fechas y adjunta las fotos de respaldo de cada equipo.",
    tips: [
      "El cliente debe existir antes en Empresas.",
      "Si ya escribiste equipos y luego eliges una cotización, el sistema te pide confirmar el reemplazo.",
      "Se crea en estado Borrador. El PDF incluye el anexo con el detalle de los equipos.",
    ],
    href: "/contratos",
    hrefLabel: "Ir a Contratos Marco",
  },
  {
    icon: ShoppingCart,
    titulo: "Órdenes de Compra",
    descripcion:
      "Registra las compras que Solterra hace a sus proveedores. Selecciona el proveedor, agrega los ítems y avanza el estado a medida que avanza la compra.",
    tips: [
      "El proveedor debe estar registrado en Empresas.",
      "Avanza el estado: Borrador → Emitida → Enviada → Aprobada.",
      "Adjunta el respaldo del proveedor en Documentos.",
    ],
    href: "/ordenes-compra",
    hrefLabel: "Ir a Órdenes de Compra",
  },
  {
    icon: FolderOpen,
    titulo: "Documentos",
    descripcion:
      "Repositorio central de archivos del negocio. Sube contratos, cotizaciones y respaldos, y asócialos a una empresa, contrato u orden de compra para encontrarlos fácil.",
    tips: [
      "Asociar el documento a una entidad facilita ubicarlo desde su detalle.",
      "Solo Supervisores y Administradores pueden subir y eliminar.",
      "Usa los filtros por tipo y entidad en repositorios grandes.",
    ],
    href: "/documentos",
    hrefLabel: "Ir a Documentos",
  },
  {
    icon: ShieldCheck,
    titulo: "Administración",
    descripcion:
      "Reservado para Administradores. Configuración de la empresa, gestión de Usuarios y sus roles, y el registro de Auditoría con la trazabilidad de todo el sistema.",
    tips: [
      "Los roles son Administrador, Supervisor y Usuario.",
      "Desactivar una cuenta no borra su historial en Auditoría.",
      "La Auditoría es de solo lectura.",
    ],
    href: "/usuarios",
    hrefLabel: "Ir a Usuarios",
  },
];

const FAQS: { q: string; a: string }[] = [
  {
    q: "¿Por qué no puedo editar una cotización emitida?",
    a: "Solo las cotizaciones en estado Borrador se pueden editar. Una vez que pasa a Emitida queda fija como respaldo. Si necesitas cambiarla, anúlala y genera una nueva.",
  },
  {
    q: "¿Qué pasa con el número si elimino una cotización?",
    a: "El número correlativo no se reordena ni se reutiliza. Los números emitidos quedan fijos aunque elimines una cotización de borrador.",
  },
  {
    q: "¿Por qué un equipo no aparece en el cotizador?",
    a: "El cotizador y el contrato solo muestran equipos con estado Activo. Si el equipo está En Mantención o no fue creado en el módulo de Mantención, no aparece en «Equipo de la flota».",
  },
  {
    q: "¿Los cambios de Configuración afectan documentos ya emitidos?",
    a: "No. Los datos de empresa, logo e IVA se aplican solo a los documentos que generes después de guardar. Los PDF ya emitidos conservan los datos que tenían.",
  },
  {
    q: "¿Necesito una cotización para crear un contrato?",
    a: "No es obligatorio, pero es lo recomendado: al asociar la cotización se autocompletan cliente, fechas y equipos. Solo Cliente, Fecha de inicio y los equipos son obligatorios.",
  },
];

export default async function AyudaComercialPage() {
  const session = await getPortalSessionFast();
  if (!session) redirect("/login");

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      {/* Encabezado */}
      <header>
        <p className="text-xs font-semibold uppercase tracking-widest text-[#c6352e]">
          Módulo Comercial · Guía de uso
        </p>
        <h1 className="mt-1 text-2xl font-bold leading-tight text-[#253158]">
          Guía de uso del Módulo Comercial
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-gray-500">
          ¿Primera vez? Sigue este orden. Cada pantalla del flujo comercial se
          apoya en la anterior, así que conviene recorrerlas de arriba hacia
          abajo la primera vez.
        </p>
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
                  <InstantLink
                    href={paso.href}
                    className="mt-4 inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3.5 py-2 text-[13px] font-semibold text-[#253158] transition-colors hover:border-[#253158] hover:bg-[#253158]/5"
                  >
                    {paso.hrefLabel}
                    <ArrowRight className="h-3.5 w-3.5" />
                  </InstantLink>
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
