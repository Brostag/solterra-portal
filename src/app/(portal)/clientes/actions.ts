"use server";

import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth/session";
import { logAudit } from "@/lib/audit";
import { clientSchema } from "@/lib/validations/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function createClient(formData: FormData) {
  const session = await getSession();
  if (!session) redirect("/login");

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
  redirect("/clientes");
}

export async function updateClient(id: string, formData: FormData) {
  const session = await getSession();
  if (!session) redirect("/login");

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
  redirect("/clientes");
}

export async function deactivateClient(id: string) {
  const session = await getSession();
  if (!session) redirect("/login");

  await prisma.client.update({
    where: { id },
    data: { activo: false },
  });
  await logAudit(session.id, "cliente_desactivado", "clientes", `ID: ${id}`);

  revalidatePath("/clientes");
}
