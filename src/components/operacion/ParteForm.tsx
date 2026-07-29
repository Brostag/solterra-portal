"use client";

import { useRef, useState, useTransition } from "react";
import Link from "next/link";
import { unstable_rethrow } from "next/navigation";
import {
  createParte,
  updateParte,
  type RegistroInput,
} from "@/app/(operativo)/operacion/partes-diarios/actions";
import {
  REGISTRO_COMPONENTES,
  REGISTRO_COMPONENTE_KEYS,
  COMBUSTIBLE_OPCIONES,
  TIPO_MANTENCION_OPCIONES,
  type ComponenteKey,
  type ComponentesData,
  type ValorComponente,
} from "@/lib/terreno/registro-componentes";
import type {
  EquipoOption,
  ResponsableOption,
  ParteDetalle,
  UltimosRegistrosPorEquipo,
} from "@/lib/terreno/queries";
import { inputCls, labelCls, valorBtnCls } from "@/lib/terreno/form-styles";
import { fmtNum, toUTCDateInput } from "@/lib/terreno/format";
import { useDraft } from "@/lib/terreno/use-draft";
import {
  aplicarCamposFormulario,
  leerCamposFormulario,
} from "@/lib/terreno/draft-form-fields";
import DraftBanner from "@/components/terreno/DraftBanner";

const VALORES: ValorComponente[] = ["SI", "NO", "NA"];

// Campos escalares incluidos en el borrador local. Se leen siempre por
// FormData (sirve para controlados y no controlados); al restaurar se separan
// en dos grupos, ver CAMPOS_BORRADOR_DOM.
const CAMPOS_BORRADOR = [
  "equipo_id",
  "operador_id",
  "fecha",
  "fecha_salida",
  "estado",
  "area_uso",
  "centro_costo",
  "tipo_mantencion",
  "combustible_fraccion",
  "nombre_responsable",
  "rut_responsable",
  "nombre_receptor",
  "rut_receptor",
  "horometro",
  "odometro",
  "observaciones",
] as const;

// Campos que el prellenado propone al elegir equipo o responsable. Pasan a
// controlados por estado: escribirlos por DOM (el.value = …) no dispara el
// onChange de React y el valor se perdería en el siguiente render. El resto
// del formulario sigue no controlado, tal como estaba.
const CAMPOS_CONTROLADOS = [
  "equipo_id",
  "operador_id",
  "area_uso",
  "centro_costo",
  "tipo_mantencion",
  "nombre_responsable",
  "horometro",
  "odometro",
] as const;

type CampoControlado = (typeof CAMPOS_CONTROLADOS)[number];
type CamposControlados = Record<CampoControlado, string>;

const CONTROLADOS = new Set<string>(CAMPOS_CONTROLADOS);

// Los que el borrador sí puede restaurar escribiendo el DOM (no controlados).
const CAMPOS_BORRADOR_DOM: readonly string[] = CAMPOS_BORRADOR.filter(
  (k) => !CONTROLADOS.has(k),
);

type ParteDraft = {
  campos: Record<string, string>;
  comp: ComponentesData;
};

// fecha es @db.Date (medianoche UTC): getters UTC para no retroceder un día
// en Chile (UTC-4).
function diaMesUTC(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getUTCDate())}/${pad(d.getUTCMonth() + 1)}`;
}

function initCampos(
  parte: ParteDetalle | undefined,
  perfilSesion: ResponsableOption | null,
): CamposControlados {
  return {
    equipo_id: parte?.equipo_id ?? "",
    // Al crear, el responsable por defecto es quien tiene la sesión abierta.
    operador_id: parte?.operador_id ?? perfilSesion?.id ?? "",
    area_uso: parte?.area_uso ?? "",
    centro_costo: parte?.centro_costo ?? "",
    tipo_mantencion: parte?.tipo_mantencion ?? "",
    nombre_responsable: parte?.nombre_responsable ?? perfilSesion?.nombre ?? "",
    horometro: parte?.horometro != null ? String(parte.horometro) : "",
    odometro: parte?.odometro != null ? String(parte.odometro) : "",
  };
}

function initComponentes(parte?: ParteDetalle): ComponentesData {
  const base: ComponentesData = {};
  for (const k of REGISTRO_COMPONENTE_KEYS) {
    const saved = parte?.componentes?.[k];
    base[k] = {
      ingreso: saved?.ingreso ?? "SI",
      salida: saved?.salida ?? "SI",
      obs_i: saved?.obs_i ?? null,
      obs_s: saved?.obs_s ?? null,
    };
  }
  return base;
}

export default function ParteForm({
  equipos,
  operadores,
  parte,
  userId,
  ultimosRegistros,
}: {
  equipos: EquipoOption[];
  operadores: ResponsableOption[];
  parte?: ParteDetalle;
  userId: string;
  /**
   * Último registro de cada equipo, indexado por equipo_id. Solo se pasa al
   * crear: en modo editar no se prellena nada.
   */
  ultimosRegistros?: UltimosRegistrosPorEquipo;
}) {
  const editar = Boolean(parte);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [comp, setComp] = useState<ComponentesData>(() => initComponentes(parte));
  const formRef = useRef<HTMLFormElement>(null);

  // Perfil de la sesión dentro del selector de responsables. Si está inactivo
  // no aparece en la lista y entonces no se propone nada.
  const perfilSesion = operadores.find((o) => o.id === userId) ?? null;

  const [campos, setCampos] = useState<CamposControlados>(() =>
    initCampos(parte, editar ? null : perfilSesion),
  );

  // Valores que propuso el propio formulario. Sirve para distinguir "lo
  // escribió la persona" de "lo propusimos nosotros": al cambiar de equipo se
  // reemplaza lo que siga siendo nuestra propuesta anterior, y nunca lo que
  // alguien escribió a mano o restauró desde un borrador.
  const propuestosRef = useRef<Partial<Record<CampoControlado, string>>>(
    editar || !perfilSesion ? {} : { nombre_responsable: perfilSesion.nombre },
  );

  function setCampo(clave: CampoControlado, valor: string) {
    // Lo tipeado por la persona deja de ser propuesta nuestra.
    const propuestos = { ...propuestosRef.current };
    delete propuestos[clave];
    propuestosRef.current = propuestos;
    setCampos((prev) => ({ ...prev, [clave]: valor }));
  }

  // Propone `valor` solo si el campo está vacío o si aún conserva la propuesta
  // anterior del formulario.
  function proponer(
    destino: CamposControlados,
    propuestos: Partial<Record<CampoControlado, string>>,
    clave: CampoControlado,
    valor: string | null,
  ) {
    if (!valor) return;
    const actual = destino[clave];
    if (actual !== "" && actual !== propuestos[clave]) return;
    destino[clave] = valor;
    propuestos[clave] = valor;
  }

  function onEquipoChange(equipoId: string) {
    const siguiente: CamposControlados = { ...campos, equipo_id: equipoId };
    const propuestos = { ...propuestosRef.current };
    const ultimo = editar ? undefined : ultimosRegistros?.[equipoId];
    if (ultimo) {
      proponer(siguiente, propuestos, "horometro", ultimo.horometro != null ? String(ultimo.horometro) : null);
      proponer(siguiente, propuestos, "odometro", ultimo.odometro != null ? String(ultimo.odometro) : null);
      proponer(siguiente, propuestos, "area_uso", ultimo.area_uso);
      proponer(siguiente, propuestos, "centro_costo", ultimo.centro_costo);
      // Solo si el tipo sigue existiendo en el catálogo: un valor fuera de la
      // lista dejaría el select en blanco.
      const tipo =
        ultimo.tipo_mantencion && TIPO_MANTENCION_OPCIONES.includes(ultimo.tipo_mantencion)
          ? ultimo.tipo_mantencion
          : null;
      proponer(siguiente, propuestos, "tipo_mantencion", tipo);
    }
    propuestosRef.current = propuestos;
    setCampos(siguiente);
  }

  function onResponsableChange(operadorId: string) {
    const siguiente: CamposControlados = { ...campos, operador_id: operadorId };
    const propuestos = { ...propuestosRef.current };
    if (!editar) {
      const nombre = operadores.find((o) => o.id === operadorId)?.nombre ?? null;
      proponer(siguiente, propuestos, "nombre_responsable", nombre);
    }
    propuestosRef.current = propuestos;
    setCampos(siguiente);
  }

  // Último registro del equipo elegido: alimenta el aviso de origen que se
  // muestra bajo horómetro y odómetro.
  const ultimoDelEquipo = editar ? undefined : ultimosRegistros?.[campos.equipo_id];

  // Borradores solo al crear (el alcance offline v1 es create-only).
  const draft = useDraft<ParteDraft>({
    formType: "parte",
    userId,
    enabled: !editar,
    buildSnapshot: () => {
      // FormData lee igual los campos controlados y los no controlados.
      const valores = leerCamposFormulario(formRef.current, CAMPOS_BORRADOR);
      return valores ? { campos: valores, comp } : null;
    },
    applySnapshot: (s) => {
      // Los no controlados se restauran escribiendo el DOM; los controlados,
      // por estado (React repintaría el DOM y perdería el valor).
      aplicarCamposFormulario(formRef.current, CAMPOS_BORRADOR_DOM, s.campos);
      setCampos((prev) => {
        const siguiente = { ...prev };
        for (const k of CAMPOS_CONTROLADOS) {
          const v = s.campos?.[k];
          if (typeof v === "string") siguiente[k] = v;
        }
        return siguiente;
      });
      // Lo restaurado es del usuario: el prellenado ya no puede pisarlo.
      propuestosRef.current = {};
      const base: ComponentesData = {};
      for (const k of REGISTRO_COMPONENTE_KEYS) {
        const saved = s.comp?.[k];
        base[k] = {
          ingreso: saved?.ingreso ?? "SI",
          salida: saved?.salida ?? "SI",
          obs_i: saved?.obs_i ?? null,
          obs_s: saved?.obs_s ?? null,
        };
      }
      setComp(base);
    },
    // `campos` entra al autosave porque ahora son estados controlados: sin
    // esto, un prellenado sin tecleo posterior no se guardaría en el borrador.
    watch: [comp, campos],
  });

  function setValor(
    key: ComponenteKey,
    campo: "ingreso" | "salida",
    valor: ValorComponente,
  ) {
    setComp((prev) => ({ ...prev, [key]: { ...prev[key], [campo]: valor } }));
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    const g = (k: string) => String(fd.get(k) ?? "");
    const input: RegistroInput = {
      equipo_id: g("equipo_id"),
      operador_id: g("operador_id"),
      fecha: g("fecha"),
      fecha_salida: g("fecha_salida"),
      estado: g("estado"),
      area_uso: g("area_uso"),
      centro_costo: g("centro_costo"),
      tipo_mantencion: g("tipo_mantencion"),
      combustible_fraccion: g("combustible_fraccion"),
      nombre_responsable: g("nombre_responsable"),
      rut_responsable: g("rut_responsable"),
      nombre_receptor: g("nombre_receptor"),
      rut_receptor: g("rut_receptor"),
      horometro: g("horometro"),
      odometro: g("odometro"),
      observaciones: g("observaciones"),
      componentes: comp,
    };
    // beginSubmit/submitFailed: en éxito el action redirige y su promesa no
    // resuelve; el desmontaje del form confirma el éxito y borra el borrador.
    draft.beginSubmit();
    startTransition(async () => {
      try {
        const res = parte ? await updateParte(parte.id, input) : await createParte(input);
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

      {/* Cabecera */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className="block">
          <span className={labelCls}>Equipo <span className="text-[#c6352e]">*</span></span>
          <select
            name="equipo_id"
            required
            value={campos.equipo_id}
            onChange={(e) => onEquipoChange(e.target.value)}
            className={inputCls}
          >
            <option value="" disabled>Seleccionar…</option>
            {equipos.map((e) => (
              <option key={e.id} value={e.id}>{e.codigo} · {e.nombre}</option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className={labelCls}>Responsable <span className="text-[#c6352e]">*</span></span>
          <select
            name="operador_id"
            required
            value={campos.operador_id}
            onChange={(e) => onResponsableChange(e.target.value)}
            className={inputCls}
          >
            <option value="" disabled>Seleccionar…</option>
            {operadores.map((o) => (
              <option key={o.id} value={o.id}>{o.nombre}</option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className={labelCls}>Fecha ingreso <span className="text-[#c6352e]">*</span></span>
          <input name="fecha" type="date" required defaultValue={toUTCDateInput(parte?.fecha) ?? new Date().toISOString().slice(0, 10)} className={inputCls} />
        </label>
        <label className="block">
          <span className={labelCls}>Fecha salida</span>
          <input name="fecha_salida" type="date" defaultValue={toUTCDateInput(parte?.fecha_salida)} className={inputCls} />
        </label>
        <label className="block">
          <span className={labelCls}>Área de uso</span>
          <input
            name="area_uso"
            type="text"
            placeholder="El Abra"
            value={campos.area_uso}
            onChange={(e) => setCampo("area_uso", e.target.value)}
            className={inputCls}
          />
        </label>
        <label className="block">
          <span className={labelCls}>Centro de costo</span>
          <input
            name="centro_costo"
            type="text"
            placeholder="Sitio 2"
            value={campos.centro_costo}
            onChange={(e) => setCampo("centro_costo", e.target.value)}
            className={inputCls}
          />
        </label>
        <label className="block">
          <span className={labelCls}>Tipo de mantención</span>
          <select
            name="tipo_mantencion"
            value={campos.tipo_mantencion}
            onChange={(e) => setCampo("tipo_mantencion", e.target.value)}
            className={inputCls}
          >
            <option value="">—</option>
            {TIPO_MANTENCION_OPCIONES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </label>
        <label className="block">
          <span className={labelCls}>Combustible</span>
          <select name="combustible_fraccion" defaultValue={parte?.combustible_fraccion ?? ""} className={inputCls}>
            <option value="">—</option>
            {COMBUSTIBLE_OPCIONES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </label>
        <label className="block">
          <span className={labelCls}>Horómetro</span>
          <input
            name="horometro"
            type="number"
            min="0"
            step="any"
            value={campos.horometro}
            onChange={(e) => setCampo("horometro", e.target.value)}
            className={inputCls}
          />
          {ultimoDelEquipo?.horometro != null && (
            <span className="mt-1 block text-xs text-gray-500">
              Último registrado: {fmtNum(ultimoDelEquipo.horometro)} h el{" "}
              {diaMesUTC(ultimoDelEquipo.fecha)}
            </span>
          )}
        </label>
        <label className="block">
          <span className={labelCls}>Odómetro</span>
          <input
            name="odometro"
            type="number"
            min="0"
            step="any"
            value={campos.odometro}
            onChange={(e) => setCampo("odometro", e.target.value)}
            className={inputCls}
          />
          {ultimoDelEquipo?.odometro != null && (
            <span className="mt-1 block text-xs text-gray-500">
              Último registrado: {fmtNum(ultimoDelEquipo.odometro)} km el{" "}
              {diaMesUTC(ultimoDelEquipo.fecha)}
            </span>
          )}
        </label>
        <label className="block">
          <span className={labelCls}>Nombre responsable (ingreso)</span>
          <input
            name="nombre_responsable"
            type="text"
            value={campos.nombre_responsable}
            onChange={(e) => setCampo("nombre_responsable", e.target.value)}
            className={inputCls}
          />
        </label>
        <label className="block">
          <span className={labelCls}>RUT responsable</span>
          <input name="rut_responsable" type="text" defaultValue={parte?.rut_responsable ?? undefined} className={inputCls} />
        </label>
        <label className="block">
          <span className={labelCls}>Nombre receptor (salida)</span>
          <input name="nombre_receptor" type="text" defaultValue={parte?.nombre_receptor ?? undefined} className={inputCls} />
        </label>
        <label className="block">
          <span className={labelCls}>RUT receptor</span>
          <input name="rut_receptor" type="text" defaultValue={parte?.rut_receptor ?? undefined} className={inputCls} />
        </label>
        <label className="block">
          <span className={labelCls}>Estado</span>
          <select name="estado" defaultValue={parte?.estado ?? "Pendiente"} className={inputCls}>
            {["Pendiente", "Aprobado", "Rechazado"].map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </label>
      </div>

      {/* Componentes ingreso/salida */}
      <div>
        <p className={labelCls}>Componentes (ingreso / salida)</p>
        <div className="overflow-hidden rounded-lg border border-gray-200">
          <div className="hidden grid-cols-[1fr_auto_auto] gap-2 bg-gray-50 px-4 py-2 text-xs font-semibold uppercase text-gray-500 sm:grid">
            <span>Componente</span>
            <span className="text-center">Ingreso</span>
            <span className="text-center">Salida</span>
          </div>
          <div className="divide-y divide-gray-100">
            {REGISTRO_COMPONENTES.map((item) => {
              const c = comp[item.key]!;
              return (
                <div
                  key={item.key}
                  className="grid grid-cols-1 gap-2 px-4 py-2.5 sm:grid-cols-[1fr_auto_auto] sm:items-center"
                >
                  <span className="text-sm text-[#253158]">{item.label}</span>
                  <div className="flex gap-1 sm:justify-center">
                    <span className="mr-1 text-xs text-gray-400 sm:hidden">Ingr:</span>
                    {VALORES.map((v) => (
                      <button
                        key={v}
                        type="button"
                        onClick={() => setValor(item.key, "ingreso", v)}
                        className={valorBtnCls(c.ingreso === v, v)}
                      >
                        {v}
                      </button>
                    ))}
                  </div>
                  <div className="flex gap-1 sm:justify-center">
                    <span className="mr-1 text-xs text-gray-400 sm:hidden">Sal:</span>
                    {VALORES.map((v) => (
                      <button
                        key={v}
                        type="button"
                        onClick={() => setValor(item.key, "salida", v)}
                        className={valorBtnCls(c.salida === v, v)}
                      >
                        {v}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <label className="block">
        <span className={labelCls}>Observaciones generales</span>
        <textarea name="observaciones" rows={3} defaultValue={parte?.observaciones ?? undefined} className={inputCls} />
      </label>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-[#253158] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#1b2540] disabled:opacity-60"
        >
          {pending ? "Guardando…" : editar ? "Guardar cambios" : "Crear registro"}
        </button>
        <Link
          href={parte ? `/operacion/partes-diarios/${parte.id}` : "/operacion/partes-diarios"}
          className="text-sm font-medium text-gray-500 hover:text-[#253158]"
        >
          Cancelar
        </Link>
      </div>
    </form>
  );
}
