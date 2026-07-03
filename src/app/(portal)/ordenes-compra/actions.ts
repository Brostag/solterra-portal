"use server";

import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { getSession } from "@/lib/auth/session";
import { requireModule } from "@/lib/modules";
import { logAudit } from "@/lib/audit";
import { calculateOCTotals } from "@/lib/currency";
import { purchaseOrderSchema, annulOCSchema, type PurchaseOrderData } from "@/lib/validations/purchase-order";
import { revalidatePath, revalidateTag } from "next/cache";
import { redirect } from "next/navigation";
import { getCompanySettings } from "@/lib/company-settings";
import { DASHBOARD_STATS_TAG } from "@/app/(portal)/dashboard/page";
import type { EstadoOC } from "@/types";

// ── Allowed state transitions by minimum role ────────────────────────────────

type Transition = { to: EstadoOC; minRol: "SUPERVISOR" | "ADMINISTRADOR" };

const TRANSITIONS: Record<string, Transition[]> = {
  BORRADOR:  [{ to: "EMITIDA",   minRol: "SUPERVISOR" }],
  EMITIDA:   [{ to: "ENVIADA",   minRol: "SUPERVISOR" }],
  ENVIADA:   [{ to: "APROBADA",  minRol: "ADMINISTRADOR" },
              { to: "RECHAZADA", minRol: "ADMINISTRADOR" }],
  APROBADA:  [],
  RECHAZADA: [],
  ANULADA:   [],
};

function canTransition(from: string, to: EstadoOC, rol: string): boolean {
  const t = TRANSITIONS[from]?.find((t) => t.to === to);
  if (!t) return false;
  if (t.minRol === "ADMINISTRADOR") return rol === "ADMINISTRADOR";
  return rol === "SUPERVISOR" || rol === "ADMINISTRADOR";
}

// ── OC number generation ─────────────────────────────────────────────────────

async function getNextOCNumber(): Promise<string> {
  // TODO: si el sistema supera OC-9999, migrar a correlativo numérico o secuencia de BD
  const last = await prisma.purchaseOrder.findFirst({
    orderBy: { numero: "desc" },
    select: { numero: true },
  });
  if (!last) return "OC-0001";
  const match = last.numero.match(/(\d+)$/);
  const next = match ? parseInt(match[1]) + 1 : 1;
  return `OC-${String(next).padStart(4, "0")}`;
}

// ── Compat-mapping Proveedor (Empresa → Supplier) ────────────────────────────

function normalizeRut(rut: string | null | undefined): string | null {
  if (!rut) return null;
  const n = rut.toLowerCase().replace(/[^0-9k]/g, "");
  return n || null;
}

// PurchaseOrder.proveedor_id es FK a Supplier, pero la fuente oficial es Company.
// Resuelve el Supplier vinculado a la empresa; si no existe, lo vincula por RUT
// o crea uno de compatibilidad. Nunca duplica por RUT.
async function resolveCompatSupplierId(empresa: {
  id: string;
  nombre_razon_social: string;
  rut: string | null;
  giro: string | null;
  email: string | null;
  telefono: string | null;
  direccion: string | null;
  ciudad: string | null;
  contacto_nombre: string | null;
}): Promise<string> {
  const linked = await prisma.supplier.findFirst({
    where: { company_id: empresa.id },
    select: { id: true },
  });
  if (linked) return linked.id;

  const norm = normalizeRut(empresa.rut);
  if (norm) {
    const candidates = await prisma.supplier.findMany({
      where: { rut: { not: null } },
      select: { id: true, rut: true },
    });
    const match = candidates.find((s) => normalizeRut(s.rut) === norm);
    if (match) {
      await prisma.supplier.update({
        where: { id: match.id },
        data: { company_id: empresa.id },
      });
      return match.id;
    }
  }

  const created = await prisma.supplier.create({
    data: {
      nombre: empresa.nombre_razon_social,
      rut: empresa.rut,
      giro: empresa.giro,
      email: empresa.email,
      telefono: empresa.telefono,
      direccion: empresa.direccion,
      ciudad: empresa.ciudad,
      contacto: empresa.contacto_nombre,
      activo: true,
      company_id: empresa.id,
    },
    select: { id: true },
  });
  return created.id;
}

// Acepta el id elegido en el selector: si es una Empresa (Company), resuelve su
// Supplier de compatibilidad; si ya es un Supplier id (p. ej. edición), lo
// devuelve tal cual. Company y Supplier no comparten id, así que distinguir por
// tabla es seguro.
async function resolveSupplierIdFromSelection(selectionId: string): Promise<string> {
  const empresa = await prisma.company.findUnique({
    where: { id: selectionId },
    select: {
      id: true,
      nombre_razon_social: true,
      rut: true,
      giro: true,
      email: true,
      telefono: true,
      direccion: true,
      ciudad: true,
      contacto_nombre: true,
    },
  });
  if (empresa) return resolveCompatSupplierId(empresa);

  const existing = await prisma.supplier.findUnique({
    where: { id: selectionId },
    select: { id: true },
  });
  if (existing) return existing.id;

  throw new Error("El proveedor seleccionado no existe.");
}

// ── Create ───────────────────────────────────────────────────────────────────

export async function createPurchaseOrder(rawData: PurchaseOrderData): Promise<{ id: string }> {
  const session = await getSession();
  if (!session) redirect("/login");
  requireModule(session, "COMERCIAL");
  if (session.rol === "USUARIO") throw new Error("Sin permisos para crear órdenes de compra");

  const validated = purchaseOrderSchema.parse(rawData);

  const config = await getCompanySettings();
  const ivaPercent = config ? Number(config.iva_porcentaje) : 19;

  const totals = calculateOCTotals(validated.items, validated.descuento_pct, ivaPercent);

  const numero = await getNextOCNumber();

  let oc: { id: string };
  try {
    oc = await prisma.purchaseOrder.create({
      data: {
        numero,
        proveedor_id: await resolveSupplierIdFromSelection(validated.proveedor_id),
        creado_por: session.id,
        fecha_envio: validated.fecha_envio ? new Date(validated.fecha_envio) : null,
        moneda: validated.moneda as "CLP" | "USD",
        tipo_cambio: validated.tipo_cambio ?? null,
        condiciones_pago: validated.condiciones_pago ?? null,
        observaciones: validated.observaciones ?? null,
        subtotal: totals.subtotal,
        descuento_pct: validated.descuento_pct,
        descuento_monto: totals.descuento_monto,
        neto: totals.neto,
        iva_monto: totals.iva_monto,
        total: totals.total,
        items: {
          create: validated.items.map((item, idx) => ({
            producto_id: item.producto_id ?? null,
            descripcion: item.descripcion,
            cantidad: item.cantidad,
            valor_unitario: item.valor_unitario,
            total: Math.round(item.cantidad * item.valor_unitario * 100) / 100,
            orden: idx,
          })),
        },
      },
      select: { id: true },
    });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      throw new Error("Número de OC en conflicto, intenta de nuevo.");
    }
    throw err;
  }

  await logAudit(session.id, "oc_creada", "ordenes-compra", `Nº ${numero} | Total: ${totals.total}`);
  revalidatePath("/ordenes-compra");
  revalidateTag(DASHBOARD_STATS_TAG);
  return { id: oc.id };
}

// ── Update ───────────────────────────────────────────────────────────────────

export async function updatePurchaseOrder(id: string, rawData: PurchaseOrderData): Promise<void> {
  const session = await getSession();
  if (!session) redirect("/login");
  requireModule(session, "COMERCIAL");
  if (session.rol === "USUARIO") throw new Error("Sin permisos");

  const oc = await prisma.purchaseOrder.findUnique({ where: { id }, select: { estado: true, numero: true } });
  if (!oc) throw new Error("OC no encontrada");

  if (oc.estado !== "BORRADOR" && session.rol !== "ADMINISTRADOR") {
    throw new Error("Solo se puede editar una OC en estado BORRADOR");
  }

  const validated = purchaseOrderSchema.parse(rawData);

  const config = await getCompanySettings();
  const ivaPercent = config ? Number(config.iva_porcentaje) : 19;
  const totals = calculateOCTotals(validated.items, validated.descuento_pct, ivaPercent);

  await prisma.$transaction(async (tx) => {
    await tx.purchaseOrderItem.deleteMany({ where: { orden_compra_id: id } });
    await tx.purchaseOrder.update({
      where: { id },
      data: {
        proveedor_id: await resolveSupplierIdFromSelection(validated.proveedor_id),
        fecha_envio: validated.fecha_envio ? new Date(validated.fecha_envio) : null,
        moneda: validated.moneda as "CLP" | "USD",
        tipo_cambio: validated.tipo_cambio ?? null,
        condiciones_pago: validated.condiciones_pago ?? null,
        observaciones: validated.observaciones ?? null,
        subtotal: totals.subtotal,
        descuento_pct: validated.descuento_pct,
        descuento_monto: totals.descuento_monto,
        neto: totals.neto,
        iva_monto: totals.iva_monto,
        total: totals.total,
        items: {
          create: validated.items.map((item, idx) => ({
            producto_id: item.producto_id ?? null,
            descripcion: item.descripcion,
            cantidad: item.cantidad,
            valor_unitario: item.valor_unitario,
            total: Math.round(item.cantidad * item.valor_unitario * 100) / 100,
            orden: idx,
          })),
        },
      },
    });
  });

  await logAudit(session.id, "oc_editada", "ordenes-compra", `Nº ${oc.numero}`);
  revalidatePath(`/ordenes-compra/${id}`);
  revalidatePath("/ordenes-compra");
  revalidateTag(DASHBOARD_STATS_TAG);
}

// ── Change status ────────────────────────────────────────────────────────────

export async function changeOrderStatus(id: string, newStatus: EstadoOC): Promise<void> {
  const session = await getSession();
  if (!session) redirect("/login");
  requireModule(session, "COMERCIAL");

  const oc = await prisma.purchaseOrder.findUnique({ where: { id }, select: { estado: true, numero: true } });
  if (!oc) throw new Error("OC no encontrada");

  if (!canTransition(oc.estado, newStatus, session.rol)) {
    throw new Error(`No tienes permisos para pasar de ${oc.estado} a ${newStatus}`);
  }

  await prisma.purchaseOrder.update({ where: { id }, data: { estado: newStatus } });
  await logAudit(session.id, `oc_${newStatus.toLowerCase()}`, "ordenes-compra", `Nº ${oc.numero}`);
  revalidatePath(`/ordenes-compra/${id}`);
  revalidatePath("/ordenes-compra");
  revalidateTag(DASHBOARD_STATS_TAG);
}

// ── Annul ────────────────────────────────────────────────────────────────────

export async function annulOrder(id: string, motivo: string): Promise<void> {
  const session = await getSession();
  if (!session) redirect("/login");
  requireModule(session, "COMERCIAL");
  if (session.rol !== "ADMINISTRADOR") throw new Error("Solo el administrador puede anular OCs");

  const { motivo_anulacion } = annulOCSchema.parse({ motivo_anulacion: motivo });

  const oc = await prisma.purchaseOrder.findUnique({ where: { id }, select: { estado: true, numero: true } });
  if (!oc || oc.estado === "ANULADA") return;

  await prisma.purchaseOrder.update({ where: { id }, data: { estado: "ANULADA", motivo_anulacion } });
  await logAudit(session.id, "oc_anulada", "ordenes-compra", `Nº ${oc.numero} | Motivo: ${motivo_anulacion}`);
  revalidatePath(`/ordenes-compra/${id}`);
  revalidatePath("/ordenes-compra");
  revalidateTag(DASHBOARD_STATS_TAG);
}
