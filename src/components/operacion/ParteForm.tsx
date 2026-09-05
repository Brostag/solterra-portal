"use client";

import { useRef, useState, useTransition } from "react";
import Link from "next/link";
import { unstable_rethrow, useRouter } from "next/navigation";
import {
  createParte,
  updateParte,
  type RegistroInput,
} from "@/app/(operativo)/mantencion/ordenes-trabajo/actions";
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
import type { Rol } from "@/types";
import { inputCls, labelCls, valorBtnCls } from "@/lib/terreno/form-styles";
import { fmtNum, toUTCDateInput } from "@/lib/terreno/format";
import { esHeic, reducirImagen, MAX_SIZE_ARCHIVO } from "@/lib/terreno/imagen";
import { subirFoto, type GrupoFoto } from "@/lib/terreno/fotos";
import { useDraft } from "@/lib/terreno/use-draft";
import {
  aplicarCamposFormulario,
  leerCamposFormulario,
} from "@/lib/terreno/draft-form-fields";
import DraftBanner from "@/components/terreno/DraftBanner";
import FotosPendientes from "@/components/operacion/FotosPendientes";

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
      // Al crear, la salida se registra después (paso aparte, ver
      // SalidaForm): sin `parte` no hay que proponer "SI" por defecto, o
      // quedaría un valor falso en un equipo que aún no ha salido del taller.
      salida: parte ? (saved?.salida ?? "SI") : null,
      obs_i: saved?.obs_i ?? null,
      obs_s: saved?.obs_s ?? null,
    };
  }
  return base;
}

function construirInput(fd: FormData, componentes: ComponentesData): RegistroInput {
  const g = (k: string) => String(fd.get(k) ?? "");
  return {
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
    componentes,
  };
}

/**
 * Deja una foto lista para el endpoint (JPG/PNG/WEBP bajo el tope por
 * archivo), o null si no hay forma de dejarla dentro del límite.
 *
 * Solo reduce cuando hace falta: si la foto ya viene optimizada desde el
 * selector, recomprimirla otra vez solo perdería calidad sin ganar nada.
 */
async function prepararFoto(archivo: File): Promise<File | null> {
  if (archivo.size <= MAX_SIZE_ARCHIVO && !esHeic(archivo)) return archivo;
  const reducida = await reducirImagen(archivo);
  // reducirImagen devuelve el original si el navegador no pudo convertirlo:
  // un HEIC de iPhone así el servidor lo rechazaría igual.
  if (esHeic(reducida) || reducida.size > MAX_SIZE_ARCHIVO) return null;
  return reducida;
}

export default function ParteForm({
  equipos,
  operadores,
  parte,
  userId,
  rol,
  ultimosRegistros,
}: {
  equipos: EquipoOption[];
  operadores: ResponsableOption[];
  parte?: ParteDetalle;
  userId: string;
  /**
   * Rol de la sesión. Opcional y NUEVO: la página de editar no lo pasa (el
   * formulario sigue funcionando igual sin él). Solo se usa al crear, para
   * avisar si el responsable elegido no podrá recibir las fotos.
   */
  rol?: Rol;
  /**
   * Último registro de cada equipo, indexado por equipo_id. Solo se pasa al
   * crear: en modo editar no se prellena nada.
   */
  ultimosRegistros?: UltimosRegistrosPorEquipo;
}) {
  const editar = Boolean(parte);
  // Los campos de salida (fecha, receptor, columna "Salida" de componentes)
  // solo tienen sentido si el registro ya existe: al ingresar el equipo
  // todavía no se conocen, y se completan después desde la orden de trabajo.
  const mostrarSalida = editar;
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  // true justo antes de router.push tras crear: el componente se desmonta al
  // navegar, así que nunca vuelve a false por su cuenta. Sin esto, en cuanto
  // termina la subida de fotos `pending` cae a false (la promesa que envolvía
  // el push ya resolvió) y el botón se reactiva mostrando "Crear registro"
  // mientras el RSC del detalle todavía viaja — con mala señal, tiempo de
  // sobra para un doble tap que crea la orden dos veces.
  const [navegando, setNavegando] = useState(false);
  const [comp, setComp] = useState<ComponentesData>(() => initComponentes(parte));
  const formRef = useRef<HTMLFormElement>(null);

  // Fotos elegidas ANTES de que el registro exista. El endpoint las cuelga de
  // un registro ya creado, así que acá solo se acumulan en memoria y se suben
  // apenas createParte devuelve el id. Deliberadamente fuera del borrador
  // offline: un File no se serializa a IndexedDB (ver CAMPOS_BORRADOR).
  const [fotosEntrada, setFotosEntrada] = useState<File[]>([]);
  // Progreso del lote de fotos (null = sin subida en curso), para que el botón
  // diga "Subiendo fotos 2 de 3…" en vez de un "Guardando…" ciego.
  const [progreso, setProgreso] = useState<{ actual: number; total: number } | null>(null);

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

  // El endpoint de fotos exige ser el responsable del registro o
  // ADMINISTRADOR/SUPERVISOR (ver /api/operacion/registro/[id]/fotos). Un
  // USUARIO que deje a otra persona como responsable recibe 403 en cada
  // foto sin enterarse hasta el detalle: se avisa acá, apenas elige, en vez
  // de recién al fallar la subida.
  const responsableAjenoSinFotos =
    !editar &&
    rol === "USUARIO" &&
    campos.operador_id !== "" &&
    campos.operador_id !== userId;

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
          // Los borradores solo existen en modo crear (enabled: !editar): la
          // salida nunca se pide acá, igual que en initComponentes.
          salida: null,
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

  /**
   * Sube las fotos pendientes al registro recién creado. NUNCA lanza ni corta
   * la navegación: cuando esto corre, la orden de trabajo YA quedó guardada, y
   * perder ese trabajo por una foto que no subió sería mucho peor que quedarse
   * sin la foto. Lo que falle se reintenta después desde la galería del detalle.
   *
   * Devuelve cuántas fotos NO quedaron guardadas (sin poder reducirla bajo el
   * límite, HTTP no-ok, o error de red) para que quien llama pueda avisarlo
   * en la página siguiente — antes se perdían en silencio.
   */
  async function subirFotosPendientes(registroId: string): Promise<number> {
    const lote: { grupo: GrupoFoto; archivo: File }[] = [
      ...fotosEntrada.map((archivo) => ({ grupo: "entrada" as const, archivo })),
    ];
    if (lote.length === 0) return 0;

    let fallidas = 0;
    try {
      for (let i = 0; i < lote.length; i++) {
        setProgreso({ actual: i + 1, total: lote.length });
        try {
          const listo = await prepararFoto(lote[i].archivo);
          if (!listo) {
            fallidas++; // no hay forma de dejarla dentro del límite
            continue;
          }
          // Una foto por request y en serie, nunca Promise.all: una función
          // serverless de Vercel rechaza el body sobre ~4,5 MB, y el servidor
          // valida el tope de 6 por grupo contra lo ya guardado (en paralelo,
          // dos requests podrían pasarse antes de que la primera lo impacte).
          // subirFoto ya reintenta una vez por su cuenta ante un 500
          // transitorio de Storage; lo que siga fallando después de eso
          // (incluido un 403 si el responsable elegido no es quien sube ni un
          // supervisor) queda contado acá. Se navega al detalle pase lo que
          // pase — la galería del detalle muestra igual las fotos que sí
          // quedaron guardadas, para reintentar el resto.
          const error = await subirFoto(registroId, lote[i].grupo, listo);
          if (error) fallidas++;
        } catch {
          // Una foto que falla no detiene a las demás ni impide navegar.
          fallidas++;
        }
      }
    } finally {
      setProgreso(null);
    }
    return fallidas;
  }

  async function enviarEdicion(id: string, input: RegistroInput) {
    // updateParte sigue redirigiendo desde el servidor: en éxito su promesa no
    // resuelve (Next 15) y estas líneas solo corren cuando hubo error.
    const res = await updateParte(id, input);
    if (res?.error) {
      setError(res.error);
      draft.submitFailed();
    }
  }

  async function enviarCreacion(input: RegistroInput) {
    const res = await createParte(input);
    if ("error" in res) {
      setError(res.error);
      draft.submitFailed();
      return;
    }
    // La orden ya quedó guardada en la base de datos: el borrador se borra
    // AHORA, antes de subir fotos. Antes se borraba recién al desmontar el
    // formulario — con el redirect() del servidor esa ventana era ~1s, pero
    // ahora es toda la subida (varios segundos con mala señal). Si el celular
    // se bloquea o el sistema mata la pestaña en ese rato, el cleanup nunca
    // corre y el borrador quedaba vivo, ofreciendo crear la misma orden de
    // nuevo al volver a /nuevo.
    draft.submitSucceeded();
    // Pase lo que pase con las fotos se navega al detalle: dejar a la persona
    // en el formulario le haría creer que tiene que llenarlo de nuevo y
    // terminaría duplicando el registro. El `.catch` es blindaje extra por si
    // el subidor fallara de una forma no prevista (fallidas=0 en ese caso: lo
    // esperable ya queda contado dentro de subirFotosPendientes).
    const fallidas = await subirFotosPendientes(res.id).catch(() => 0);
    // El formulario no se desmonta en este punto, sino cuando cambie la ruta:
    // `navegando` bloquea el botón mientras el RSC del detalle todavía viaja
    // (sesión + Prisma + 3 getSignedUrls), evitando el doble submit.
    setNavegando(true);
    router.push(
      `/mantencion/ordenes-trabajo/${res.id}${fallidas ? `?fotos=${fallidas}` : ""}`,
    );
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const input = construirInput(new FormData(e.currentTarget), comp);
    // beginSubmit/submitFailed: el desmontaje del form durante un submit sin
    // error confirma el éxito y borra el borrador — vale igual para el
    // redirect del servidor (editar) y para el router.push del cliente (crear).
    draft.beginSubmit();
    startTransition(async () => {
      try {
        if (parte) {
          await enviarEdicion(parte.id, input);
          return;
        }
        await enviarCreacion(input);
      } catch (e) {
        // Sigue siendo necesario: updateParte redirige desde el servidor, y
        // ambas actions redirigen a /login si se cayó la sesión.
        unstable_rethrow(e); // NEXT_REDIRECT sigue su curso
        // Falla de red: el borrador se conserva y el autosave sigue activo.
        setError("No se pudo enviar. Revisa tu conexión e intenta nuevamente.");
        draft.submitFailed();
      }
    });
  }

  function etiquetaBoton(): string {
    // Se revisa primero: una vez que se llamó a router.push ya no importa si
    // `pending` alcanzó a caer a false, la orden ya existe y solo falta que
    // cargue el detalle.
    if (navegando) return "Abriendo la orden…";
    if (!pending) return editar ? "Guardar cambios" : "Crear registro";
    if (progreso) return `Subiendo fotos ${progreso.actual} de ${progreso.total}…`;
    return "Guardando…";
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
        {mostrarSalida && (
          <label className="block">
            <span className={labelCls}>Fecha salida</span>
            <input name="fecha_salida" type="date" defaultValue={toUTCDateInput(parte?.fecha_salida)} className={inputCls} />
          </label>
        )}
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
        {mostrarSalida && (
          <label className="block">
            <span className={labelCls}>Nombre receptor (salida)</span>
            <input name="nombre_receptor" type="text" defaultValue={parte?.nombre_receptor ?? undefined} className={inputCls} />
          </label>
        )}
        {mostrarSalida && (
          <label className="block">
            <span className={labelCls}>RUT receptor</span>
            <input name="rut_receptor" type="text" defaultValue={parte?.rut_receptor ?? undefined} className={inputCls} />
          </label>
        )}
        <label className="block">
          <span className={labelCls}>Estado</span>
          <select name="estado" defaultValue={parte?.estado ?? "Pendiente"} className={inputCls}>
            {["Pendiente", "Aprobado", "Rechazado"].map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </label>
      </div>

      {/* Componentes ingreso/salida */}
      <div>
        <p className={labelCls}>
          {mostrarSalida ? "Componentes (ingreso / salida)" : "Componentes (ingreso)"}
        </p>
        <div className="overflow-hidden rounded-lg border border-gray-200">
          <div
            className={
              "hidden gap-2 bg-gray-50 px-4 py-2 text-xs font-semibold uppercase text-gray-500 sm:grid " +
              (mostrarSalida ? "grid-cols-[1fr_auto_auto]" : "grid-cols-[1fr_auto]")
            }
          >
            <span>Componente</span>
            <span className="text-center">Ingreso</span>
            {mostrarSalida && <span className="text-center">Salida</span>}
          </div>
          <div className="divide-y divide-gray-100">
            {REGISTRO_COMPONENTES.map((item) => {
              const c = comp[item.key]!;
              return (
                <div
                  key={item.key}
                  className={
                    "grid grid-cols-1 gap-2 px-4 py-2.5 sm:items-center " +
                    (mostrarSalida ? "sm:grid-cols-[1fr_auto_auto]" : "sm:grid-cols-[1fr_auto]")
                  }
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
                  {mostrarSalida && (
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
                  )}
                </div>
              );
            })}
          </div>
        </div>
        {!mostrarSalida && (
          <p className="mt-2 text-xs text-gray-500">
            La salida del equipo se registra después, desde la orden de trabajo.
          </p>
        )}
      </div>

      {/* Fotos del ingreso. Solo al crear: en modo editar las fotos se
          gestionan desde el detalle (FotosRegistro), contra un registro que ya
          existe y que permite borrarlas una por una. */}
      {!editar && (
        <>
          {/* Cómo llega el equipo al taller. Antes existía un segundo grupo
              "Fotos del tablero": se quitó de la interfaz por pedido del
              cliente (confundía), ver detalle para más contexto. */}
          <FotosPendientes
            titulo="Fotos de entrada"
            archivos={fotosEntrada}
            onChange={setFotosEntrada}
            disabled={pending || navegando}
          />
          {responsableAjenoSinFotos && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
              <p className="text-sm text-amber-700">
                Como el responsable es otra persona, no vas a poder adjuntar las
                fotos a esta orden. Pídele a un supervisor que las suba, o
                déjate como responsable.
              </p>
            </div>
          )}
        </>
      )}

      <label className="block">
        <span className={labelCls}>Observaciones generales</span>
        <textarea name="observaciones" rows={3} defaultValue={parte?.observaciones ?? undefined} className={inputCls} />
      </label>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pending || navegando}
          className="rounded-lg bg-[#253158] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#1b2540] disabled:opacity-60"
        >
          {etiquetaBoton()}
        </button>
        <Link
          href={parte ? `/mantencion/ordenes-trabajo/${parte.id}` : "/mantencion/ordenes-trabajo"}
          className="text-sm font-medium text-gray-500 hover:text-[#253158]"
        >
          Cancelar
        </Link>
      </div>
    </form>
  );
}
