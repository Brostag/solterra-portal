"use server";

import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { getSession } from "@/lib/auth/session";
import { requireModule } from "@/lib/modules";
import { logAudit } from "@/lib/audit";
import { revalidateTag } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { COMPANY_SETTINGS_TAG } from "@/lib/company-settings";

const gastosDefaultSchema = z
  .array(
    z.object({
      id:    z.string().min(1).max(40),
      label: z.string().trim().min(1).max(60),
      monto: z.number().min(0),
    })
  )
  .max(30);

/**
 * Guarda la lista de gastos generales del cotizador como default de la empresa.
 * Solo ADMINISTRADOR/SUPERVISOR del módulo COMERCIAL. Persiste en la columna
 * `cotizador_gastos_default` del único registro de CompanySettings.
 */
export async function saveCotizadorGastosDefault(gastos: unknown): Promise<void> {
  const session = await getSession();
  if (!session) redirect("/login");
  requireModule(session, "COMERCIAL");
  if (session.rol !== "ADMINISTRADOR" && session.rol !== "SUPERVISOR") {
    throw new Error("Sin permisos para guardar los gastos por defecto.");
  }

  const data = gastosDefaultSchema.parse(gastos);

  const existing = await prisma.companySettings.findFirst({ select: { id: true } });
  if (!existing) {
    throw new Error(
      "No hay configuración de empresa registrada. Completa la configuración antes de guardar gastos."
    );
  }

  await prisma.companySettings.update({
    where: { id: existing.id },
    data: { cotizador_gastos_default: data as unknown as Prisma.InputJsonValue },
  });

  // Obligatorio: la página del cotizador lee estos defaults desde el mismo
  // cache (revalidate 300s). Sin esto, quedarían stale hasta 5 minutos.
  revalidateTag(COMPANY_SETTINGS_TAG);

  await logAudit(
    session.id,
    "configuracion_modificada",
    "configuracion",
    `Gastos generales del cotizador actualizados (${data.length} ${data.length === 1 ? "ítem" : "ítems"})`
  );
}
