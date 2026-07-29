"use client";

import { useRef, useState, useTransition } from "react";
import Link from "next/link";
import { unstable_rethrow } from "next/navigation";
import {
  createChecklistMantencion,
  updateChecklistMantencionCabecera,
  type ChecklistMantCabeceraInput,
  type ChecklistMantInput,
} from "@/app/(operativo)/mantencion/checklist-mantencion/actions";
import {
  SECCION_A,
  SECCION_B,
  TIPO_MANTENCION_OPCIONES,
  type ItemMant,
  type ItemValor,
  type ValorItem,
} from "@/lib/terreno/checklist-mantencion-items";
import type { EquipoOption, ResponsableOption } from "@/lib/terreno/queries";
import { inputCls, labelCls, valorBtnCls } from "@/lib/terreno/form-styles";
import { useDraft } from "@/lib/terreno/use-draft";
import {
  aplicarCamposFormulario,
  leerCamposFormulario,
} from "@/lib/terreno/draft-form-fields";
import DraftBanner from "@/components/terreno/DraftBanner";

const VALORES: ValorItem[] = ["SI", "NO", "NA"];

// Campos escalares (no controlados) incluidos en el borrador local.
const CAMPOS_BORRADOR = [
  "equipo_id",
  "responsable_id",
  "fecha",
  "tipo_mantencion",
  "proxima_mantencion",
  "horometro",
  "km",
  "observaciones_generales",
] as const;

// Valores propuestos al abrir el formulario desde un Registro de ingreso/salida
// (?desde=<registroId>). Es un subconjunto estructural de PrefillChecklist
// (src/lib/terreno/cadena.ts): se declara acá para no importar en el cliente un
// módulo que toca Prisma. Todos los valores quedan editables.
export type ChecklistPrefill = {
  equipo_id: string;
  /** Siempre null: el encargado de Mantención no se hereda del operador. */
  responsable_id: string | null;
  fecha: string; // YYYY-MM-DD
  tipo_mantencion: string | null;
  horometro: number | null;
  kilometraje: number | null;
  /** Incluye los componentes con falla del registro como hallazgos. */
  observaciones_generales: string | null;
  origen_id: string;
};

// Modo corrección: el check list ya existe y solo se editan sus datos de
// cabecera. Los 83 ítems y la sección C quedan tal como se guardaron.
export type ChecklistCabecera = {
  id: string;
  equipo_id: string;
  responsable_id: string | null;
  fecha: string; // YYYY-MM-DD
  tipo_mantencion: string;
  horometro_snapshot: number | null;
  km_snapshot: number | null;
  proxima_mantencion: number | null;
  observaciones_generales: string | null;
};

type ChecklistMantDraft = {
  campos: Record<string, string>;
  secA: Record<string, ItemValor>;
  secB: Record<string, ItemValor>;
  correctivas: string[];
};

function initSeccion(items: ItemMant[]): Record<string, ItemValor> {
  return items.reduce(
    (acc, i) => ({ ...acc, [i.codigo]: { valor: null, obs: null } }),
    {} as Record<string, ItemValor>,
  );
}

// Un id propuesto solo se preselecciona si sigue existiendo entre las opciones
// (equipo borrado, operador desactivado). Si no está, el campo queda vacío y su
// `required` obliga a elegir, en vez de guardar en silencio otro valor.
function idEnLista(
  opciones: ReadonlyArray<{ id: string }>,
  id: string | null | undefined,
): string {
  return id && opciones.some((o) => o.id === id) ? id : "";
}

function Seccion({
  titulo,
  items,
  valores,
  onSet,
}: {
  titulo: string;
  items: ItemMant[];
  valores: Record<string, ItemValor>;
  onSet: (codigo: string, valor: ValorItem) => void;
}) {
  return (
    <div>
      <p className="mb-2 rounded-md bg-[#253158] px-3 py-2 text-sm font-semibold text-white">
        {titulo}
      </p>
      <div className="divide-y divide-gray-100 rounded-lg border border-gray-200">
        {items.map((item) => (
          <div
            key={item.codigo}
            className="flex items-center justify-between gap-3 px-3 py-2"
          >
            <span className="text-sm text-[#253158]">
              <span className="mr-2 font-mono text-xs text-gray-400">{item.codigo}</span>
              {item.label}
            </span>
            <div className="flex flex-shrink-0 gap-1">
              {VALORES.map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => onSet(item.codigo, v)}
                  className={valorBtnCls(valores[item.codigo]?.valor === v, v)}
                >
                  {v}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function ChecklistMantForm({
  equipos,
  responsables,
  userId,
  prefill = null,
  cabecera = null,
}: {
  equipos: EquipoOption[];
  responsables: ResponsableOption[];
  userId: string;
  /** Valores propuestos desde el Registro de origen. Todos editables. */
  prefill?: ChecklistPrefill | null;
  /** Si viene, el formulario corrige la cabecera de un check list existente. */
  cabecera?: ChecklistCabecera | null;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [secA, setSecA] = useState<Record<string, ItemValor>>(() => initSeccion(SECCION_A));
  const [secB, setSecB] = useState<Record<string, ItemValor>>(() => initSeccion(SECCION_B));
  // La sección C ("Mantención Correctiva") es lo que el mecánico declara haber
  // reparado: nunca se prellena desde otro documento. Los componentes con falla
  // del registro llegan como observación, no como trabajo hecho.
  const [correctivas, setCorrectivas] = useState<string[]>([]);
  const [nuevaCorrectiva, setNuevaCorrectiva] = useState("");
  const formRef = useRef<HTMLFormElement>(null);

  const draft = useDraft<ChecklistMantDraft>({
    formType: "checklist-mant",
    // Un formulario prellenado desde un registro no puede compartir slot con el
    // borrador del formulario vacío: se pisarían entre sí.
    draftKey: prefill ? `desde-${prefill.origen_id}` : "nuevo",
    userId,
    // Los borradores son create-only: en modo corrección el hook queda inactivo.
    enabled: !cabecera,
    buildSnapshot: () => {
      const campos = leerCamposFormulario(formRef.current, CAMPOS_BORRADOR);
      return campos ? { campos, secA, secB, correctivas } : null;
    },
    applySnapshot: (s) => {
      aplicarCamposFormulario(formRef.current, CAMPOS_BORRADOR, s.campos);
      setSecA({ ...initSeccion(SECCION_A), ...(s.secA ?? {}) });
      setSecB({ ...initSeccion(SECCION_B), ...(s.secB ?? {}) });
      setCorrectivas(
        Array.isArray(s.correctivas)
          ? s.correctivas.filter((c): c is string => typeof c === "string")
          : [],
      );
    },
    watch: [secA, secB, correctivas],
  });

  // Valor inicial de cada campo: cabecera (corrección) > prefill (propuesta) >
  // el default de siempre.
  const tipoPropuesto = cabecera?.tipo_mantencion ?? prefill?.tipo_mantencion ?? "A-B-C";
  const inicial = {
    equipo_id: idEnLista(equipos, cabecera?.equipo_id ?? prefill?.equipo_id),
    // El prefill nunca propone encargado (el del Check List es de Mantención,
    // no el operador que entregó la máquina), así que al crear se cae al perfil
    // de la sesión — mismo criterio que ParteForm. En modo corrección se
    // respeta lo guardado y nunca se sustituye por quien está editando.
    responsable_id: idEnLista(
      responsables,
      cabecera ? cabecera.responsable_id : (prefill?.responsable_id ?? userId),
    ),
    fecha: cabecera?.fecha || prefill?.fecha || new Date().toISOString().slice(0, 10),
    tipo_mantencion: TIPO_MANTENCION_OPCIONES.includes(tipoPropuesto)
      ? tipoPropuesto
      : "A-B-C",
    proxima_mantencion: cabecera?.proxima_mantencion ?? undefined,
    horometro: cabecera?.horometro_snapshot ?? prefill?.horometro ?? undefined,
    km: cabecera?.km_snapshot ?? prefill?.kilometraje ?? undefined,
    observaciones_generales:
      cabecera?.observaciones_generales ?? prefill?.observaciones_generales ?? undefined,
  };

  const setA = (codigo: string, valor: ValorItem) =>
    setSecA((p) => ({ ...p, [codigo]: { ...p[codigo], valor } }));
  const setB = (codigo: string, valor: ValorItem) =>
    setSecB((p) => ({ ...p, [codigo]: { ...p[codigo], valor } }));

  function agregarCorrectiva() {
    const t = nuevaCorrectiva.trim();
    if (!t) return;
    setCorrectivas((p) => [...p, t]);
    setNuevaCorrectiva("");
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    const g = (k: string) => String(fd.get(k) ?? "");
    const datosCabecera: ChecklistMantCabeceraInput = {
      equipo_id: g("equipo_id"),
      responsable_id: g("responsable_id"),
      fecha: g("fecha"),
      tipo_mantencion: g("tipo_mantencion"),
      km: g("km"),
      horometro: g("horometro"),
      proxima_mantencion: g("proxima_mantencion"),
      observaciones_generales: g("observaciones_generales"),
    };
    const input: ChecklistMantInput = {
      ...datosCabecera,
      items: { seccion_a: secA, seccion_b: secB, seccion_c: correctivas },
      // Traza del documento de origen. Viaja solo el id; el servidor vuelve a
      // leer el registro antes de guardarlo.
      registro_id: prefill?.origen_id ?? null,
    };
    // beginSubmit/submitFailed: en éxito el action redirige y su promesa no
    // resuelve; el desmontaje del form confirma el éxito y borra el borrador.
    draft.beginSubmit();
    startTransition(async () => {
      try {
        const res = cabecera
          ? await updateChecklistMantencionCabecera(cabecera.id, datosCabecera)
          : await createChecklistMantencion(input);
        if (res?.error) {
          setError(res.error);
          draft.submitFailed();
        }
      } catch (e) {
        unstable_rethrow(e); // NEXT_REDIRECT (éxito) sigue su curso
        // Falla de red: el borrador se conserva y el autosave sigue activo.
        setError("No se pudo enviar. Revisa tu conexión e intenta nuevamente.");
        draft.submitFailed();
      }
    });
  }

  return (
    <form
      ref={formRef}
      onSubmit={onSubmit}
      onChange={draft.notifyChange}
      className="space-y-6 rounded-xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6"
    >
      {draft.hasDraft && draft.draftSavedAt !== null && (
        <DraftBanner
          savedAt={draft.draftSavedAt}
          onRestore={draft.restoreDraft}
          onDiscard={draft.discardDraft}
        />
      )}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-[#c6352e]">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <label className="block sm:col-span-2">
          <span className={labelCls}>Equipo <span className="text-[#c6352e]">*</span></span>
          <select name="equipo_id" required defaultValue={inicial.equipo_id} className={inputCls}>
            <option value="" disabled>Seleccionar…</option>
            {equipos.map((e) => (
              <option key={e.id} value={e.id}>{e.codigo} · {e.nombre}</option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className={labelCls}>Encargado <span className="text-[#c6352e]">*</span></span>
          <select name="responsable_id" required defaultValue={inicial.responsable_id} className={inputCls}>
            <option value="" disabled>Seleccionar…</option>
            {responsables.map((r) => (
              <option key={r.id} value={r.id}>{r.nombre}</option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className={labelCls}>Fecha <span className="text-[#c6352e]">*</span></span>
          <input name="fecha" type="date" required defaultValue={inicial.fecha} className={inputCls} />
        </label>
        <label className="block">
          <span className={labelCls}>Tipo de mantención <span className="text-[#c6352e]">*</span></span>
          <select name="tipo_mantencion" defaultValue={inicial.tipo_mantencion} className={inputCls}>
            {TIPO_MANTENCION_OPCIONES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </label>
        <label className="block">
          <span className={labelCls}>Próxima mantención</span>
          <input name="proxima_mantencion" type="number" min="0" step="any" defaultValue={inicial.proxima_mantencion} className={inputCls} />
        </label>
        <label className="block">
          <span className={labelCls}>Horómetro (HR)</span>
          <input name="horometro" type="number" min="0" step="any" defaultValue={inicial.horometro} className={inputCls} />
        </label>
        <label className="block">
          <span className={labelCls}>Kilometraje (KM)</span>
          <input name="km" type="number" min="0" step="any" defaultValue={inicial.km} className={inputCls} />
        </label>
      </div>

      {/* En modo corrección los 83 ítems no se muestran: ya están guardados y
          esta pantalla no los modifica. */}
      {!cabecera && (
        <>
          <Seccion titulo="1.0 Mantenimiento del Fabricante (A)" items={SECCION_A} valores={secA} onSet={setA} />
          <Seccion titulo="2.0 Mantenimiento Preventivo (B)" items={SECCION_B} valores={secB} onSet={setB} />

          {/* Sección C: correctivas */}
          <div>
            <p className="mb-2 rounded-md bg-[#253158] px-3 py-2 text-sm font-semibold text-white">
              Mantención Correctiva (C)
            </p>
            <div className="space-y-2">
              {correctivas.map((c, i) => (
                <div key={i} className="flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm text-[#253158]">
                  <span className="flex-1">{c}</span>
                  <button
                    type="button"
                    onClick={() => setCorrectivas((p) => p.filter((_, j) => j !== i))}
                    className="text-xs font-medium text-[#c6352e] hover:underline"
                  >
                    Quitar
                  </button>
                </div>
              ))}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={nuevaCorrectiva}
                  onChange={(e) => setNuevaCorrectiva(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      agregarCorrectiva();
                    }
                  }}
                  placeholder="Describe una reparación correctiva"
                  className={inputCls}
                />
                <button
                  type="button"
                  onClick={agregarCorrectiva}
                  className="whitespace-nowrap rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-[#253158] hover:bg-gray-50"
                >
                  Agregar
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      <label className="block">
        <span className={labelCls}>Observaciones generales</span>
        <textarea name="observaciones_generales" rows={3} defaultValue={inicial.observaciones_generales} className={inputCls} />
      </label>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-[#253158] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#1b2540] disabled:opacity-60"
        >
          {pending ? "Guardando…" : cabecera ? "Guardar cambios" : "Crear check list"}
        </button>
        <Link
          href={
            cabecera
              ? `/mantencion/checklist-mantencion/${cabecera.id}`
              : "/mantencion/checklist-mantencion"
          }
          className="text-sm font-medium text-gray-500 hover:text-[#253158]"
        >
          Cancelar
        </Link>
      </div>
    </form>
  );
}
