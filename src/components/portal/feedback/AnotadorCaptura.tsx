"use client";

import {
  AlertTriangle,
  ArrowUpRight,
  Check,
  EyeOff,
  Highlighter,
  Loader2,
  Pencil,
  Square,
  Trash2,
  Undo2,
  X,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

// Editor de anotación sobre la captura de pantalla. Dibuja a mano sobre <canvas>,
// sin librerías externas. Los trazos viven en estado y el canvas se redibuja
// completo en cada cambio (imagen de fondo + trazos), así deshacer es sacar el
// último elemento del arreglo.

export type AnotadorCapturaProps = {
  imagen: Blob;
  onListo: (blob: Blob) => void;
  onCancelar: () => void;
};

type Herramienta = "flecha" | "rectangulo" | "libre" | "resaltado" | "ocultar";

type Punto = { x: number; y: number };

type Trazo =
  | { tipo: "flecha"; color: string; grosor: number; desde: Punto; hasta: Punto }
  | { tipo: "rectangulo"; color: string; grosor: number; desde: Punto; hasta: Punto }
  | { tipo: "libre"; color: string; grosor: number; puntos: Punto[] }
  | { tipo: "resaltado"; desde: Punto; hasta: Punto }
  | { tipo: "ocultar"; desde: Punto; hasta: Punto };

const HERRAMIENTAS = [
  { id: "flecha", nombre: "Flecha", Icono: ArrowUpRight },
  { id: "rectangulo", nombre: "Recuadro", Icono: Square },
  { id: "libre", nombre: "Trazo libre", Icono: Pencil },
  { id: "resaltado", nombre: "Resaltar", Icono: Highlighter },
  { id: "ocultar", nombre: "Ocultar dato", Icono: EyeOff },
] as const satisfies ReadonlyArray<{
  id: Herramienta;
  nombre: string;
  Icono: typeof ArrowUpRight;
}>;

// Herramientas con color fijo: en vez de la fila de colores se explica por qué.
const PISTA_SIN_COLOR: Partial<Record<Herramienta, string>> = {
  resaltado: "El resaltado usa siempre amarillo.",
  ocultar: "Tapa el área con un bloque sólido para que no se lea.",
};

// Paleta acotada: identidad Solterra + dos neutros de apoyo ya usados en el proyecto.
const COLORES = [
  { valor: "#c6352e", nombre: "rojo" },
  { valor: "#253158", nombre: "azul" },
  { valor: "#16a34a", nombre: "verde" },
  { valor: "#111827", nombre: "negro" },
] as const;

const AMARILLO_RESALTADO = "rgba(250, 204, 21, 0.38)";

// Ocultar tapa de verdad: relleno 100% opaco, sin alfa. Es el mismo neutro de la
// paleta de arriba, para no sumar colores al editor.
const COLOR_OCULTAR = "#111827";

// El grosor se calcula desde el lado corto de la IMAGEN, no en píxeles de pantalla:
// una captura de celular (≈780 px) y una de escritorio (≈1440 px) deben verse igual.
const DIVISOR_GROSOR = 170;
const GROSOR_MINIMO = 3;
const CALIDAD_EXPORT = 0.85;

/* ------------------------------- dibujo ---------------------------------- */

function normalizar(a: Punto, b: Punto) {
  return {
    x: Math.min(a.x, b.x),
    y: Math.min(a.y, b.y),
    ancho: Math.abs(b.x - a.x),
    alto: Math.abs(b.y - a.y),
  };
}

function dibujarFlecha(ctx: CanvasRenderingContext2D, desde: Punto, hasta: Punto, color: string, grosor: number) {
  const dx = hasta.x - desde.x;
  const dy = hasta.y - desde.y;
  const largo = Math.hypot(dx, dy);
  if (largo < 1) return;

  const angulo = Math.atan2(dy, dx);
  const cabeza = Math.min(grosor * 4.5, largo * 0.45);
  const apertura = Math.PI / 7;

  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = grosor;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  // El cuerpo se corta antes de la punta para que no asome bajo la cabeza.
  ctx.beginPath();
  ctx.moveTo(desde.x, desde.y);
  ctx.lineTo(hasta.x - Math.cos(angulo) * cabeza * 0.6, hasta.y - Math.sin(angulo) * cabeza * 0.6);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(hasta.x, hasta.y);
  ctx.lineTo(hasta.x - Math.cos(angulo - apertura) * cabeza, hasta.y - Math.sin(angulo - apertura) * cabeza);
  ctx.lineTo(hasta.x - Math.cos(angulo + apertura) * cabeza, hasta.y - Math.sin(angulo + apertura) * cabeza);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function dibujarTrazo(ctx: CanvasRenderingContext2D, trazo: Trazo) {
  if (trazo.tipo === "flecha") {
    dibujarFlecha(ctx, trazo.desde, trazo.hasta, trazo.color, trazo.grosor);
    return;
  }

  if (trazo.tipo === "rectangulo") {
    const r = normalizar(trazo.desde, trazo.hasta);
    ctx.save();
    ctx.strokeStyle = trazo.color;
    ctx.lineWidth = trazo.grosor;
    ctx.lineJoin = "round";
    ctx.strokeRect(r.x, r.y, r.ancho, r.alto);
    ctx.restore();
    return;
  }

  if (trazo.tipo === "resaltado") {
    const r = normalizar(trazo.desde, trazo.hasta);
    ctx.save();
    ctx.fillStyle = AMARILLO_RESALTADO;
    ctx.fillRect(r.x, r.y, r.ancho, r.alto);
    ctx.restore();
    return;
  }

  // Misma geometría que el recuadro, pero relleno opaco: lo de abajo desaparece.
  // El tapado se aplana en el export (confirmar redibuja y luego exporta el
  // canvas), así que el dato no viaja escondido bajo una capa.
  if (trazo.tipo === "ocultar") {
    const r = normalizar(trazo.desde, trazo.hasta);
    ctx.save();
    ctx.fillStyle = COLOR_OCULTAR;
    ctx.fillRect(r.x, r.y, r.ancho, r.alto);
    ctx.restore();
    return;
  }

  if (trazo.puntos.length === 0) return;
  ctx.save();
  ctx.strokeStyle = trazo.color;
  ctx.lineWidth = trazo.grosor;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.beginPath();
  ctx.moveTo(trazo.puntos[0].x, trazo.puntos[0].y);
  for (const p of trazo.puntos.slice(1)) ctx.lineTo(p.x, p.y);
  // Un toque sin arrastre igual deja un punto visible (lineCap redondo).
  if (trazo.puntos.length === 1) ctx.lineTo(trazo.puntos[0].x, trazo.puntos[0].y);
  ctx.stroke();
  ctx.restore();
}

function crearTrazo(herramienta: Herramienta, punto: Punto, color: string, grosor: number): Trazo {
  if (herramienta === "libre") return { tipo: "libre", color, grosor, puntos: [punto] };
  if (herramienta === "resaltado") return { tipo: "resaltado", desde: punto, hasta: punto };
  if (herramienta === "ocultar") return { tipo: "ocultar", desde: punto, hasta: punto };
  if (herramienta === "rectangulo") return { tipo: "rectangulo", color, grosor, desde: punto, hasta: punto };
  return { tipo: "flecha", color, grosor, desde: punto, hasta: punto };
}

function extenderTrazo(trazo: Trazo, punto: Punto): Trazo {
  if (trazo.tipo !== "libre") return { ...trazo, hasta: punto };

  const ultimo = trazo.puntos[trazo.puntos.length - 1];
  // Se descartan los puntos casi pegados: menos ruido y strokes más livianos.
  if (ultimo && Math.hypot(punto.x - ultimo.x, punto.y - ultimo.y) < trazo.grosor / 2) return trazo;
  return { ...trazo, puntos: [...trazo.puntos, punto] };
}

function esTrazoUtil(trazo: Trazo, minimo: number): boolean {
  if (trazo.tipo === "libre") return trazo.puntos.length > 0;
  return Math.hypot(trazo.hasta.x - trazo.desde.x, trazo.hasta.y - trazo.desde.y) >= minimo;
}

function exportarBlob(canvas: HTMLCanvasElement): Promise<Blob | null> {
  return new Promise((resolve) => {
    canvas.toBlob(
      (primero) => {
        // Si el navegador no soporta WebP en toBlob devuelve PNG (mucho más pesado):
        // en ese caso se reintenta con JPEG para respetar el límite de subida.
        if (primero && primero.type === "image/webp") {
          resolve(primero);
          return;
        }
        canvas.toBlob((jpeg) => resolve(jpeg ?? primero), "image/jpeg", CALIDAD_EXPORT);
      },
      "image/webp",
      CALIDAD_EXPORT,
    );
  });
}

/* ------------------------------ componente -------------------------------- */

export default function AnotadorCaptura({ imagen, onListo, onCancelar }: AnotadorCapturaProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const imagenRef = useRef<HTMLImageElement | null>(null);
  const trazosRef = useRef<Trazo[]>([]);
  const trazoEnCursoRef = useRef<Trazo | null>(null);
  const punteroActivoRef = useRef<number | null>(null);
  const frameRef = useRef<number | null>(null);

  const [montado, setMontado] = useState(false);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [trazos, setTrazos] = useState<Trazo[]>([]);
  const [herramienta, setHerramienta] = useState<Herramienta>("flecha");
  const [color, setColor] = useState<string>(COLORES[0].valor);
  const [grosor, setGrosor] = useState(GROSOR_MINIMO);
  const [exportando, setExportando] = useState(false);
  const [confirmandoDescarte, setConfirmandoDescarte] = useState(false);

  const puedeDibujar = !cargando && !error && !exportando && !confirmandoDescarte;

  useEffect(() => {
    setMontado(true);
  }, []);

  const redibujar = useCallback((lista: Trazo[]) => {
    const canvas = canvasRef.current;
    const img = imagenRef.current;
    if (!canvas || !img) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    for (const t of lista) dibujarTrazo(ctx, t);
    if (trazoEnCursoRef.current) dibujarTrazo(ctx, trazoEnCursoRef.current);
  }, []);

  // El trazo en curso se guarda en un ref y se pinta por requestAnimationFrame:
  // en móvil pointermove dispara ~60 veces por segundo y un setState por evento
  // haría saltar el dibujo.
  const programarRedibujo = useCallback(() => {
    if (frameRef.current !== null) return;
    frameRef.current = requestAnimationFrame(() => {
      frameRef.current = null;
      redibujar(trazosRef.current);
    });
  }, [redibujar]);

  const aplicarTrazos = useCallback((siguientes: Trazo[]) => {
    trazosRef.current = siguientes;
    setTrazos(siguientes);
  }, []);

  // Carga de la imagen: se fija el tamaño real del canvas al de la captura.
  useEffect(() => {
    if (!montado) return;

    const url = URL.createObjectURL(imagen);
    const img = new Image();
    let vigente = true;

    img.onload = () => {
      if (!vigente) return;
      imagenRef.current = img;
      const canvas = canvasRef.current;
      if (canvas) {
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
      }
      const lado = Math.min(img.naturalWidth, img.naturalHeight);
      setGrosor(Math.max(GROSOR_MINIMO, Math.round(lado / DIVISOR_GROSOR)));
      setCargando(false);
      redibujar(trazosRef.current);
    };

    img.onerror = () => {
      if (!vigente) return;
      setError("No se pudo abrir la captura.");
      setCargando(false);
    };

    img.src = url;

    return () => {
      vigente = false;
      URL.revokeObjectURL(url);
    };
  }, [imagen, montado, redibujar]);

  // Cualquier cambio en la lista de trazos redibuja el canvas completo.
  useEffect(() => {
    redibujar(trazos);
  }, [trazos, redibujar]);

  useEffect(() => {
    return () => {
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    };
  }, []);

  // Descartar borra la captura y todas las anotaciones. Si hay trazos hechos, un
  // Escape o un clic al azar no puede botar el trabajo sin preguntar.
  const solicitarDescarte = useCallback(() => {
    if (exportando) return;
    if (trazosRef.current.length > 0) {
      setConfirmandoDescarte(true);
      return;
    }
    onCancelar();
  }, [exportando, onCancelar]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key !== "Escape" || exportando) return;
      // Con la confirmación abierta, Escape cierra la confirmación, no el editor.
      if (confirmandoDescarte) {
        setConfirmandoDescarte(false);
        return;
      }
      solicitarDescarte();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [confirmandoDescarte, exportando, solicitarDescarte]);

  // El scroll del body no se toca a propósito: quien abre este editor ya lo
  // tiene bloqueado, y liberarlo al desmontar dejaría la página de atrás suelta.
  // El overlay es opaco y el canvas usa touch-none, así que nada queda accesible.

  /* --------------------------- puntero (dedo y mouse) --------------------- */

  // El canvas se muestra reducido para caber en pantalla: las coordenadas del
  // dibujo se convierten al sistema de la IMAGEN, no al de pantalla.
  function coordsImagen(e: React.PointerEvent<HTMLCanvasElement>): Punto {
    const canvas = e.currentTarget;
    const rect = canvas.getBoundingClientRect();
    const escalaX = rect.width > 0 ? canvas.width / rect.width : 1;
    const escalaY = rect.height > 0 ? canvas.height / rect.height : 1;
    return {
      x: (e.clientX - rect.left) * escalaX,
      y: (e.clientY - rect.top) * escalaY,
    };
  }

  function alPresionar(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!puedeDibujar) return;
    if (e.pointerType === "mouse" && e.button !== 0) return;
    if (punteroActivoRef.current !== null) return; // segundo dedo: se ignora

    punteroActivoRef.current = e.pointerId;
    e.currentTarget.setPointerCapture(e.pointerId);
    trazoEnCursoRef.current = crearTrazo(herramienta, coordsImagen(e), color, grosor);
    programarRedibujo();
  }

  function alMover(e: React.PointerEvent<HTMLCanvasElement>) {
    if (punteroActivoRef.current !== e.pointerId) return;
    const enCurso = trazoEnCursoRef.current;
    if (!enCurso) return;

    trazoEnCursoRef.current = extenderTrazo(enCurso, coordsImagen(e));
    programarRedibujo();
  }

  function alSoltar(e: React.PointerEvent<HTMLCanvasElement>) {
    if (punteroActivoRef.current !== e.pointerId) return;
    punteroActivoRef.current = null;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);

    const enCurso = trazoEnCursoRef.current;
    trazoEnCursoRef.current = null;

    // Un toque sin arrastre no debe dejar flechas ni recuadros de tamaño cero.
    if (enCurso && esTrazoUtil(enCurso, Math.max(4, grosor * 2))) {
      aplicarTrazos([...trazosRef.current, enCurso]);
      return;
    }
    redibujar(trazosRef.current);
  }

  /* ------------------------------- acciones ------------------------------- */

  function deshacer() {
    aplicarTrazos(trazosRef.current.slice(0, -1));
  }

  function limpiar() {
    aplicarTrazos([]);
  }

  async function confirmar() {
    const canvas = canvasRef.current;
    if (!canvas || !puedeDibujar) return;

    setExportando(true);
    setError(null);
    redibujar(trazosRef.current); // aplana imagen + trazos

    const blob = await exportarBlob(canvas);
    if (!blob) {
      setError("No se pudo preparar la imagen anotada.");
      setExportando(false);
      return;
    }
    onListo(blob);
  }

  if (!montado) return null;

  const nombreHerramienta = HERRAMIENTAS.find((h) => h.id === herramienta)?.nombre ?? "";
  const pistaSinColor = PISTA_SIN_COLOR[herramienta];
  const sinTrazos = trazos.length === 0;

  return createPortal(
    <div
      data-feedback-ui
      role="dialog"
      aria-modal="true"
      aria-label="Anotar captura de pantalla"
      className="fixed inset-0 z-[210] flex flex-col overscroll-none bg-white animate-in fade-in duration-150"
    >
      {/* Encabezado */}
      <div className="flex items-center justify-between gap-3 border-b border-gray-200 px-4 py-2 sm:py-3">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-gray-900">Anotar captura</h2>
          <p className="hidden truncate text-xs text-gray-500 sm:block">
            Marca sobre la imagen lo que quieres reportar.
          </p>
        </div>
        <button
          type="button"
          onClick={solicitarDescarte}
          disabled={exportando}
          aria-label="Descartar la captura y volver"
          className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 disabled:opacity-50"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Lienzo */}
      <div className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden bg-gray-100 p-2 sm:p-4">
        <canvas
          ref={canvasRef}
          role="img"
          aria-label="Captura de pantalla lista para anotar"
          onPointerDown={alPresionar}
          onPointerMove={alMover}
          onPointerUp={alSoltar}
          onPointerCancel={alSoltar}
          // touch-none evita que el navegador haga scroll o zoom mientras se dibuja.
          className="max-h-full max-w-full touch-none rounded-lg bg-white shadow-lg ring-1 ring-gray-300"
          style={{ cursor: puedeDibujar ? "crosshair" : "default" }}
        />

        {cargando && (
          <div className="absolute inset-0 flex items-center justify-center gap-2 bg-gray-100 text-sm text-gray-500">
            <Loader2 className="h-4 w-4 animate-spin" />
            Cargando la captura...
          </div>
        )}
      </div>

      {/* Barra de herramientas */}
      <div
        className="border-t border-gray-200 bg-white px-3 pt-2 sm:pt-3"
        style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
      >
        {/* En pantallas bajas cada línea de esta barra le quita alto al lienzo:
            se compacta el espaciado y la ayuda de texto pasa a ser solo para
            lectores de pantalla. Ninguna herramienta se esconde en móvil. */}
        <div className="mx-auto flex max-w-3xl flex-col gap-2 sm:gap-2.5">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2 sm:gap-x-4 sm:gap-y-2.5">
            <div role="group" aria-label="Herramienta de anotación" className="flex items-center gap-1.5">
              {HERRAMIENTAS.map(({ id, nombre, Icono }) => {
                const activo = herramienta === id;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setHerramienta(id)}
                    aria-label={nombre}
                    aria-pressed={activo}
                    title={nombre}
                    className={`flex h-10 w-10 items-center justify-center rounded-lg transition ${
                      activo
                        ? "bg-[#253158] text-white shadow-sm"
                        : "bg-white text-gray-600 ring-1 ring-gray-200 hover:bg-gray-50"
                    }`}
                  >
                    <Icono className="h-[18px] w-[18px]" />
                  </button>
                );
              })}
            </div>

            {pistaSinColor ? (
              <p className="text-xs text-gray-500">{pistaSinColor}</p>
            ) : (
              <div role="group" aria-label="Color del trazo" className="flex items-center gap-2">
                {COLORES.map((c) => {
                  const activo = color === c.valor;
                  return (
                    <button
                      key={c.valor}
                      type="button"
                      onClick={() => setColor(c.valor)}
                      aria-label={`Color ${c.nombre}`}
                      aria-pressed={activo}
                      title={`Color ${c.nombre}`}
                      className={`flex h-10 w-10 items-center justify-center rounded-full transition sm:h-8 sm:w-8 ${
                        activo
                          ? "ring-2 ring-[#253158] ring-offset-2"
                          : "ring-1 ring-gray-300 hover:ring-gray-400"
                      }`}
                      style={{ backgroundColor: c.valor }}
                    >
                      {activo && <Check className="h-4 w-4 text-white" strokeWidth={3} />}
                    </button>
                  );
                })}
              </div>
            )}

            <div className="ml-auto flex items-center gap-1.5">
              <button
                type="button"
                onClick={deshacer}
                disabled={sinTrazos || exportando}
                aria-label="Deshacer la última anotación"
                className="flex h-10 items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40 sm:h-9"
              >
                <Undo2 className="h-4 w-4" />
                <span className="hidden sm:inline">Deshacer</span>
              </button>
              <button
                type="button"
                onClick={limpiar}
                disabled={sinTrazos || exportando}
                aria-label="Borrar todas las anotaciones"
                className="flex h-10 items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40 sm:h-9"
              >
                <Trash2 className="h-4 w-4" />
                <span className="hidden sm:inline">Limpiar</span>
              </button>
            </div>
          </div>

          {/* En móvil no se pinta (el botón activo ya lo indica) pero sigue en el
              árbol de accesibilidad para que se anuncie el cambio de herramienta. */}
          <p aria-live="polite" className="sr-only text-xs text-gray-500 sm:not-sr-only">
            Herramienta: <span className="font-semibold text-[#253158]">{nombreHerramienta}</span>. Dibuja
            sobre la imagen con el dedo o el mouse.
          </p>

          {error && <p className="text-xs font-medium text-[#c6352e]">{error}</p>}

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={solicitarDescarte}
              disabled={exportando}
              className="h-11 rounded-lg border border-gray-200 bg-white px-4 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={confirmar}
              disabled={!puedeDibujar}
              className="flex h-11 flex-1 items-center justify-center gap-2 rounded-lg bg-[#253158] px-4 text-sm font-semibold text-white transition-colors hover:bg-[#1e2a4a] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {exportando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              {exportando ? "Preparando..." : "Usar esta captura"}
            </button>
          </div>
        </div>
      </div>

      {/* Confirmación de descarte. Va dentro del propio overlay y no con
          ConfirmDialog: ese componente se monta en z-[200]/z-[201], debajo del
          z-[210] de este editor (quedaría invisible), y al desmontarse resetea
          document.body.style.overflow, que es el bloqueo de scroll que mantiene
          abierto el panel de feedback. */}
      {confirmandoDescarte && (
        <div
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="anotador-descarte-titulo"
          aria-describedby="anotador-descarte-detalle"
          className="absolute inset-0 z-10 flex items-center justify-center bg-slate-900/40 p-4 animate-in fade-in duration-150"
        >
          <div className="w-full max-w-sm overflow-hidden rounded-xl border border-gray-200 bg-white shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="h-1 w-full bg-[#c6352e]" />
            <div className="px-5 pb-5 pt-4">
              <div className="mb-3 flex items-start gap-3">
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-red-50">
                  <AlertTriangle className="h-5 w-5 text-[#c6352e]" />
                </div>
                <h3
                  id="anotador-descarte-titulo"
                  className="pt-2 text-base font-semibold leading-tight text-gray-900"
                >
                  Descartar la captura
                </h3>
              </div>
              <p id="anotador-descarte-detalle" className="text-sm leading-relaxed text-gray-500">
                Se perderán las anotaciones que hiciste sobre la imagen. Esta acción no se puede
                deshacer.
              </p>
              <div className="mt-5 flex items-center justify-end gap-2">
                <button
                  type="button"
                  // El foco parte en la opción segura del diálogo.
                  autoFocus
                  onClick={() => setConfirmandoDescarte(false)}
                  className="h-10 rounded-lg border border-gray-200 bg-white px-4 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
                >
                  Seguir anotando
                </button>
                <button
                  type="button"
                  onClick={onCancelar}
                  className="h-10 rounded-lg bg-[#c6352e] px-4 text-sm font-semibold text-white transition-colors hover:bg-red-700"
                >
                  Descartar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>,
    document.body,
  );
}
