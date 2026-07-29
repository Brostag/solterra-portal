// Cadena de documentos de terreno: capa server-side que lee el documento de
// ORIGEN y devuelve una LISTA BLANCA de valores para prellenar el documento
// SIGUIENTE. Nunca devuelve el documento crudo.
//
//   Registro de ingreso/salida (Operación) → Check List de mantención
//   Check List de mantención               → Orden de trabajo (Taller)
//   Orden de trabajo                       → Certificado de mantención
//
// Reglas de esta capa:
//  - Solo se ejecuta en el servidor (Server Components / server actions). El
//    proyecto no tiene la dependencia `server-only`, por eso no se importa: el
//    aislamiento lo da `@/lib/prisma`, que ya es server-only de hecho.
//  - El cliente jamás manda valores copiados: manda solo el id del origen y el
//    servidor vuelve a leer el documento (mismo criterio que /api/cotizador/pdf).
//  - Sin `unstable_cache`: se lee una vez al abrir un formulario y debe estar
//    fresco (un registro creado hace 10 segundos tiene que aparecer completo).
//  - Todo lo que sale de aquí es una PROPUESTA: el formulario destino deja cada
//    campo editable.
//  - Campos excluidos a propósito por cruzar el muro entre módulos:
//    rut_responsable y rut_receptor del registro (dato personal que Mantención
//    no necesita), firmas b64, fotos y cualquier campo no listado abajo.

import { prisma } from "@/lib/prisma";
import {
  TIPO_MANTENCION_OPCIONES as TIPOS_CHECKLIST,
  type ChecklistMantData,
  type ItemValor,
} from "@/lib/terreno/checklist-mantencion-items";
import {
  REGISTRO_COMPONENTES,
  type ComponenteEstado,
  type ValorComponente,
} from "@/lib/terreno/registro-componentes";
import { toLocalDateInput, toLocalDateTimeInput, toUTCDateInput } from "@/lib/terreno/format";
import {
  derivarOrdenTrabajo,
  tipoOTdesdeChecklist,
} from "@/lib/terreno/derivaciones-checklist";

// ── Helpers internos ───────────────────────────────────────

// Decimal de Prisma → number (o null). Nunca dejar Decimal cruzar al cliente.
function num(v: unknown): number | null {
  if (v == null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

// Texto vacío → null, para no prellenar campos con "" y ensuciar el formulario.
function texto(v: string | null | undefined): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t ? t : null;
}

// @db.Date (medianoche UTC) → "27/07/2026" legible. Se formatea en UTC para no
// retroceder un día en Chile (UTC-4).
function fechaLegibleUTC(d: Date): string {
  return d.toLocaleDateString("es-CL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "UTC",
  });
}

// DateTime completo → "27/07/2026" en hora local.
function fechaLegibleLocal(d: Date): string {
  return d.toLocaleDateString("es-CL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

// Hoy en hora local chilena, formato "YYYY-MM-DD" para <input type="date">.
function hoyInput(): string {
  return toLocalDateInput(new Date().toISOString()) ?? "";
}

// Estados del documento de ORIGEN que hacen que no se proponga nada. Los strings
// son los mismos que validan las acciones de cada módulo
// (operacion/partes-diarios/actions.ts y mantencion/taller/actions.ts): si allá
// cambian, cambian acá.
const REGISTRO_RECHAZADO = "Rechazado";
const OT_COMPLETADA = "Completada";

// El tipo de mantención tiene tres vocabularios distintos en el proyecto
// (registro, checklist y whitelist del taller). Nunca se copia el valor crudo:
// se valida contra el catálogo del DESTINO y, si no calza, se devuelve null
// para que el formulario use su propio valor por defecto.
function tipoMantencionParaChecklist(raw: string | null): string | null {
  const t = texto(raw);
  if (!t) return null;
  return TIPOS_CHECKLIST.includes(t) ? t : null;
}

// El JSON `componentes` del registro llega como Prisma.JsonValue. Se valida a
// mano antes de tocarlo.
function leerComponentes(raw: unknown): Record<string, ComponenteEstado> {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  return raw as Record<string, ComponenteEstado>;
}

function valorComponente(v: unknown): ValorComponente | null {
  return v === "SI" || v === "NO" || v === "NA" ? v : null;
}

// Componentes marcados "NO" en el registro → una línea legible por componente.
// Son HALLAZGOS (algo que está mal y nadie reparó todavía), no trabajos hechos:
// por eso van a las observaciones del Check List y NUNCA a su sección C
// ("Mantención Correctiva"), que la derivación a la orden de trabajo empuja a
// `trabajos_realizados`. Mezclarlos haría que la OT declarara como ejecutado un
// trabajo que solo fue detectado.
function hallazgosDesdeComponentes(raw: unknown): string[] {
  const data = leerComponentes(raw);
  const lineas: string[] = [];

  for (const { key, label } of REGISTRO_COMPONENTES) {
    const estado = data[key];
    if (!estado || typeof estado !== "object") continue;

    const momentos: string[] = [];
    if (valorComponente(estado.ingreso) === "NO") momentos.push("ingreso");
    if (valorComponente(estado.salida) === "NO") momentos.push("salida");
    if (momentos.length === 0) continue;

    const obs = [texto(estado.obs_i), texto(estado.obs_s)]
      .filter((o): o is string => o !== null)
      .join(" / ");

    lineas.push(
      `${label}: sin conformidad en ${momentos.join(" y ")}${obs ? ` — ${obs}` : ""}`,
    );
  }

  return lineas;
}

// El JSON `items` del Check List llega como Prisma.JsonValue. Se normaliza a
// ChecklistMantData antes de pasarlo a las derivaciones.
function leerItemsChecklist(raw: unknown): ChecklistMantData {
  const vacio: ChecklistMantData = { seccion_a: {}, seccion_b: {}, seccion_c: [] };
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return vacio;

  const obj = raw as Partial<Record<keyof ChecklistMantData, unknown>>;
  const seccion = (v: unknown): Record<string, ItemValor> =>
    v && typeof v === "object" && !Array.isArray(v)
      ? (v as Record<string, ItemValor>)
      : {};

  return {
    seccion_a: seccion(obj.seccion_a),
    seccion_b: seccion(obj.seccion_b),
    seccion_c: Array.isArray(obj.seccion_c)
      ? obj.seccion_c.filter((s): s is string => typeof s === "string")
      : [],
  };
}

// El horómetro/odómetro de la ficha del equipo (MantEquipo.horometro_actual /
// km_actual) solo se escribe editando el equipo a mano, así que no es fuente
// confiable. La fuente correcta es el último registro del equipo, y siempre se
// muestra la fecha de ese dato para que el usuario sepa qué tan viejo es.
async function ultimoRegistroDelEquipo(equipoId: string): Promise<{
  fecha: string; // legible
  horometro: number | null;
  odometro: number | null;
} | null> {
  const r = await prisma.mantParteDiario.findFirst({
    where: { equipo_id: equipoId, deleted_at: null },
    orderBy: [{ fecha: "desc" }, { created_at: "desc" }],
    select: { fecha: true, fecha_salida: true, horometro: true, odometro: true },
  });
  if (!r) return null;
  return {
    fecha: fechaLegibleUTC(r.fecha_salida ?? r.fecha),
    horometro: num(r.horometro),
    odometro: num(r.odometro),
  };
}

// ── Registro de ingreso/salida → Check List de mantención ──

export type PrefillChecklist = {
  /** Valores propuestos para el formulario. Todos quedan editables. */
  equipo_id: string;
  /**
   * Siempre null: el encargado del Check List es de Mantención y no se hereda
   * del operador de Operaciones que llenó el registro. Ese valor viajaría
   * después a la OT y al Certificado (quien firma), y dejaría tres documentos
   * del ciclo a nombre de alguien que no hizo la mantención.
   */
  responsable_id: null;
  /** "YYYY-MM-DD" para <input type="date"> (fecha_salida si existe). */
  fecha: string;
  /** Validado contra el catálogo del Check List; null = usar el default del form. */
  tipo_mantencion: string | null;
  horometro: number | null;
  /** Odómetro del registro. En el Check List el campo se llama `km`. */
  kilometraje: number | null;
  /**
   * Observaciones del registro + los componentes marcados "NO" como hallazgos.
   * No se siembra la sección C del Check List: ver hallazgosDesdeComponentes.
   */
  observaciones_generales: string | null;

  /** Contexto para el aviso de origen. */
  origen_id: string;
  origen_href: string;
  fecha_registro: string;
  equipo_codigo: string | null;
  equipo_nombre: string | null;
};

export async function prefillChecklistDesdeRegistro(
  registroId: string,
): Promise<PrefillChecklist | null> {
  if (!registroId) return null;

  // mant_partes_diarios usa deleted_at (no tiene anulado_at). Un registro
  // "Rechazado" es un documento que el supervisor desestimó: sus horómetros y
  // sus componentes no sirven como propuesta, así que se devuelve null y el
  // Check List se abre en blanco. "Pendiente" sí sirve (todavía no lo revisan,
  // pero es lo que el operador acaba de medir en terreno).
  const r = await prisma.mantParteDiario.findFirst({
    where: { id: registroId, deleted_at: null, estado: { not: REGISTRO_RECHAZADO } },
    select: {
      id: true,
      equipo_id: true,
      fecha: true,
      fecha_salida: true,
      tipo_mantencion: true,
      horometro: true,
      odometro: true,
      observaciones: true,
      componentes: true,
      equipo: { select: { codigo: true, nombre: true } },
    },
  });
  if (!r) return null;

  const fechaRef = r.fecha_salida ?? r.fecha;

  // Los componentes con falla se proponen como observación, nunca como
  // "Mantención Correctiva (C)": lo que la sección C dice haber hecho termina
  // en `trabajos_realizados` de la orden de trabajo.
  const hallazgos = hallazgosDesdeComponentes(r.componentes);
  const bloqueHallazgos = hallazgos.length
    ? `Hallazgos del registro de ingreso/salida:\n${hallazgos
        .map((h) => `- ${h}`)
        .join("\n")}`
    : null;
  const observaciones =
    [texto(r.observaciones), bloqueHallazgos].filter(Boolean).join("\n\n") || null;

  return {
    equipo_id: r.equipo_id,
    responsable_id: null,
    fecha: toUTCDateInput(fechaRef.toISOString()) ?? hoyInput(),
    tipo_mantencion: tipoMantencionParaChecklist(r.tipo_mantencion),
    horometro: num(r.horometro),
    kilometraje: num(r.odometro),
    observaciones_generales: observaciones,

    origen_id: r.id,
    origen_href: `/operacion/partes-diarios/${r.id}`,
    fecha_registro: fechaLegibleUTC(fechaRef),
    equipo_codigo: r.equipo?.codigo ?? null,
    equipo_nombre: r.equipo?.nombre ?? null,
  };
}

// ── Check List de mantención → Orden de trabajo ────────────

export type PrefillOT = {
  equipo_id: string;
  /** Responsable del Check List. Si es null, el destino usa la sesión. */
  responsable_id: string | null;
  /** Tipo ya mapeado a la whitelist del Taller. */
  tipo: string;
  /** "YYYY-MM-DDTHH:mm" local para <input type="datetime-local">. */
  fecha_inicio: string;
  horometro_realizada: number | null;
  proxima_mantencion_horometro: number | null;
  descripcion: string;
  trabajos_realizados: string | null;
  repuestos_usados: string | null;
  observaciones: string | null;

  /** Contexto para el aviso de origen. */
  origen_id: string;
  origen_href: string;
  checklist_correlativo: number;
  checklist_anio: number;
  fecha_checklist: string;
  equipo_codigo: string | null;
  equipo_nombre: string | null;
};

export async function prefillOTDesdeChecklist(
  checklistId: string,
): Promise<PrefillOT | null> {
  if (!checklistId) return null;

  // mant_checklists_mantencion usa anulado_at (no tiene deleted_at).
  const c = await prisma.mantChecklistMantencion.findFirst({
    where: { id: checklistId, anulado_at: null },
    select: {
      id: true,
      correlativo: true,
      anio: true,
      equipo_id: true,
      responsable_id: true,
      fecha: true,
      tipo_mantencion: true,
      horometro_snapshot: true,
      proxima_mantencion: true,
      observaciones_generales: true,
      items: true,
      equipo: { select: { codigo: true, nombre: true } },
    },
  });
  if (!c) return null;

  const data = leerItemsChecklist(c.items);
  const fechaLegible = fechaLegibleUTC(c.fecha);
  // El número y la fecha del Check List van en el encabezado del bloque de
  // pendientes para que la OT diga de qué documento salieron. Las observaciones
  // generales NO se pasan acá: se concatenan más abajo (si no, se duplicarían).
  const derivado = derivarOrdenTrabajo(data, {
    correlativo: c.correlativo,
    fecha: fechaLegible,
  });

  // La descripción de la OT es obligatoria: se arma con la referencia al
  // Check List para que la orden quede trazable aunque el usuario no escriba.
  const descripcion =
    `Mantención tipo ${c.tipo_mantencion} según Check List N°${c.correlativo}` +
    (c.anio ? `/${c.anio}` : "") +
    ` del ${fechaLegible}.`;

  // Las observaciones generales del Check List se suman a las derivadas de los
  // ítems, sin pisarlas.
  const obsDerivadas = texto(derivado.observaciones);
  const obsChecklist = texto(c.observaciones_generales);
  const observaciones =
    obsDerivadas && obsChecklist
      ? `${obsChecklist}\n\n${obsDerivadas}`
      : (obsChecklist ?? obsDerivadas);

  // fecha_inicio = ahora. El Check List guarda un @db.Date (medianoche UTC) y
  // convertirlo a datetime-local reintroduce el off-by-one ya corregido; además
  // la OT empieza cuando se abre, igual que en generarOrdenTrabajo().
  const fechaInicio = toLocalDateTimeInput(new Date().toISOString()) ?? "";

  return {
    equipo_id: c.equipo_id,
    responsable_id: c.responsable_id,
    tipo: tipoOTdesdeChecklist(c.tipo_mantencion),
    fecha_inicio: fechaInicio,
    horometro_realizada: num(c.horometro_snapshot),
    proxima_mantencion_horometro: num(c.proxima_mantencion),
    descripcion,
    trabajos_realizados: texto(derivado.trabajos_realizados),
    repuestos_usados: texto(derivado.repuestos_usados),
    observaciones,

    origen_id: c.id,
    origen_href: `/mantencion/checklist-mantencion/${c.id}`,
    checklist_correlativo: c.correlativo,
    checklist_anio: c.anio,
    fecha_checklist: fechaLegible,
    equipo_codigo: c.equipo?.codigo ?? null,
    equipo_nombre: c.equipo?.nombre ?? null,
  };
}

// ── Orden de trabajo → Certificado de mantención ───────────

export type PrefillCertificado = {
  equipo_id: string;
  responsable_id: string | null;
  /** "YYYY-MM-DD": fecha_fin de la OT si existe, si no hoy. */
  fecha: string;
  horometro: number | null;
  odometro: number | null;
  proxima_mantencion: number | null;

  /** Contexto para el aviso de origen. */
  origen_id: string;
  origen_href: string;
  ot_tipo: string;
  fecha_ot: string;
  equipo_codigo: string | null;
  equipo_nombre: string | null;
  /**
   * Fecha del último registro del equipo cuando AL MENOS UNO de los dos datos
   * salió de ahí. null = ambos vienen de la propia OT, o no hay registro.
   * Para redactar el aviso hay que mirar las dos banderas de abajo: decir
   * "horómetro y odómetro del registro" cuando solo el odómetro lo es, es falso.
   */
  dato_equipo_fecha: string | null;
  /** true = el horómetro salió del registro porque la OT no lo traía. */
  horometro_de_registro: boolean;
  /** true = el odómetro salió del registro. La OT nunca tiene odómetro. */
  odometro_de_registro: boolean;
};

export async function prefillCertificadoDesdeOT(
  otId: string,
): Promise<PrefillCertificado | null> {
  if (!otId) return null;

  // mant_mantenciones usa deleted_at (no tiene anulado_at). El certificado
  // acredita una mantención TERMINADA: si la orden sigue "Programada" o "En
  // Proceso" no hay nada que certificar y, además, su fecha_fin todavía es null,
  // con lo que se propondría la fecha de hoy para un trabajo que no ha cerrado.
  const m = await prisma.mantMantencion.findFirst({
    where: { id: otId, deleted_at: null, estado: OT_COMPLETADA },
    select: {
      id: true,
      equipo_id: true,
      responsable_id: true,
      tipo: true,
      fecha_inicio: true,
      fecha_fin: true,
      horometro_realizada: true,
      proxima_mantencion_horometro: true,
      equipo: { select: { codigo: true, nombre: true } },
    },
  });
  if (!m) return null;

  const horometroOT = num(m.horometro_realizada);

  // El odómetro no existe en la OT y la ficha del equipo no es fuente confiable:
  // se completa con el último registro del equipo, informando su fecha.
  const ultimo = await ultimoRegistroDelEquipo(m.equipo_id);
  const horometro = horometroOT ?? ultimo?.horometro ?? null;
  const odometro = ultimo?.odometro ?? null;

  // Dos banderas y no una: el caso normal es que el horómetro venga de la propia
  // OT y solo el odómetro del registro. Con una sola bandera la pantalla decía
  // que ambos salieron del registro, y eso era falso.
  const horometroDeRegistro = horometroOT == null && horometro != null;
  const odometroDeRegistro = odometro != null;

  return {
    equipo_id: m.equipo_id,
    responsable_id: m.responsable_id,
    fecha: m.fecha_fin
      ? (toLocalDateInput(m.fecha_fin.toISOString()) ?? hoyInput())
      : hoyInput(),
    horometro,
    odometro,
    proxima_mantencion: num(m.proxima_mantencion_horometro),

    origen_id: m.id,
    origen_href: `/mantencion/taller/${m.id}`,
    ot_tipo: m.tipo,
    fecha_ot: fechaLegibleLocal(m.fecha_fin ?? m.fecha_inicio),
    equipo_codigo: m.equipo?.codigo ?? null,
    equipo_nombre: m.equipo?.nombre ?? null,
    dato_equipo_fecha:
      horometroDeRegistro || odometroDeRegistro ? (ultimo?.fecha ?? null) : null,
    horometro_de_registro: horometroDeRegistro,
    odometro_de_registro: odometroDeRegistro,
  };
}
