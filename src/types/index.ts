export type Rol = "ADMINISTRADOR" | "SUPERVISOR" | "USUARIO";

export type EstadoFactura = "CREADA" | "ENVIADA" | "PAGADA" | "ANULADA";

export type EstadoOC = "BORRADOR" | "EMITIDA" | "ENVIADA" | "APROBADA" | "RECHAZADA" | "ANULADA";

export type Moneda = "CLP" | "USD" | "UF";

export interface UserSession {
  id: string;
  email: string;
  nombre: string;
  rol: Rol;
}
