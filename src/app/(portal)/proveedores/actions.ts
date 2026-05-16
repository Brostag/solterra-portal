"use server";

import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth/session";
import { logAudit } from "@/lib/audit";
import { supplierSchema } from "@/lib/validations/supplier";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function createSupplier(formData: FormData) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.rol === "USUARIO") throw new Error("Sin permisos para crear proveedores");

  const data = supplierSchema.parse({
    nombre: formData.get("nombre"),
    rut: formData.get("rut") || undefined,
    giro: formData.get("giro") || undefined,
    direccion: formData.get("direccion") || undefined,
    ciudad: formData.get("ciudad") || undefined,
    telefono: formData.get("telefono") || undefined,
    email: formData.get("email") || undefined,
    contacto: formData.get("contacto") || undefined,
    observaciones: formData.get("observaciones") || undefined,
  });

  const supplier = await prisma.supplier.create({ data });
  await logAudit(session.id, "proveedor_creado", "proveedores", `ID: ${supplier.id} Nombre: ${supplier.nombre}`);

  revalidatePath("/proveedores");
  redirect("/proveedores");
}

export async function updateSupplier(id: string, formData: FormData) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.rol === "USUARIO") throw new Error("Sin permisos para editar proveedores");

  const data = supplierSchema.parse({
    nombre: formData.get("nombre"),
    rut: formData.get("rut") || undefined,
    giro: formData.get("giro") || undefined,
    direccion: formData.get("direccion") || undefined,
    ciudad: formData.get("ciudad") || undefined,
    telefono: formData.get("telefono") || undefined,
    email: formData.get("email") || undefined,
    contacto: formData.get("contacto") || undefined,
    observaciones: formData.get("observaciones") || undefined,
  });

  await prisma.supplier.update({ where: { id }, data });
  await logAudit(session.id, "proveedor_editado", "proveedores", `ID: ${id}`);

  revalidatePath(`/proveedores/${id}`);
  revalidatePath("/proveedores");
  redirect(`/proveedores/${id}`);
}

export async function deactivateSupplier(id: string) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.rol !== "ADMINISTRADOR") throw new Error("Solo el Administrador puede desactivar proveedores");

  const supplier = await prisma.supplier.findUnique({ where: { id }, select: { nombre: true } });
  if (!supplier) return;

  await prisma.supplier.update({ where: { id }, data: { activo: false } });
  await logAudit(session.id, "proveedor_desactivado", "proveedores", `ID: ${id} Nombre: ${supplier.nombre}`);

  revalidatePath("/proveedores");
}
