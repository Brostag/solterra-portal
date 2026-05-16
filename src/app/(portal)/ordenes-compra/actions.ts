"use server";

import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { getSession } from "@/lib/auth/session";
import { logAudit } from "@/lib/audit";
import { calculateOCTotals } from "@/lib/currency";
import { purchaseOrderSchema, annulOCSchema, type PurchaseOrderData } from "@/lib/validations/purchase-order";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
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
  const last = await prisma.purchaseOrder.findFirst({
    orderBy: { created_at: "desc" },
    select: { numero: true },
  });
  if (!last) return "OC-0001";
  const match = last.numero.match(/(\d+)$/);
  const next = match ? parseInt(match[1]) + 1 : 1;
  return `OC-${String(next).padStart(4, "0")}`;
}

// ── Create ───────────────────────────────────────────────────────────────────

export async function createPurchaseOrder(rawData: PurchaseOrderData): Promise<{ id: string }> {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.rol === "USUARIO") throw new Error("Sin permisos para crear órdenes de compra");

  const validated = purchaseOrderSchema.parse(rawData);

  const config = await prisma.companySettings.findFirst({ select: { iva_porcentaje: true } });
  const ivaPercent = config ? Number(config.iva_porcentaje) : 19;

  const totals = calculateOCTotals(validated.items, validated.descuento_pct, ivaPercent);

  const numero = await getNextOCNumber();

  let oc: { id: string };
  try {
    oc = await prisma.purchaseOrder.create({
      data: {
        numero,
        proveedor_id: validated.proveedor_id,
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
  return { id: oc.id };
}

// ── Update ───────────────────────────────────────────────────────────────────

export async function updatePurchaseOrder(id: string, rawData: PurchaseOrderData): Promise<void> {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.rol === "USUARIO") throw new Error("Sin permisos");

  const oc = await prisma.purchaseOrder.findUnique({ where: { id }, select: { estado: true, numero: true } });
  if (!oc) throw new Error("OC no encontrada");

  if (oc.estado !== "BORRADOR" && session.rol !== "ADMINISTRADOR") {
    throw new Error("Solo se puede editar una OC en estado BORRADOR");
  }

  const validated = purchaseOrderSchema.parse(rawData);

  const config = await prisma.companySettings.findFirst({ select: { iva_porcentaje: true } });
  const ivaPercent = config ? Number(config.iva_porcentaje) : 19;
  const totals = calculateOCTotals(validated.items, validated.descuento_pct, ivaPercent);

  await prisma.$transaction(async (tx) => {
    await tx.purchaseOrderItem.deleteMany({ where: { orden_compra_id: id } });
    await tx.purchaseOrder.update({
      where: { id },
      data: {
        proveedor_id: validated.proveedor_id,
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
}

// ── Change status ────────────────────────────────────────────────────────────

export async function changeOrderStatus(id: string, newStatus: EstadoOC): Promise<void> {
  const session = await getSession();
  if (!session) redirect("/login");

  const oc = await prisma.purchaseOrder.findUnique({ where: { id }, select: { estado: true, numero: true } });
  if (!oc) throw new Error("OC no encontrada");

  if (!canTransition(oc.estado, newStatus, session.rol)) {
    throw new Error(`No tienes permisos para pasar de ${oc.estado} a ${newStatus}`);
  }

  await prisma.purchaseOrder.update({ where: { id }, data: { estado: newStatus } });
  await logAudit(session.id, `oc_${newStatus.toLowerCase()}`, "ordenes-compra", `Nº ${oc.numero}`);
  revalidatePath(`/ordenes-compra/${id}`);
  revalidatePath("/ordenes-compra");
}

// ── Annul ────────────────────────────────────────────────────────────────────

export async function annulOrder(id: string, motivo: string): Promise<void> {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.rol !== "ADMINISTRADOR") throw new Error("Solo el administrador puede anular OCs");

  const { motivo_anulacion } = annulOCSchema.parse({ motivo_anulacion: motivo });

  const oc = await prisma.purchaseOrder.findUnique({ where: { id }, select: { estado: true, numero: true } });
  if (!oc || oc.estado === "ANULADA") return;

  await prisma.purchaseOrder.update({ where: { id }, data: { estado: "ANULADA", motivo_anulacion } });
  await logAudit(session.id, "oc_anulada", "ordenes-compra", `Nº ${oc.numero} | Motivo: ${motivo_anulacion}`);
  revalidatePath(`/ordenes-compra/${id}`);
  revalidatePath("/ordenes-compra");
}
