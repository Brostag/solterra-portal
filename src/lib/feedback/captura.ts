/**
 * Captura de la pantalla actual del portal para adjuntarla a un reporte de
 * feedback.
 *
 * ESTO ES UN RE-RENDER DEL DOM, NO UNA FOTOGRAFÍA DE LA PANTALLA.
 * snapdom clona el DOM visible, le incrusta los estilos y lo rasteriza dentro
 * de un SVG. Por lo tanto la imagen NO incluye:
 *  - el chrome del navegador (barra de direcciones, pestañas, barra del sistema)
 *  - los menús nativos de <select>, alertas del navegador ni el selector de
 *    archivos del sistema operativo
 *  - el contenido de <video> y de <canvas> pintado por WebGL
 *  - las barras de scroll (cuando un contenedor está scrolleado, snapdom exporta
 *    el contenido sin su barra)
 * Tampoco captura otras pestañas ni nada fuera de la ventana de la aplicación.
 *
 * CÓDIGO DE NAVEGADOR. No debe importarse desde un Server Component: usa
 * `document`, `window` y `canvas`. Si igual se ejecuta en el servidor, la
 * función devuelve `{ ok: false }` en vez de lanzar.
 *
 * Por qué snapdom y no html2canvas: `globals.css` define colores con `oklch()`
 * y el parser de color de html2canvas revienta con esa notación. snapdom delega
 * el parseo al navegador (usa foreignObject), así que no la toca.
 */

export type ResultadoCaptura =
  | { ok: true; blob: Blob; ancho: number; alto: number }
  | { ok: false; motivo: string };

/** Ancho máximo de la imagen final. Sobre esto no se gana legibilidad. */
const ANCHO_MAXIMO = 1600;

/**
 * Ancho mínimo al degradar: bajo esto el texto del portal deja de leerse. Es un
 * techo para el piso, no un mínimo absoluto: si la captura ya nace más angosta
 * (celular), el piso baja con ella; ver `comprimir`.
 */
const ANCHO_MINIMO = 800;

/** Un celular moderno puede reportar 3: triplica el peso sin aportar detalle. */
const DPR_MAXIMO = 2;

/** Exceso de alto sobre la ventana a partir del cual se asume recorte fallido. */
const EXCESO_ALTO_TOLERADO = 1.5;

/**
 * Tope duro del blob. Vercel corta el body de una función serverless en ~4,5 MB
 * y en el mismo envío puede ir además un adjunto que sube la persona.
 */
const PESO_MAXIMO = 1_500_000;

/** Si el re-render se cuelga, se devuelve el control al usuario igual. */
const TIEMPO_LIMITE_MS = 20_000;

/**
 * Pasadas de compresión, de mejor a peor. Se corta en la primera que baja de
 * `PESO_MAXIMO`. En una pantalla de portal (texto plano y colores planos) la
 * primera pasada suele quedar bajo 400 kB; el resto es red de seguridad.
 */
const PASADAS: ReadonlyArray<{ factorAncho: number; calidad: number }> = [
  { factorAncho: 1, calidad: 0.85 },
  { factorAncho: 1, calidad: 0.7 },
  { factorAncho: 0.8, calidad: 0.7 },
  { factorAncho: 0.65, calidad: 0.6 },
];

/** La pasada más agresiva de la escalera: hasta ahí puede bajar el piso de ancho. */
const FACTOR_MINIMO = Math.min(...PASADAS.map((p) => p.factorAncho));

/**
 * WebP en `canvas.toBlob` está en todos los navegadores vigentes, pero Safari
 * antiguo devuelve PNG en silencio (mismo blob, otro `type`). Se detecta una vez
 * por sesión mirando el `type` del blob que efectivamente devolvió el navegador.
 */
let mimeSalida: "image/webp" | "image/jpeg" | null = null;

export async function capturarPantalla(): Promise<ResultadoCaptura> {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return {
      ok: false,
      motivo: "La captura de pantalla solo funciona desde el navegador.",
    };
  }

  try {
    const lienzo = await conTiempoLimite(rasterizarVista(), TIEMPO_LIMITE_MS);
    return await comprimir(lienzo);
  } catch (error) {
    return { ok: false, motivo: motivoLegible(error) };
  } finally {
    // snapdom monta un sandbox fuera de pantalla para leer estilos por defecto y
    // lo borra al terminar. Si el render falla a medio camino puede quedar
    // colgando del <body>: se limpia igual. Se vuelve a crear solo si hace falta.
    limpiarSandboxDeSnapdom();
  }
}

/* ------------------------------------------------------------------ */
/* Rasterizado                                                         */
/* ------------------------------------------------------------------ */

/**
 * DECISIÓN CLAVE — EL SCROLL.
 *
 * En este portal el scroll NO está en `window`. El shell
 * (`src/components/portal/PortalShell.tsx`) fija `h-screen overflow-hidden` en la
 * raíz y deja el scroll real en un contenedor interno:
 * `<main className="flex-1 overflow-y-auto p-6">` (PortalShell.tsx:67).
 * Si no se compensa ese `scrollTop`, el clon nace en el tope y la persona
 * termina reportando una pantalla que no es la que está mirando.
 *
 * Se evaluaron las tres vías:
 *
 * 1. Capturar solo el contenedor scrolleado (`<main>`).
 *    Funciona —snapdom envuelve los hijos del scroller en un div con
 *    `transform: translate(-scrollLeft, -scrollTop)`— pero pierde el sidebar y
 *    el topbar, que son justamente el contexto que sirve para ubicar un bug.
 *    Queda como plan B.
 *
 * 2. Capturar todo y recortar después en un canvas propio usando `scrollTop`.
 *    Obliga a reimplementar a mano el desplazamiento de los elementos
 *    `position: fixed` y a rasterizar la página completa para botar el 90%.
 *    Más lento y más frágil.
 *
 * 3. Tocar estilos antes de capturar y restaurarlos.
 *    Provoca un salto visible y deja la app en un estado inconsistente si algo
 *    falla en medio.
 *
 * SE ELIGIÓ: raíz = `<html>` + `clip: "viewport"`.
 *  - La raíz debe ser un ANCESTRO del scroller, nunca el scroller mismo: snapdom
 *    salta la compensación de scroll justamente para el nodo raíz cuando `clip`
 *    está activo. Con `<html>` como raíz, `<main>` es un nodo interno y sí recibe
 *    su `translate(-scrollTop)`.
 *  - `clip: "viewport"` trabaja en coordenadas de cliente, así que además cubre
 *    gratis las páginas donde el scroll sí está en `window` (sitio público).
 *  - Lo que queda fuera del recorte no se elimina: snapdom lo reemplaza por una
 *    caja del mismo tamaño con `visibility: hidden`, así que el layout no se
 *    corre y el recorte no introduce artefactos.
 *  - No se modifica ni un estilo del documento vivo: no hay nada que restaurar
 *    ni parpadeo para el usuario.
 */
async function rasterizarVista(): Promise<HTMLCanvasElement> {
  const { snapdom } = await import("@zumer/snapdom");

  const raiz = document.documentElement;
  const altoVista = raiz.clientHeight || window.innerHeight;
  // Un dpr de 3 en celular triplica los píxeles sin aportar legibilidad.
  const dpr = Math.min(window.devicePixelRatio || 1, DPR_MAXIMO);

  const comunes = {
    dpr,
    // Fondo explícito: el JPEG de respaldo no tiene canal alfa y sin esto lo
    // transparente sale negro.
    backgroundColor: "#ffffff",
    // El SVG se rasteriza aislado y no alcanza las fuentes del documento. Sin
    // incrustarlas, el texto cae a una tipografía del sistema, cambian las
    // métricas y el texto se re-envuelve: la captura mostraría un layout que la
    // persona nunca vio.
    embedFonts: true,
    // El propio widget de feedback no debe salir en la captura.
    // "hide" (y no "remove") conserva la caja, así el topbar no se descuadra.
    exclude: ["[data-feedback-ui]"],
    excludeMode: "hide" as const,
  };

  const lienzo = await snapdom.toCanvas(raiz, { ...comunes, clip: "viewport" });
  if (recorteValido(lienzo, altoVista * dpr)) {
    return lienzo;
  }

  // El recorte no se aplicó como se esperaba (el alto no corresponde al de la
  // ventana). Plan B: capturar solo el contenedor scrolleado. Sin `clip`, snapdom
  // sí compensa el scroll del nodo raíz, y `offsetHeight` acota el alto a la
  // parte visible. Se pierden sidebar y topbar, pero se conserva lo que importa.
  const scroller = contenedorScrolleado();
  if (!scroller) {
    return lienzo;
  }
  return await snapdom.toCanvas(scroller, { ...comunes, clip: null });
}

/**
 * Alcance real de esta verificación, para no prometer de más:
 *
 * Con `clip: "viewport"` snapdom toma el ancho y el alto del recorte de
 * `documentElement.clientWidth/clientHeight`, así que el lienzo sale SIEMPRE con
 * la proporción de la ventana. Comparar proporciones no detectaría nada.
 *
 * Lo que sí se puede detectar en píxeles es que el recorte no se haya aplicado:
 * en ese caso el lienzo trae el alto del documento completo, muy por encima del
 * alto esperado. Se rechaza solo con un exceso grande porque el rasterizador
 * redondea, y además reduce la imagen por su cuenta cuando supera el límite de
 * decodificación del navegador (siempre hacia abajo, nunca hacia arriba): un
 * falso positivo mandaría al plan B sin necesidad y la captura perdería el
 * sidebar y el topbar.
 *
 * No detecta un recorte parcialmente corrido ni un desfase de scroll: para eso
 * habría que comparar el lienzo contra el DOM y no existe esa referencia.
 */
function recorteValido(lienzo: HTMLCanvasElement, altoEsperado: number): boolean {
  if (lienzo.width <= 0 || lienzo.height <= 0) return false;
  if (altoEsperado <= 0) return true;
  return lienzo.height <= altoEsperado * EXCESO_ALTO_TOLERADO;
}

/** El `<main>` del shell es el scroller real; se valida que efectivamente scrollee. */
function contenedorScrolleado(): HTMLElement | null {
  const principales = Array.from(document.querySelectorAll<HTMLElement>("main"));
  const scroller = principales.find(
    (el) => el.clientHeight > 0 && el.scrollHeight > el.clientHeight + 1,
  );
  return scroller ?? principales[0] ?? null;
}

/* ------------------------------------------------------------------ */
/* Compresión                                                          */
/* ------------------------------------------------------------------ */

async function comprimir(origen: HTMLCanvasElement): Promise<ResultadoCaptura> {
  if (origen.width <= 0 || origen.height <= 0) {
    return {
      ok: false,
      motivo: "La captura salió vacía. Intenta de nuevo o adjunta una imagen.",
    };
  }

  const anchoBase = Math.min(origen.width, ANCHO_MAXIMO);

  // El piso de legibilidad no puede quedar por encima de lo que la escalera
  // pretende reducir. Una captura de celular llega con ~780 px de ancho: con un
  // piso fijo de 800 el propio ancho base pasaba a ser el piso, las últimas
  // pasadas no achicaban nada y solo bajaban la calidad. Se escala con la
  // captura para que la degradación funcione también ahí.
  const piso = Math.min(ANCHO_MINIMO, Math.round(anchoBase * FACTOR_MINIMO));
  let ultimoError = "No se pudo comprimir la captura.";

  for (const pasada of PASADAS) {
    const ancho = Math.max(piso, Math.round(anchoBase * pasada.factorAncho));

    const destino = redimensionar(origen, ancho);
    if (!destino) {
      ultimoError = "El navegador no entregó un contexto 2D para la captura.";
      continue;
    }

    const blob = await codificar(destino, pasada.calidad);
    if (!blob) {
      ultimoError = "El navegador no pudo generar la imagen de la captura.";
      continue;
    }

    if (blob.size <= PESO_MAXIMO) {
      return { ok: true, blob, ancho: destino.width, alto: destino.height };
    }

    ultimoError =
      "La captura quedó demasiado pesada para enviarla. Adjunta una imagen manualmente.";
  }

  return { ok: false, motivo: ultimoError };
}

/**
 * Redibuja el lienzo al ancho pedido sobre fondo blanco. Se ejecuta siempre,
 * incluso sin reducción de tamaño, porque el aplanado del fondo es lo que evita
 * que el JPEG de respaldo salga con zonas negras.
 */
function redimensionar(
  origen: HTMLCanvasElement,
  ancho: number,
): HTMLCanvasElement | null {
  const escala = ancho / origen.width;
  const destino = document.createElement("canvas");
  destino.width = Math.max(1, Math.round(ancho));
  destino.height = Math.max(1, Math.round(origen.height * escala));

  const ctx = destino.getContext("2d");
  if (!ctx) return null;

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, destino.width, destino.height);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(origen, 0, 0, destino.width, destino.height);
  return destino;
}

/** WebP con respaldo automático a JPEG si el navegador no lo codifica. */
async function codificar(
  lienzo: HTMLCanvasElement,
  calidad: number,
): Promise<Blob | null> {
  if (mimeSalida === "image/jpeg") {
    return await aBlob(lienzo, "image/jpeg", calidad);
  }

  const webp = await aBlob(lienzo, "image/webp", calidad);
  if (webp && webp.type === "image/webp") {
    mimeSalida = "image/webp";
    return webp;
  }

  // El navegador ignoró el formato pedido y devolvió otra cosa (PNG, casi
  // siempre). Se pasa a JPEG, que sí comprime, y se recuerda la decisión.
  mimeSalida = "image/jpeg";
  return await aBlob(lienzo, "image/jpeg", calidad);
}

function aBlob(
  lienzo: HTMLCanvasElement,
  mime: string,
  calidad: number,
): Promise<Blob | null> {
  return new Promise((resolver) => {
    try {
      // Un lienzo contaminado por una imagen de otro origen hace que toBlob
      // lance SecurityError. snapdom incrusta las imágenes como data URL, así
      // que no debería ocurrir, pero el caso se maneja igual.
      lienzo.toBlob((blob) => resolver(blob), mime, calidad);
    } catch {
      resolver(null);
    }
  });
}

/* ------------------------------------------------------------------ */
/* Utilidades                                                          */
/* ------------------------------------------------------------------ */

function conTiempoLimite<T>(tarea: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolver, rechazar) => {
    const temporizador = window.setTimeout(() => {
      rechazar(new Error("CAPTURA_TIEMPO_AGOTADO"));
    }, ms);

    tarea.then(
      (valor) => {
        window.clearTimeout(temporizador);
        resolver(valor);
      },
      (error) => {
        window.clearTimeout(temporizador);
        rechazar(error);
      },
    );
  });
}

function motivoLegible(error: unknown): string {
  if (error instanceof Error && error.message === "CAPTURA_TIEMPO_AGOTADO") {
    return "La captura tardó demasiado. Intenta de nuevo o adjunta una imagen.";
  }
  return "No se pudo capturar la pantalla. Puedes adjuntar una imagen manualmente.";
}

function limpiarSandboxDeSnapdom(): void {
  try {
    const sandbox = document.getElementById("snapdom-sandbox");
    if (sandbox?.getAttribute("data-snapdom-sandbox") === "true") {
      sandbox.remove();
    }
  } catch {
    // La limpieza nunca debe tapar el resultado de la captura.
  }
}
