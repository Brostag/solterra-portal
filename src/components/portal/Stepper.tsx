"use client";

import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface StepperProps {
  steps: string[];
  current: number; // 1-indexed
}

// Indicador de pasos puro de presentación (sin estado propio). Lo usan los
// asistentes de Empresas, Contratos y Órdenes de Compra.
export default function Stepper({ steps, current }: StepperProps) {
  return (
    <ol className="flex items-center bg-white border border-gray-200 rounded-lg px-5 py-3.5">
      {steps.map((label, i) => {
        const idx = i + 1;
        const done = idx < current;
        const active = idx === current;
        return (
          <li
            key={label}
            className={cn(
              "flex items-center gap-2 sm:gap-3 min-w-0 [&+&]:pl-2 sm:[&+&]:pl-4",
              // En móvil los pasos inactivos colapsan a su círculo para que el
              // nombre del paso activo se lea completo.
              active ? "flex-1" : "flex-none sm:flex-1"
            )}
          >
            {i > 0 && (
              <span
                className={cn(
                  "h-0.5 rounded-full mr-2 sm:mr-4 w-4 flex-none sm:w-auto sm:flex-1",
                  done || active ? "bg-[#253158]" : "bg-gray-200"
                )}
              />
            )}
            <span
              className={cn(
                "flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 text-[13px] font-bold",
                done || active
                  ? "bg-[#253158] border-[#253158] text-white"
                  : "bg-white border-gray-300 text-gray-400"
              )}
            >
              {done ? <Check className="h-4 w-4" /> : idx}
            </span>
            <span
              className={cn(
                "text-[13px] font-medium truncate",
                active || done ? "text-gray-800 font-semibold" : "text-gray-400",
                !active && "max-sm:hidden"
              )}
            >
              {label}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
