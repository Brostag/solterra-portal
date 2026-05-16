"use server";

import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth/session";
import { logAudit } from "@/lib/audit";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

const configSchema = z.object({
  razon_social: z.string().min(2),
  rut: z.string().min(2),
  giro: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  telefono: z.string().optional(),
  direccion: z.string().optional(),
  logo_url: z.string().url().nullable().optional().or(z.literal("")),
  moneda_principal: z.enum(["CLP", "USD", "UF"]),
  iva_porcentaje: z.coerce.number().min(0).max(100),
});

export async function saveConfig(formData: FormData) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.rol !== "ADMINISTRADOR") redirect("/dashboard");

  const data = configSchema.parse({
    razon_social: formData.get("razon_social"),
    rut: formData.get("rut"),
    giro: formData.get("giro") || undefined,
    email: formData.get("email") || undefined,
    telefono: formData.get("telefono") || undefined,
    direccion: formData.get("direccion") || undefined,
    logo_url: (formData.get("logo_url") as string) || null,
    moneda_principal: formData.get("moneda_principal"),
    iva_porcentaje: formData.get("iva_porcentaje"),
  });

  const existing = await prisma.companySettings.findFirst();

  if (existing) {
    await prisma.companySettings.update({ where: { id: existing.id }, data });
  } else {
    await prisma.companySettings.create({ data });
  }

  await logAudit(session.id, "configuracion_modificada", "configuracion");
  redirect("/configuracion?guardado=1");
}
