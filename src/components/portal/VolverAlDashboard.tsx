import { ChevronLeft } from "lucide-react";
import InstantLink from "@/components/portal/InstantLink";

/**
 * Link "Volver al Dashboard" para las páginas de lista del módulo Comercial.
 * Replica el patrón "Volver a Mantención / Operación" de los módulos
 * operativos, usando InstantLink (convención de navegación interna del portal).
 */
export default function VolverAlDashboard() {
  return (
    <InstantLink
      href="/dashboard"
      className="inline-flex items-center gap-1.5 text-sm text-gray-500 transition hover:text-[#253158]"
    >
      <ChevronLeft className="h-4 w-4" /> Volver al Dashboard
    </InstantLink>
  );
}
