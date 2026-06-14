import type { Rol, Area, UserSession } from "@/types";

export type Module = "COMERCIAL" | "MANTENCION" | "OPERACION";

type SessionAccess = Pick<UserSession, "rol" | "area">;

/** Regla única de acceso por módulo (rol + área). */
export function allowedModules(rol: Rol, area: Area | null): Module[] {
  if (rol === "ADMINISTRADOR") return ["COMERCIAL", "MANTENCION", "OPERACION"];
  if (area === "OPERACIONES") return ["OPERACION"];
  if (area === "MANTENCION") return ["MANTENCION"];
  return ["COMERCIAL"];
}

export const MODULE_META: Record<
  Module,
  { titulo: string; subtitulo: string; home: string }
> = {
  COMERCIAL: {
    titulo: "Módulo Comercial",
    subtitulo: "Contratos, cotizaciones, empresas y órdenes de compra",
    home: "/dashboard",
  },
  MANTENCION: {
    titulo: "Módulo de Mantención",
    subtitulo: "Planificación de trabajos, mantenciones y certificados",
    home: "/mantencion",
  },
  OPERACION: {
    titulo: "Módulo de Operación",
    subtitulo: "Control diario de equipos y partes operacionales",
    home: "/operacion",
  },
};

export function moduleHome(m: Module): string {
  return MODULE_META[m].home;
}

export function canAccessModule(session: SessionAccess, m: Module): boolean {
  return allowedModules(session.rol, session.area).includes(m);
}

/** A dónde mandar al usuario tras el login: un solo módulo → su home; varios → selector. */
export function landingFor(session: SessionAccess): string {
  const mods = allowedModules(session.rol, session.area);
  return mods.length === 1 ? moduleHome(mods[0]) : "/modulos";
}

/** Determina a qué módulo pertenece una ruta (para el sidebar). */
export function moduleForPath(pathname: string): Module {
  if (pathname.startsWith("/mantencion")) return "MANTENCION";
  if (pathname.startsWith("/operacion")) return "OPERACION";
  return "COMERCIAL";
}
