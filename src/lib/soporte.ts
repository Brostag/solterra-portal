/**
 * Identidad de la cuenta técnica (soporte).
 *
 * La bandeja `/soporte` y cualquier vista que muestre reportes de feedback son
 * exclusivas de esta cuenta: una persona del portal nunca debe ver los reportes
 * de otra.
 *
 * Este módulo es SERVER-ONLY. `SOPORTE_EMAILS` no lleva prefijo NEXT_PUBLIC_,
 * así que Next no la inlinea en el bundle del cliente. El proyecto no tiene la
 * dependencia `server-only` (mismo criterio que `src/lib/terreno/cadena.ts`),
 * por eso el aislamiento se documenta en vez de forzarse con un import. Si este
 * módulo llegara igual a un componente cliente, `process.env.SOPORTE_EMAILS`
 * sería `undefined` y `esSoporte()` devolvería `false` para todos: falla
 * cerrado, no abierto.
 */

// El aviso de configuración se emite una sola vez por proceso: en un handler
// que corre en cada request, repetirlo solo ensucia los logs.
let avisoConfigEmitido = false;

function correosSoporte(): string[] {
  const crudo = process.env.SOPORTE_EMAILS;
  if (!crudo) return [];
  return crudo
    .split(",")
    .map((correo) => correo.trim().toLowerCase())
    .filter(Boolean);
}

/**
 * ¿La sesión corresponde a la cuenta técnica? Se resuelve contra la variable de
 * entorno `SOPORTE_EMAILS` (lista separada por comas, sin distinguir mayúsculas).
 *
 * REQUISITO ADICIONAL — no basta con estar en SOPORTE_EMAILS: la bandeja
 * `/soporte` vive dentro del grupo de rutas `(portal)`, y ese layout
 * (`src/app/(portal)/layout.tsx`) corta con
 * `if (!canAccessModule(session, "COMERCIAL")) redirect(landingFor(session))`
 * ANTES de que la página pueda ejecutar `requireSoporte()`. Es decir, la cuenta
 * técnica además debe poder entrar al módulo COMERCIAL: en la práctica, ser
 * ADMINISTRADOR o no tener área asignada (ver `allowedModules` en
 * `src/lib/modules.ts`).
 *
 * Si mañana se pone en SOPORTE_EMAILS el correo de un SUPERVISOR con área
 * MANTENCION u OPERACIONES, `esSoporte()` devolverá true pero el layout lo
 * devolverá a su módulo sin ningún mensaje que lo explique. Falla cerrado, no
 * abre acceso indebido. Habilitar ese caso exige mover la bandeja fuera de
 * `(portal)` o relajar el layout compartido: cambio estructural, requiere
 * aprobación.
 */
export function esSoporte(session: { email: string } | null | undefined): boolean {
  const email = session?.email?.trim().toLowerCase();
  if (!email) return false;

  const permitidos = correosSoporte();

  if (permitidos.length === 0) {
    // Una bandeja abierta por error de configuración es peor que una bandeja
    // inaccesible: sin la variable, nadie es soporte.
    if (!avisoConfigEmitido) {
      avisoConfigEmitido = true;
      console.warn(
        "[soporte] SOPORTE_EMAILS no está definida: la bandeja de reportes queda sin acceso para todos.",
      );
    }
    return false;
  }

  return permitidos.includes(email);
}
