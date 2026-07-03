"use server";

import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth/session";
import { requireModule } from "@/lib/modules";
import { logAudit } from "@/lib/audit";
import { supplierSchema } from "@/lib/validations/supplier";
import { revalidatePath, revalidateTag } from "next/cache";
import { redirect } from "next/navigation";
import { ACTIVE_SUPPLIERS_TAG, SUPPLIER_COUNTS_TAG } from "@/lib/cache/master-lists";

export async function createSupplier(formData: FormData) {
  const session = await getSession();
  if (!session) redirect("/login");
  requireModule(session, "COMERCIAL");
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
  revalidateTag(ACTIVE_SUPPLIERS_TAG);
  revalidateTag(SUPPLIER_COUNTS_TAG);
  redirect("/proveedores");
}

export async function updateSupplier(id: string, formData: FormData) {
  const session = await getSession();
  if (!session) redirect("/login");
  requireModule(session, "COMERCIAL");
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
  revalidateTag(ACTIVE_SUPPLIERS_TAG);
  redirect(`/proveedores/${id}`);
}

export async function deactivateSupplier(id: string) {
  const session = await getSession();
  if (!session) redirect("/login");
  requireModule(session, "COMERCIAL");
  if (session.rol !== "ADMINISTRADOR") throw new Error("Solo el Administrador puede desactivar proveedores");

  const supplier = await prisma.supplier.findUnique({ where: { id }, select: { nombre: true } });
  if (!supplier) return;

  await prisma.supplier.update({ where: { id }, data: { activo: false } });
  await logAudit(session.id, "proveedor_desactivado", "proveedores", `ID: ${id} Nombre: ${supplier.nombre}`);

  revalidatePath("/proveedores");
  revalidateTag(ACTIVE_SUPPLIERS_TAG);
  revalidateTag(SUPPLIER_COUNTS_TAG);
}
