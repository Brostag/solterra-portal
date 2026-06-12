"use client";

import { useState } from "react";
import {
  Activity, Ban, ChevronsDown, Download, LogIn, Pencil, Plus, Upload, UserX,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const PAGE_SIZE = 25;
// El módulo es metadato, no estado: un solo tono neutro para todos.
const MODULO_BADGE = "bg-gray-100 text-gray-600 border border-gray-200";

export interface AuditLogItem {
  id: string;
  created_at: string; // ISO
  user_nombre: string;
  modulo: string;
  accion: string;
  detalle: string | null;
}

// Icono circular por acción: heurística de presentación sobre el string
// `accion` (los datos de auditoría no se tocan).
function accionIcon(accion: string) {
  const a = accion.toLowerCase();
  if (a.includes("anul") || a.includes("elimin")) return { Icon: Ban, cls: "bg-red-50 text-red-500" };
  if (a.includes("cre") || a.includes("regist")) return { Icon: Plus, cls: "bg-green-50 text-green-600" };
  if (a.includes("edit") || a.includes("modif") || a.includes("cambi")) return { Icon: Pencil, cls: "bg-blue-50 text-blue-600" };
  if (a.includes("desactiv")) return { Icon: UserX, cls: "bg-gray-100 text-gray-500" };
  if (a.includes("sesi")) return { Icon: LogIn, cls: "bg-gray-100 text-gray-500" };
  if (a.includes("descarg") || a.includes("pdf")) return { Icon: Download, cls: "bg-[#253158]/10 text-[#253158]" };
  if (a.includes("subi") || a.includes("carg")) return { Icon: Upload, cls: "bg-[#253158]/10 text-[#253158]" };
  return { Icon: Activity, cls: "bg-[#253158]/10 text-[#253158]" };
}

function groupByDay(logs: AuditLogItem[]): [string, AuditLogItem[]][] {
  const hoy = new Date().toDateString();
  const ayer = new Date(Date.now() - 864e5).toDateString();
  const groups = new Map<string, AuditLogItem[]>();
  for (const log of logs) {
    const d = new Date(log.created_at).toDateString();
    const key = d === hoy ? "Hoy" : d === ayer ? "Ayer" : new Date(log.created_at).toLocaleDateString("es-CL");
    const arr = groups.get(key);
    if (arr) arr.push(log);
    else groups.set(key, [log]);
  }
  return [...groups.entries()];
}

function horaCorta(iso: string): string {
  return new Date(iso).toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" });
}

export default function AuditoriaFeed({ logs }: { logs: AuditLogItem[] }) {
  // Render incremental de a 25 sobre los registros ya cargados (take: 200 en
  // el servidor): sin cambios de backend.
  const [visible, setVisible] = useState(PAGE_SIZE);
  const shown = logs.slice(0, visible);
  const groups = groupByDay(shown);

  return (
    <div className="space-y-5">
      {groups.map(([dia, items]) => (
        <section key={dia} className="space-y-2">
          <h3 className="flex items-center gap-3 text-[11px] font-bold uppercase tracking-widest text-gray-400 after:h-px after:flex-1 after:bg-gray-200">
            {dia}
          </h3>
          <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
            {items.map((log) => {
              const { Icon, cls } = accionIcon(log.accion);
              return (
                <div key={log.id} className="flex items-start gap-3 px-4 py-3">
                  <span className={`h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0 ${cls}`}>
                    <Icon className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-gray-700 break-words">
                      <span className="font-semibold text-gray-800">{log.user_nombre}</span>
                      {" · "}
                      {log.accion}
                      {log.detalle && (
                        <>
                          {" — "}
                          <span className="font-mono text-[13px] text-[#253158]">{log.detalle}</span>
                        </>
                      )}
                    </p>
                    <span className={`mt-1 inline-block text-[10px] font-semibold px-2 py-0.5 rounded-md ${MODULO_BADGE}`}>
                      {log.modulo}
                    </span>
                  </div>
                  <span
                    className="text-xs text-gray-400 flex-shrink-0 tabular-nums"
                    title={new Date(log.created_at).toLocaleString("es-CL")}
                  >
                    {horaCorta(log.created_at)}
                  </span>
                </div>
              );
            })}
          </div>
        </section>
      ))}

      {visible < logs.length && (
        <div className="flex justify-center">
          <Button
            type="button"
            variant="outline"
            className="gap-2 text-[#253158]"
            onClick={() => setVisible(visible + PAGE_SIZE)}
          >
            <ChevronsDown className="h-4 w-4" />
            Cargar más
          </Button>
        </div>
      )}
    </div>
  );
}
