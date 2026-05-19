"use server";

import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth/session";
import { logAudit } from "@/lib/audit";
import { productSchema } from "@/lib/validations/product";
import { revalidatePath, revalidateTag } from "next/cache";
import { redirect } from "next/navigation";
import { DASHBOARD_STATS_TAG } from "@/app/(portal)/dashboard/page";
import { ACTIVE_PRODUCTS_TAG, PRODUCT_COUNTS_TAG } from "@/lib/cache/master-lists";

export async function createProduct(formData: FormData) {
  const session = await getSession();
  if (!session) redirect("/login");

  const data = productSchema.parse({
    nombre: formData.get("nombre"),
    codigo_interno: formData.get("codigo_interno") || undefined,
    descripcion: formData.get("descripcion") || undefined,
    precio_unitario: formData.get("precio_unitario"),
  });

  const product = await prisma.product.create({ data });
  await logAudit(session.id, "producto_creado", "productos", `ID: ${product.id}`);

  revalidatePath("/productos");
  revalidateTag(DASHBOARD_STATS_TAG);
  revalidateTag(ACTIVE_PRODUCTS_TAG);
  revalidateTag(PRODUCT_COUNTS_TAG);
  redirect("/productos");
}

export async function updateProduct(id: string, formData: FormData) {
  const session = await getSession();
  if (!session) redirect("/login");

  const data = productSchema.parse({
    nombre: formData.get("nombre"),
    codigo_interno: formData.get("codigo_interno") || undefined,
    descripcion: formData.get("descripcion") || undefined,
    precio_unitario: formData.get("precio_unitario"),
  });

  await prisma.product.update({ where: { id }, data });
  await logAudit(session.id, "producto_editado", "productos", `ID: ${id}`);

  revalidatePath("/productos");
  revalidateTag(DASHBOARD_STATS_TAG);
  revalidateTag(ACTIVE_PRODUCTS_TAG);
  redirect("/productos");
}

export async function deactivateProduct(id: string) {
  const session = await getSession();
  if (!session) redirect("/login");

  await prisma.product.update({ where: { id }, data: { activo: false } });
  await logAudit(session.id, "producto_desactivado", "productos", `ID: ${id}`);

  revalidatePath("/productos");
  revalidateTag(DASHBOARD_STATS_TAG);
  revalidateTag(ACTIVE_PRODUCTS_TAG);
  revalidateTag(PRODUCT_COUNTS_TAG);
}
