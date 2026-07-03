"use server";

import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth/session";
import { requireModule } from "@/lib/modules";
import { logAudit } from "@/lib/audit";
import { clientSchema } from "@/lib/validations/client";
import { revalidatePath, revalidateTag } from "next/cache";
import { redirect } from "next/navigation";
import { DASHBOARD_STATS_TAG } from "@/app/(portal)/dashboard/page";
import { ACTIVE_CLIENTS_TAG, CLIENT_COUNTS_TAG } from "@/lib/cache/master-lists";

export async function createClient(formData: FormData) {
  const session = await getSession();
  if (!session) redirect("/login");
  requireModule(session, "COMERCIAL");
  if (session.rol === "USUARIO") throw new Error("Sin permisos para crear clientes");

  const data = clientSchema.parse({
    nombre: formData.get("nombre"),
    rut: formData.get("rut") || undefined,
    email: formData.get("email") || undefined,
    telefono: formData.get("telefono") || undefined,
    direccion: formData.get("direccion") || undefined,
    observaciones: formData.get("observaciones") || undefined,
  });

  const client = await prisma.client.create({ data });
  await logAudit(session.id, "cliente_creado", "clientes", `ID: ${client.id} Nombre: ${client.nombre}`);

  revalidatePath("/clientes");
  revalidateTag(DASHBOARD_STATS_TAG);
  revalidateTag(ACTIVE_CLIENTS_TAG);
  revalidateTag(CLIENT_COUNTS_TAG);
  redirect("/clientes");
}

export async function updateClient(id: string, formData: FormData) {
  const session = await getSession();
  if (!session) redirect("/login");
  requireModule(session, "COMERCIAL");
  if (session.rol === "USUARIO") throw new Error("Sin permisos para editar clientes");

  const data = clientSchema.parse({
    nombre: formData.get("nombre"),
    rut: formData.get("rut") || undefined,
    email: formData.get("email") || undefined,
    telefono: formData.get("telefono") || undefined,
    direccion: formData.get("direccion") || undefined,
    observaciones: formData.get("observaciones") || undefined,
  });

  await prisma.client.update({ where: { id }, data });
  await logAudit(session.id, "cliente_editado", "clientes", `ID: ${id}`);

  revalidatePath("/clientes");
  revalidateTag(DASHBOARD_STATS_TAG);
  revalidateTag(ACTIVE_CLIENTS_TAG);
  redirect("/clientes");
}

export async function deactivateClient(id: string) {
  const session = await getSession();
  if (!session) redirect("/login");
  requireModule(session, "COMERCIAL");
  if (session.rol !== "ADMINISTRADOR")
    throw new Error("Solo el Administrador puede desactivar clientes");

  await prisma.client.update({
    where: { id },
    data: { activo: false },
  });
  await logAudit(session.id, "cliente_desactivado", "clientes", `ID: ${id}`);

  revalidatePath("/clientes");
  revalidateTag(DASHBOARD_STATS_TAG);
  revalidateTag(ACTIVE_CLIENTS_TAG);
  revalidateTag(CLIENT_COUNTS_TAG);
}
