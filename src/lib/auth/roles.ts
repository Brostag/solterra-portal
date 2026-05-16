import type { Rol } from "@/types";

export function hasRole(userRol: Rol, required: Rol | Rol[]): boolean {
  const roles = Array.isArray(required) ? required : [required];
  return roles.includes(userRol);
}

export function isAdmin(rol: Rol): boolean {
  return rol === "ADMINISTRADOR";
}

export function canManageUsers(rol: Rol): boolean {
  return rol === "ADMINISTRADOR";
}

export function canAnnulInvoice(rol: Rol): boolean {
  return rol === "ADMINISTRADOR" || rol === "SUPERVISOR";
}
