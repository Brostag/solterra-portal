"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import dynamic from "next/dynamic";
import {
  AlertCircle,
  Camera,
  CheckCircle2,
  ImagePlus,
  Loader2,
  MessageSquarePlus,
  Send,
  Trash2,
  X,
} from "lucide-react";
import { moduleForPath } from "@/lib/modules";

// El anotador solo se descarga cuando el usuario toma una captura: no entra en
// el bundle inicial del portal (mismo criterio que driver.js en AppTour).
const AnotadorCaptura = dynamic(
  () => import("@/components/portal/feedback/AnotadorCaptura"),
  { ssr: false },
);

type TipoFeedback = "Problema" | "Sugerencia" | "Consulta";

/** form = panel visible · capturando = panel oculto para no salir en la foto ·
 *  anotando = editor de la captura sobre la pantalla. */
type Modo = "form" | "capturando" | "anotando";

type Adjunto = {
  id: string;
  file: File;
  preview: string;
  esCaptura: boolean;
};

type Enviado = { correlativo?: number; anio?: number };

type RespuestaFeedback = {
  id?: string;
  correlativo?: number;
  anio?: number;
  error?: string;
};

const TIPOS: readonly TipoFeedback[] = ["Problema", "Sugerencia", "Consulta"] as const;

// Mismo set que acepta la validación por magic bytes del servidor.
const MIMES_PERMITIDOS = new Set(["image/png", "image/jpeg", "image/webp"]);
const EXT_POR_MIME: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
};

const MAX_ADJUNTOS = 3;
// Debe coincidir con MAX_SIZE_ARCHIVO de src/app/api/feedback/route.ts: si el
// panel acepta más de lo que valida el servidor, la imagen se previsualiza y
// después el envío falla contradiciendo lo que el propio panel prometió.
const MAX_ARCHIVO = 3 * 1024 * 1024;
// El límite de cuerpo de una función serverless ronda los 4,5 MB: el total de
// adjuntos se mantiene por debajo para que el envío no muera en producción.
const MAX_TOTAL = 4 * 1024 * 1024;
const MAX_MENSAJE = 2000;

const MB = 1024 * 1024;

/** Deja que el navegador repinte tras ocultar el panel, antes de capturar. */
function esperarRepintado(): Promise<void> {
  return new Promise((resolve) => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => setTimeout(resolve, 120));
    });
  });
}

interface FeedbackPanelProps {
  open: boolean;
  onClose: () => void;
  pathname: string;
}

export default function FeedbackPanel({ open, onClose, pathname }: FeedbackPanelProps) {
  const [tipo, setTipo] = useState<TipoFeedback>("Problema");
  const [mensaje, setMensaje] = useState("");
  const [adjuntos, setAdjuntos] = useState<Adjunto[]>([]);
  const [errores, setErrores] = useState<string[]>([]);
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState<Enviado | null>(null);
  const [modo, setModo] = useState<Modo>("form");
  const [capturaCruda, setCapturaCruda] = useState<Blob | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLElement>(null);
  const origenFocoRef = useRef<HTMLElement | null>(null);
  const idRef = useRef(0);

  // crypto.randomUUID() no existe fuera de contexto seguro (el portal se prueba
  // por IP en http desde el celular): contador local, suficiente para keys.
  function nuevoId(): string {
    idRef.current += 1;
    return `adj-${idRef.current}`;
  }

  // Espejo de los adjuntos para poder liberar los object URLs al desmontar.
  const adjuntosRef = useRef<Adjunto[]>([]);
  useEffect(() => {
    adjuntosRef.current = adjuntos;
  }, [adjuntos]);
  useEffect(() => {
    return () => {
      for (const a of adjuntosRef.current) URL.revokeObjectURL(a.preview);
    };
  }, []);

  // Cerrar con Escape. Mientras se captura o se anota, la tecla la maneja el
  // anotador: cerrar el panel entero ahí perdería el trabajo del usuario.
  useEffect(() => {
    if (!open || modo !== "form") return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !enviando) onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, modo, enviando, onClose]);

  // Bloquear scroll del body mientras el panel está abierto (igual que HelpPanel).
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  // Al cerrar, el foco vuelve al control que abrió el panel: con teclado, si no
  // se devuelve, el recorrido reinicia desde el principio del documento.
  // Va antes del efecto que enfoca el diálogo para leer el activeElement real.
  useEffect(() => {
    if (!open) return;
    origenFocoRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    return () => {
      const origen = origenFocoRef.current;
      origenFocoRef.current = null;
      if (origen && document.contains(origen)) origen.focus();
    };
  }, [open]);

  // Al abrir, el foco entra al diálogo para que el teclado no quede detrás.
  useEffect(() => {
    if (open && modo === "form") panelRef.current?.focus();
  }, [open, modo]);

  // Al reabrir el panel se parte del formulario, no de la confirmación anterior.
  // Lo escrito y los adjuntos sí se conservan mientras no se envíe.
  useEffect(() => {
    if (open) setEnviado(null);
  }, [open]);

  function limpiarAdjuntos(lista: Adjunto[]) {
    for (const a of lista) URL.revokeObjectURL(a.preview);
  }

  function quitarAdjunto(id: string) {
    const objetivo = adjuntos.find((a) => a.id === id);
    if (objetivo) URL.revokeObjectURL(objetivo.preview);
    setAdjuntos(adjuntos.filter((a) => a.id !== id));
  }

  function agregarArchivos(files: FileList | null) {
    if (!files || files.length === 0) return;
    const errs: string[] = [];
    const nuevos: Adjunto[] = [];
    let disponibles = MAX_ADJUNTOS - adjuntos.length;

    for (const file of Array.from(files)) {
      if (disponibles <= 0) {
        errs.push(`Puedes adjuntar hasta ${MAX_ADJUNTOS} imágenes.`);
        break;
      }
      if (!MIMES_PERMITIDOS.has(file.type)) {
        errs.push(`${file.name}: solo se aceptan imágenes JPG, PNG o WEBP.`);
        continue;
      }
      if (file.size > MAX_ARCHIVO) {
        errs.push(`${file.name}: supera el límite de ${MAX_ARCHIVO / MB} MB.`);
        continue;
      }
      nuevos.push({
        id: nuevoId(),
        file,
        preview: URL.createObjectURL(file),
        esCaptura: false,
      });
      disponibles -= 1;
    }

    if (nuevos.length > 0) setAdjuntos([...adjuntos, ...nuevos]);
    setErrores(errs);
  }

  async function handleCapturar() {
    setErrores([]);
    setModo("capturando");
    // El panel deja de renderizarse: hay que esperar el repintado real antes
    // de disparar la captura, si no sale el propio panel tapando el problema.
    await esperarRepintado();
    try {
      const { capturarPantalla } = await import("@/lib/feedback/captura");
      const resultado = await capturarPantalla();
      if (!resultado.ok) {
        setModo("form");
        setErrores([resultado.motivo]);
        return;
      }
      setCapturaCruda(resultado.blob);
      setModo("anotando");
    } catch {
      setModo("form");
      setErrores([
        "No se pudo capturar la pantalla. Puedes adjuntar una imagen desde tu dispositivo.",
      ]);
    }
  }

  function handleAnotadorCancelar() {
    setCapturaCruda(null);
    setModo("form");
  }

  function handleAnotadorListo(blob: Blob) {
    setCapturaCruda(null);
    setModo("form");

    // El anotador exporta WebP o JPEG. No se inventa un MIME de respaldo: uno
    // falso pasaría este filtro y moriría después en la verificación por magic
    // bytes del servidor, con un error que no dice nada al usuario.
    const mime = blob.type;
    if (!MIMES_PERMITIDOS.has(mime)) {
      setErrores(["La captura quedó en un formato no admitido. Intenta de nuevo."]);
      return;
    }
    if (blob.size > MAX_ARCHIVO) {
      setErrores([
        `La captura pesa más de ${MAX_ARCHIVO / MB} MB. Vuelve a tomarla con menos detalle.`,
      ]);
      return;
    }

    // Una sola captura por reporte: la nueva reemplaza la anterior.
    const previas = adjuntos.filter((a) => a.esCaptura);
    const restantes = adjuntos.filter((a) => !a.esCaptura);
    if (restantes.length >= MAX_ADJUNTOS) {
      setErrores([
        `Ya tienes ${MAX_ADJUNTOS} adjuntos. Quita uno antes de agregar la captura.`,
      ]);
      return;
    }
    limpiarAdjuntos(previas);

    const file = new File([blob], `captura-${Date.now()}.${EXT_POR_MIME[mime]}`, {
      type: mime,
    });
    setAdjuntos([
      ...restantes,
      { id: nuevoId(), file, preview: URL.createObjectURL(file), esCaptura: true },
    ]);
    setErrores([]);
  }

  function reiniciarFormulario() {
    limpiarAdjuntos(adjuntos);
    setAdjuntos([]);
    setMensaje("");
    setTipo("Problema");
    setErrores([]);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (enviando) return;

    const texto = mensaje.trim();
    const errs: string[] = [];
    if (!texto) errs.push("Escribe un mensaje describiendo lo que quieres reportar.");
    if (texto.length > MAX_MENSAJE)
      errs.push(`El mensaje no puede superar los ${MAX_MENSAJE} caracteres.`);

    const total = adjuntos.reduce((suma, a) => suma + a.file.size, 0);
    if (total > MAX_TOTAL)
      errs.push(
        `Los adjuntos suman más de ${MAX_TOTAL / MB} MB. Quita alguno antes de enviar.`,
      );

    if (errs.length > 0) {
      setErrores(errs);
      return;
    }

    setErrores([]);
    setEnviando(true);
    try {
      const fd = new FormData();
      fd.append("tipo", tipo);
      fd.append("mensaje", texto);
      fd.append("ruta", `${window.location.pathname}${window.location.search}`);
      fd.append("modulo", moduleForPath(pathname));
      fd.append("viewport", `${window.innerWidth}x${window.innerHeight}`);
      for (const a of adjuntos) fd.append("adjuntos", a.file, a.file.name);
      const indiceCaptura = adjuntos.findIndex((a) => a.esCaptura);
      if (indiceCaptura >= 0) fd.append("captura_index", String(indiceCaptura));

      const res = await fetch("/api/feedback", { method: "POST", body: fd });
      const data = (await res.json().catch(() => null)) as RespuestaFeedback | null;

      if (!res.ok) {
        setErrores([
          typeof data?.error === "string" && data.error
            ? data.error
            : "No se pudo enviar el reporte. Intenta de nuevo en unos segundos.",
        ]);
        return;
      }

      reiniciarFormulario();
      setEnviado({ correlativo: data?.correlativo, anio: data?.anio });
    } catch {
      setErrores([
        "No se pudo conectar con el servidor. Revisa tu conexión e intenta de nuevo.",
      ]);
    } finally {
      setEnviando(false);
    }
  }

  if (!open) return null;

  // Durante la captura el formulario no se renderiza (queda montado, así no se
  // pierde lo escrito) para que no aparezca en la imagen. En su lugar va un
  // aviso que bloquea la interacción: el re-render puede tardar (hay un corte a
  // los 20 s) y sin esto la persona cree que no pasó nada, sigue navegando y
  // después le aparece el anotador encima.
  // Lleva data-feedback-ui para que snapdom lo excluya, igual que el resto de
  // la interfaz de comentarios: si no, saldría en la propia captura.
  if (modo === "capturando") {
    return createPortal(
      <div
        role="status"
        aria-live="polite"
        data-feedback-ui="capturando"
        className="fixed inset-0 z-[210] flex items-center justify-center bg-slate-900/40"
      >
        <div className="flex items-center gap-2.5 rounded-lg border border-gray-200 bg-white px-4 py-3 shadow-xl">
          <Loader2 className="h-4 w-4 flex-shrink-0 animate-spin text-[#253158]" />
          <p className="text-sm font-medium text-gray-700">Tomando la captura…</p>
        </div>
      </div>,
      document.body,
    );
  }

  // El anotador monta su propio overlay a pantalla completa (createPortal a
  // document.body) y marca su raíz con data-feedback-ui: se renderiza tal cual.
  if (modo === "anotando" && capturaCruda) {
    return (
      <AnotadorCaptura
        imagen={capturaCruda}
        onListo={handleAnotadorListo}
        onCancelar={handleAnotadorCancelar}
      />
    );
  }

  const restantesMensaje = MAX_MENSAJE - mensaje.length;

  return createPortal(
    <>
      {/* Overlay sólido sobre toda la app */}
      <div
        aria-hidden="true"
        data-feedback-ui="overlay"
        className="fixed inset-0 z-[200] bg-slate-900/40 animate-in fade-in duration-150"
        onClick={() => {
          if (!enviando) onClose();
        }}
      />

      {/* Panel lateral — mismo patrón que el panel de ayuda */}
      <aside
        ref={panelRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label="Enviar comentario"
        data-feedback-ui="panel"
        className="fixed inset-y-0 right-0 z-[201] flex flex-col w-full sm:w-[420px] bg-white shadow-2xl border-l border-gray-200 outline-none animate-in slide-in-from-right duration-200"
      >
        <div className="h-1 w-full bg-[#253158] flex-shrink-0" />

        {/* Cabecera */}
        <div className="flex items-start gap-3 px-5 pt-4 pb-4 border-b border-gray-100 flex-shrink-0">
          <div className="h-8 w-8 rounded-lg bg-[#253158]/10 flex items-center justify-center flex-shrink-0 mt-0.5">
            <MessageSquarePlus className="h-4 w-4 text-[#253158]" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-base font-semibold text-[#253158] leading-tight">
              Enviar comentario
            </h2>
            <p className="text-sm text-gray-500 leading-snug mt-0.5">
              Cuéntanos qué falla o qué te gustaría mejorar. Llega directo al equipo técnico.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={enviando}
            aria-label="Cerrar panel de comentarios"
            className="flex-shrink-0 h-8 w-8 flex items-center justify-center rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors disabled:opacity-40"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {enviado ? (
          <div className="flex flex-col items-center justify-center flex-1 text-center px-6 py-16">
            <div className="h-12 w-12 rounded-xl bg-emerald-50 flex items-center justify-center mb-3">
              <CheckCircle2 className="h-6 w-6 text-emerald-600" />
            </div>
            <p className="text-sm font-semibold text-gray-700 mb-1">Comentario enviado</p>
            <p className="text-xs text-gray-500 leading-relaxed max-w-[280px]">
              {enviado.correlativo && enviado.anio
                ? `Quedó registrado con el N° ${enviado.correlativo}/${enviado.anio}. El equipo técnico lo revisará.`
                : "Quedó registrado. El equipo técnico lo revisará."}
            </p>
            <div className="flex items-center gap-2 mt-6">
              <button
                type="button"
                onClick={() => setEnviado(null)}
                className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-[#253158] transition-colors hover:border-[#253158] hover:bg-[#253158]/5"
              >
                Enviar otro
              </button>
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg bg-[#253158] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#1e305e]"
              >
                Cerrar
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
            <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5">
              {/* Tipo */}
              <section>
                <h3 className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-2">
                  Tipo
                </h3>
                <div className="grid grid-cols-3 gap-1 rounded-lg bg-gray-100 p-1">
                  {TIPOS.map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setTipo(t)}
                      aria-pressed={tipo === t}
                      className={`rounded-md px-2 py-1.5 text-xs font-semibold transition-colors ${
                        tipo === t
                          ? "bg-white text-[#253158] shadow-sm"
                          : "text-gray-500 hover:text-gray-700"
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </section>

              {/* Mensaje */}
              <section>
                <label
                  htmlFor="feedback-mensaje"
                  className="block text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-2"
                >
                  Mensaje
                </label>
                <textarea
                  id="feedback-mensaje"
                  value={mensaje}
                  onChange={(e) => setMensaje(e.target.value)}
                  maxLength={MAX_MENSAJE}
                  rows={5}
                  required
                  placeholder="Describe qué pasó, en qué pantalla y qué esperabas que ocurriera."
                  className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-gray-700 placeholder:text-gray-400 focus:border-[#253158] focus:outline-none focus:ring-1 focus:ring-[#253158] resize-y"
                />
                <p className="mt-1 text-right text-[11px] text-gray-400">
                  {restantesMensaje} caracteres disponibles
                </p>
              </section>

              {/* Adjuntos */}
              <section>
                <h3 className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-2">
                  Imágenes (opcional)
                </h3>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={handleCapturar}
                    disabled={enviando || adjuntos.length >= MAX_ADJUNTOS}
                    className="flex items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-xs font-semibold text-[#253158] transition-colors hover:border-[#253158] hover:bg-[#253158]/5 disabled:opacity-40 disabled:hover:border-gray-200 disabled:hover:bg-white"
                  >
                    <Camera className="h-4 w-4 flex-shrink-0" />
                    Capturar pantalla
                  </button>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={enviando || adjuntos.length >= MAX_ADJUNTOS}
                    className="flex items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-xs font-semibold text-[#253158] transition-colors hover:border-[#253158] hover:bg-[#253158]/5 disabled:opacity-40 disabled:hover:border-gray-200 disabled:hover:bg-white"
                  >
                    <ImagePlus className="h-4 w-4 flex-shrink-0" />
                    Adjuntar imagen
                  </button>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  multiple
                  className="hidden"
                  onChange={(e) => {
                    agregarArchivos(e.target.files);
                    e.target.value = "";
                  }}
                />
                <p className="mt-2 text-[11px] text-gray-400 leading-relaxed">
                  Hasta {MAX_ADJUNTOS} imágenes JPG, PNG o WEBP, {MAX_ARCHIVO / MB} MB cada
                  una. La captura toma lo que se ve en pantalla: revisa que no queden datos
                  que no quieras compartir.
                </p>

                {adjuntos.length > 0 && (
                  <ul className="mt-3 grid grid-cols-3 gap-2">
                    {adjuntos.map((a) => (
                      <li
                        key={a.id}
                        className="relative rounded-lg border border-gray-200 overflow-hidden bg-gray-50"
                      >
                        {/* Blob local: <img> nativo, igual que el resto de las
                            previews del portal (next.config images.unoptimized). */}
                        <img
                          src={a.preview}
                          alt={a.esCaptura ? "Captura de pantalla" : a.file.name}
                          className="h-20 w-full object-cover"
                        />
                        {a.esCaptura && (
                          <span className="absolute left-1 top-1 rounded bg-[#253158] px-1.5 py-0.5 text-[9px] font-semibold text-white">
                            Captura
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={() => quitarAdjunto(a.id)}
                          disabled={enviando}
                          aria-label={`Quitar ${a.esCaptura ? "la captura" : a.file.name}`}
                          className="absolute right-1 top-1 h-6 w-6 flex items-center justify-center rounded bg-white/90 text-[#c6352e] shadow-sm transition-colors hover:bg-white disabled:opacity-40"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              {/* El envío incluye metadatos de diagnóstico además del mensaje:
                  se declara para que la persona sepa qué está mandando. */}
              <p className="text-[11px] text-gray-400 leading-relaxed">
                Junto con tu mensaje se envían tu nombre, la dirección de la página en que
                estás, el módulo, el tamaño de pantalla y el navegador que usas. Sirven para
                reproducir el problema.
              </p>

              {errores.length > 0 && (
                <div
                  role="alert"
                  className="rounded-lg border border-red-200 bg-red-50 px-3 py-2.5"
                >
                  <div className="flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 flex-shrink-0 text-[#c6352e] mt-0.5" />
                    <ul className="space-y-1 text-xs text-[#c6352e] leading-relaxed">
                      {errores.map((err) => (
                        <li key={err}>{err}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </div>

            {/* Footer fijo. El padding inferior respeta el área segura de iOS:
                sin esto el botón queda bajo la barra de gestos del iPhone
                (mismo criterio que la barra de herramientas del anotador). */}
            <div
              className="flex-shrink-0 border-t border-gray-100 px-5 pt-3.5"
              style={{ paddingBottom: "max(0.875rem, env(safe-area-inset-bottom))" }}
            >
              <button
                type="submit"
                disabled={enviando || mensaje.trim().length === 0}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#253158] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#1e305e] disabled:opacity-50 disabled:hover:bg-[#253158]"
              >
                {enviando ? (
                  <>
                    <Loader2 className="h-4 w-4 flex-shrink-0 animate-spin" />
                    Enviando…
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 flex-shrink-0" />
                    Enviar comentario
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </aside>
    </>,
    document.body,
  );
}
