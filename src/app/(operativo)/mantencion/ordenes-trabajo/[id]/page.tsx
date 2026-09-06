import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, FileText } from "lucide-react";
import { getParteDetalle, getFotosFirmadas } from "@/lib/terreno/queries";
import { getPortalSessionFast } from "@/lib/auth/session";
import { canAccessModule } from "@/lib/modules";
import FotosRegistro from "@/components/operacion/FotosRegistro";
import PdfShareActions from "@/components/portal/PdfShareActions";
import RevisarParteButtons from "@/components/operacion/RevisarParteButtons";
import PasoSiguiente from "@/components/terreno/PasoSiguiente";
import { REGISTRO_COMPONENTES as COMPONENTES_DEF } from "@/lib/terreno/registro-componentes";

function fechaUTC(iso: string): string {
  return new Date(iso).toLocaleDateString("es-CL", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

function estadoBadge(estado: string): string {
  if (estado === "Aprobado") return "bg-green-50 text-green-700 ring-1 ring-green-600/20";
  if (estado === "Rechazado") return "bg-red-50 text-[#c6352e] ring-1 ring-red-600/20";
  return "bg-amber-50 text-amber-700 ring-1 ring-amber-600/20";
}

function fmt(n: number | null): string {
  return n != null ? n.toLocaleString("es-CL") : "—";
}

function fechaLarga(iso: string): string {
  return new Date(iso).toLocaleDateString("es-CL", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ fotos?: string }>;
};

// Mensaje del aviso de fotos no subidas al crear, con singular/plural
// correctos. `n` ya viene validado como entero positivo (ver más abajo).
function avisoFotosNoSubidas(n: number): string {
  if (n === 1) {
    return "No se pudo subir 1 foto al crear la orden. Agrégala de nuevo desde las secciones de fotos más abajo.";
  }
  return `No se pudieron subir ${n} fotos al crear la orden. Agrégalas de nuevo desde las secciones de fotos más abajo.`;
}

export default async function ParteDetallePage({ params, searchParams }: Props) {
  const { id } = await params;
  const { fotos } = await searchParams;
  // Solo se muestra con un entero positivo válido: cualquier otra cosa en el
  // query string (vacío, texto, negativo) no dispara el aviso.
  const fotosNum = Number(fotos);
  const fotosFallidas =
    fotos !== undefined && Number.isInteger(fotosNum) && fotosNum > 0 ? fotosNum : null;
  const [p, session] = await Promise.all([
    getParteDetalle(id),
    getPortalSessionFast(),
  ]);
  if (!p) notFound();

  // Las URLs firmadas de Storage expiran en 1 h, así que se resuelven en cada
  // render y nunca dentro de un unstable_cache: una URL cacheada se serviría
  // vencida. Las dos llamadas van en paralelo porque son independientes.
  // El grupo "tablero" (fotos_tablero) sigue existiendo en la base de datos
  // y en el endpoint de subida, pero ya no se muestra acá: decisión de
  // producto del cliente, confundía a los operadores. No requiere migración.
  const [urlsEntrada, urlsSalida] = await Promise.all([
    getFotosFirmadas(p.fotos_entrada),
    getFotosFirmadas(p.fotos_salida),
  ]);

  const puedeEditar = !!session && canAccessModule(session, "MANTENCION");

  // Más estricto que `puedeEditar`: subir o borrar fotos y registrar la salida
  // exigen además ser el dueño del registro (misma regla que aplican el
  // endpoint de fotos y la action registrarSalida). Sin esto se mostrarían
  // botones que el servidor rechaza con 403.
  const esDuenoOSupervisor =
    puedeEditar &&
    !!session &&
    (p.operador_id === session.id ||
      session.rol === "ADMINISTRADOR" ||
      session.rol === "SUPERVISOR");

  const puedeRevisar =
    !!session &&
    p.estado === "Pendiente" &&
    canAccessModule(session, "MANTENCION") &&
    (session.rol === "ADMINISTRADOR" || session.rol === "SUPERVISOR");

  // Paso siguiente del ciclo: el Check List se crea en Mantención, así que la
  // banda solo aparece si la sesión puede crearlo ahí. Un registro Rechazado no
  // sirve de origen (estados en partes-diarios/actions.ts: Pendiente, Aprobado,
  // Rechazado): prefillChecklistDesdeRegistro devuelve null para ese estado, así
  // que la banda abriría el check list en blanco.
  const puedeCrearChecklist =
    !!session &&
    p.estado !== "Rechazado" &&
    canAccessModule(session, "MANTENCION") &&
    (session.rol === "ADMINISTRADOR" || session.rol === "SUPERVISOR");

  const pdfUrl = `/api/operacion/registro/${p.id}/pdf`;
  const tituloDocumento = `Orden de Trabajo ${p.equipoCodigo ?? ""}`.trim();
  // El nombre del archivo se arma con el código del equipo: se limpia porque
  // termina en una cabecera Content-Disposition y en el disco del usuario.
  const nombreArchivoPdf = `orden-trabajo-${
    (p.equipoCodigo ?? "equipo").replace(/[^A-Za-z0-9._-]/g, "") || "equipo"
  }-${p.id.slice(0, 8)}.pdf`;

  const datos = [
    { label: "Equipo", value: p.equipo ? `${p.equipoCodigo ?? ""} ${p.equipo}`.trim() : "—" },
    { label: "Responsable", value: p.operador ?? "—" },
    { label: "Fecha de ingreso", value: fechaUTC(p.fecha) },
    { label: "Fecha de salida", value: p.fecha_salida ? fechaUTC(p.fecha_salida) : "—" },
    { label: "Estado", value: p.estado },
    { label: "Área de uso", value: p.area_uso ?? "—" },
    { label: "Centro de costo", value: p.centro_costo ?? "—" },
    { label: "Tipo de mantención", value: p.tipo_mantencion ?? "—" },
    { label: "Horómetro ingreso", value: p.horometro != null ? `${fmt(p.horometro)} h` : "—" },
    { label: "Odómetro ingreso", value: p.odometro != null ? `${fmt(p.odometro)} km` : "—" },
    // horometro_fin / km_fin son las lecturas al momento de la salida, que
    // captura el paso "Registrar salida".
    { label: "Horómetro salida", value: p.horometro_fin != null ? `${fmt(p.horometro_fin)} h` : "—" },
    { label: "Odómetro salida", value: p.km_fin != null ? `${fmt(p.km_fin)} km` : "—" },
    { label: "Combustible", value: p.combustible_fraccion ?? "—" },
    {
      label: "Responsable ingreso",
      value: p.nombre_responsable
        ? `${p.nombre_responsable}${p.rut_responsable ? ` · ${p.rut_responsable}` : ""}`
        : "—",
    },
    {
      label: "Receptor salida",
      value: p.nombre_receptor
        ? `${p.nombre_receptor}${p.rut_receptor ? ` · ${p.rut_receptor}` : ""}`
        : "—",
    },
  ];

  const textos = [
    { label: "Observaciones generales", value: p.observaciones },
    // descripcion_trabajo es la columna heredada que el paso de salida
    // reutiliza como observaciones de ese momento (ver registrarSalida).
    { label: "Observaciones de salida", value: p.descripcion_trabajo },
  ].filter((t) => t.value);

  const componentes = COMPONENTES_DEF.map((c) => ({
    label: c.label,
    ingreso: p.componentes?.[c.key]?.ingreso ?? null,
    salida: p.componentes?.[c.key]?.salida ?? null,
  })).filter((c) => c.ingreso || c.salida);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {fotosFallidas !== null && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
          <p className="text-sm text-amber-700">{avisoFotosNoSubidas(fotosFallidas)}</p>
        </div>
      )}
      <Link
        href="/mantencion/ordenes-trabajo"
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 transition hover:text-[#253158]"
      >
        <ChevronLeft className="h-4 w-4" /> Volver a órdenes de trabajo
      </Link>

      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="inline-flex h-11 w-11 items-center justify-center rounded-lg bg-[#253158]/10 text-[#253158]">
            <FileText className="h-5 w-5" />
          </span>
          <div>
            <h1 className="text-2xl font-bold text-[#253158]">{p.equipo ?? "Orden de trabajo"}</h1>
            <p className="mt-0.5 text-sm text-gray-500">{fechaLarga(p.fecha)}</p>
          </div>
        </div>
        {/* La insignia de estado es información, no una acción: se separa del
            grupo de acciones (gap-3 acá vs. gap-2 adentro) para que no se lea
            como un botón más. Solo hay UNA acción primaria ("Editar", azul
            sólido); descargar/imprimir/compartir son secundarias y viven
            agrupadas en un único control segmentado, igual que la columna
            "Acciones" del listado de órdenes de trabajo. */}
        <div className="flex flex-wrap items-center gap-3">
          <span
            className={"rounded-full px-3 py-1 text-xs font-medium " + estadoBadge(p.estado)}
          >
            {p.estado}
          </span>
          {puedeEditar && (
            <Link
              href={`/mantencion/ordenes-trabajo/${p.id}/editar`}
              className="rounded-lg bg-[#253158] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#1b2540]"
            >
              Editar
            </Link>
          )}
          <div className="flex items-center gap-2">
            {/* Mismo bloque de compartir que facturas y órdenes de compra,
                en su variante de íconos: en móvil la Web Share API adjunta
                el PDF de verdad; en escritorio descarga el archivo y abre
                WhatsApp o el correo con el texto. incluirImprimir absorbe
                el PrintPdfButton que antes iba suelto al lado. */}
            <PdfShareActions
              pdfUrl={pdfUrl}
              fileName={nombreArchivoPdf}
              title={tituloDocumento}
              whatsappMessage={`Hola, te envío la ${tituloDocumento} de Solterra SpA. El PDF se descargó en este dispositivo para adjuntarlo si WhatsApp no lo adjunta automáticamente.`}
              emailSubject={`${tituloDocumento} — Solterra SpA`}
              emailBody={`Estimados,\n\nAdjunto la ${tituloDocumento}${p.equipo ? ` del equipo ${p.equipoCodigo ?? ""} ${p.equipo}`.trimEnd() : ""}, con fecha de ingreso ${fechaUTC(p.fecha)}. Si el archivo no se adjuntó automáticamente, fue descargado para adjuntarlo manualmente.\n\nSaludos,\nSolterra SpA`}
              variant="iconos"
              incluirImprimir
            />
          </div>
        </div>
      </header>

      <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
        <dl className="grid grid-cols-1 gap-x-8 gap-y-4 sm:grid-cols-2">
          {datos.map((d) => (
            <div key={d.label} className="flex flex-col">
              <dt className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                {d.label}
              </dt>
              <dd className="mt-0.5 text-sm text-[#253158]">{d.value}</dd>
            </div>
          ))}
        </dl>
      </section>

      {textos.length > 0 && (
        <section className="space-y-4 rounded-xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
          {textos.map((t) => (
            <div key={t.label}>
              <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                {t.label}
              </h2>
              <p className="mt-1 whitespace-pre-wrap text-sm text-[#253158]">{t.value}</p>
            </div>
          ))}
        </section>
      )}

      {componentes.length > 0 && (
        <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
          <h2 className="mb-3 text-sm font-semibold text-[#253158]">Componentes</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-gray-100 text-xs uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="py-2 pr-4 font-semibold">Componente</th>
                  <th className="py-2 pr-4 text-center font-semibold">Ingreso</th>
                  <th className="py-2 text-center font-semibold">Salida</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {componentes.map((c) => (
                  <tr key={c.label}>
                    <td className="py-2 pr-4 text-[#253158]">{c.label}</td>
                    <td className="py-2 pr-4 text-center text-gray-600">{c.ingreso ?? "—"}</td>
                    <td className="py-2 text-center text-gray-600">{c.salida ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Estado del equipo en fotos: cómo llegó al taller y cómo salió. */}
      <section className="space-y-6 rounded-xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
        <FotosRegistro
          registroId={p.id}
          grupo="entrada"
          titulo="Fotos de entrada"
          paths={p.fotos_entrada}
          urls={urlsEntrada}
          puedeEditar={esDuenoOSupervisor}
        />
        <FotosRegistro
          registroId={p.id}
          grupo="salida"
          titulo="Fotos de salida"
          paths={p.fotos_salida}
          urls={urlsSalida}
          puedeEditar={esDuenoOSupervisor}
        />
      </section>

      {/* La salida es un paso posterior al ingreso: el equipo puede quedar
          días en el taller antes de que se registre. */}
      {esDuenoOSupervisor && (
        <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="min-w-0">
              <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                Salida del equipo
              </h2>
              <p className="mt-0.5 text-sm font-semibold text-[#253158]">
                {p.fecha_salida
                  ? `Registrada el ${fechaUTC(p.fecha_salida)}`
                  : "Pendiente"}
              </p>
              <p className="mt-0.5 text-sm text-gray-500">
                {p.fecha_salida
                  ? "Puedes corregir la fecha, el receptor y el estado de los componentes al salir."
                  : "Cuando el equipo salga del taller, registra la fecha, el receptor, el horómetro y el estado de los componentes."}
              </p>
            </div>
            <Link
              href={`/mantencion/ordenes-trabajo/${p.id}/salida`}
              className="rounded-lg bg-[#253158] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#1b2540]"
            >
              {p.fecha_salida ? "Editar salida" : "Registrar salida"}
            </Link>
          </div>
        </section>
      )}

      {puedeRevisar && (
        <div className="flex flex-col items-end gap-2">
          <p className="text-xs text-gray-500">Revisar orden de trabajo pendiente:</p>
          <RevisarParteButtons id={p.id} />
        </div>
      )}

      {puedeCrearChecklist && (
        <PasoSiguiente
          titulo="Check List de Mantenimiento"
          descripcion="Se copian el equipo, la fecha, el horómetro y los componentes con falla de este registro."
          href={`/mantencion/checklist-mantencion/nuevo?desde=${p.id}`}
          cta="Crear check list"
        />
      )}
    </div>
  );
}
