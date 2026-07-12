import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowRight, type LucideIcon } from "lucide-react";

interface KpiCardProps {
  icon: LucideIcon;
  value: number | string;
  label: ReactNode;
  /** Línea meta opcional, ej. "0 borrador · 0 vigentes" (solo Comercial). */
  sub?: string;
  href?: string;
  /** Flecha a la derecha (Comercial). */
  showArrow?: boolean;
  /** "operativo": etiqueta 11px gris y hover de borde suave (Mantención/Operación). */
  variant?: "comercial" | "operativo";
}

/**
 * KPI card compacta horizontal compartida por los 3 dashboards:
 * icono a la izquierda, cifra + etiqueta a la derecha (~60–72px de alto).
 */
export default function KpiCard({
  icon: Icon,
  value,
  label,
  sub,
  href,
  showArrow,
  variant = "comercial",
}: KpiCardProps) {
  const esOperativo = variant === "operativo";
  const inner = (
    <>
      <span className="inline-flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-[#253158]/10 text-[#253158]">
        <Icon className="h-[18px] w-[18px]" />
      </span>
      <span className="flex min-w-0 flex-col gap-0.5">
        <span className="text-xl font-bold leading-none text-[#253158] tabular-nums">
          {value}
        </span>
        <span
          className={
            esOperativo
              ? "text-[11px] leading-tight text-gray-500"
              : "text-[13px] font-semibold leading-tight text-gray-700"
          }
        >
          {label}
        </span>
        {sub && <span className="text-[11px] leading-tight text-gray-400">{sub}</span>}
      </span>
      {showArrow && (
        <ArrowRight className="ml-auto h-4 w-4 flex-shrink-0 text-gray-300 transition-all group-hover:translate-x-0.5 group-hover:text-[#253158]" />
      )}
    </>
  );
  const base =
    "group flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-4 transition-all duration-200";
  const hover = esOperativo
    ? "hover:border-[#253158]/30 hover:shadow-md"
    : "hover:border-[#253158] hover:shadow-md";
  return href ? (
    <Link href={href} className={`${base} ${hover}`}>
      {inner}
    </Link>
  ) : (
    <div className={base}>{inner}</div>
  );
}
