"use server";

import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { getSession } from "@/lib/auth/session";
import { logAudit } from "@/lib/audit";
import { calculateInvoiceTotals } from "@/lib/currency";
import { invoiceSchema, annulSchema } from "@/lib/validations/invoice";
import { validateInvoicePreflight } from "@/lib/validations/invoice-preflight";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

async function getNextInvoiceNumber(): Promise<string> {
  const last = await prisma.invoice.findFirst({
    orderBy: { created_at: "desc" },
    select: { numero_factura: true },
  });
  if (!last) return "F-0001";
  const match = last.numero_factura.match(/(\d+)$/);
  const next = match ? parseInt(match[1]) + 1 : 1;
  return `F-${String(next).padStart(4, "0")}`;
}

export async function createInvoice(rawData: {
  client_id: string;
  moneda: string;
  tipo_cambio: number;
  items: { product_id?: string; descripcion: string; cantidad: number; precio_unitario: number }[];
}): Promise<{ id: string }> {
  const session = await getSession();
  if (!session) redirect("/login");

  const validated = invoiceSchema.parse(rawData);

  const config = await prisma.companySettings.findFirst({
    select: { iva_porcentaje: true },
  });
  const ivaPercent = config ? Number(config.iva_porcentaje) : 19;

  const totals = calculateInvoiceTotals(validated.items, ivaPercent);

  const preflight = await validateInvoicePreflight({
    client_id: validated.client_id,
    moneda: validated.moneda as "CLP" | "USD" | "UF",
    tipo_cambio: validated.tipo_cambio,
    items: validated.items,
  });
  if (!preflight.ok) {
    throw new Error(preflight.errors.join("\n"));
  }

  const numero = await getNextInvoiceNumber();

  let invoice: Awaited<ReturnType<typeof prisma.invoice.create>>;
  try {
    invoice = await prisma.invoice.create({
      data: {
        numero_factura: numero,
        client_id: validated.client_id,
        user_id: session.id,
        moneda: validated.moneda as "CLP" | "USD" | "UF",
        tipo_cambio: validated.tipo_cambio,
        fecha_tipo_cambio: new Date(),
        subtotal: totals.subtotal,
        iva: totals.iva,
        total: totals.total,
        items: {
          create: validated.items.map((item) => ({
            product_id: item.product_id || null,
            descripcion: item.descripcion,
            cantidad: item.cantidad,
            precio_unitario: item.precio_unitario,
            subtotal: item.cantidad * item.precio_unitario,
          })),
        },
      },
    });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      throw new Error("Número de factura en conflicto, intenta de nuevo.");
    }
    throw err;
  }

  await logAudit(
    session.id,
    "factura_creada",
    "facturas",
    `Nº ${numero} | Total: ${totals.total}`
  );

  revalidatePath("/facturas");
  return { id: invoice.id };
}

export async function updateInvoiceStatus(
  invoiceId: string,
  newStatus: "ENVIADA" | "PAGADA"
) {
  const session = await getSession();
  if (!session) redirect("/login");

  if (newStatus === "PAGADA" && session.rol === "USUARIO") {
    throw new Error("Sin permisos para marcar como pagada");
  }

  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    select: { estado: true, numero_factura: true },
  });
  if (!invoice) return;

  const allowed: Record<string, string[]> = {
    CREADA: ["ENVIADA", "PAGADA"],
    ENVIADA: ["PAGADA"],
  };
  if (!allowed[invoice.estado]?.includes(newStatus)) return;

  await prisma.invoice.update({
    where: { id: invoiceId },
    data: { estado: newStatus },
  });

  await logAudit(
    session.id,
    `factura_${newStatus.toLowerCase()}`,
    "facturas",
    `Nº ${invoice.numero_factura}`
  );

  revalidatePath(`/facturas/${invoiceId}`);
  revalidatePath("/facturas");
}

export async function annulInvoice(invoiceId: string, formData: FormData) {
  const session = await getSession();
  if (!session) redirect("/login");

  if (session.rol === "USUARIO") {
    throw new Error("Sin permisos para anular facturas");
  }

  const { motivo_anulacion } = annulSchema.parse({
    motivo_anulacion: formData.get("motivo_anulacion"),
  });

  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    select: { estado: true, numero_factura: true },
  });
  if (!invoice || invoice.estado === "ANULADA") return;

  await prisma.invoice.update({
    where: { id: invoiceId },
    data: { estado: "ANULADA", motivo_anulacion },
  });

  await logAudit(
    session.id,
    "factura_anulada",
    "facturas",
    `Nº ${invoice.numero_factura} | Motivo: ${motivo_anulacion}`
  );

  revalidatePath(`/facturas/${invoiceId}`);
  revalidatePath("/facturas");
}
