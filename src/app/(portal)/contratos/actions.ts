"use server";

import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { getSession } from "@/lib/auth/session";
import { logAudit } from "@/lib/audit";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

const equipoSchema = z.object({
  descripcion: z.string().trim().min(1, "Cada equipo necesita una descripción."),
  marca: z.string().trim().optional().nullable(),
  modelo: z.string().trim().optional().nullable(),
  patente: z.string().trim().optional().nullable(),
  anio: z.number().int().min(1900).max(2100).optional().nullable(),
  chasis: z.string().trim().optional().nullable(),
  motor: z.string().trim().optional().nullable(),
  color: z.string().trim().optional().nullable(),
  valor_hora: z.number().min(0, "El valor hora no puede ser negativo."),
  horas_minimas_mensuales: z.number().int().min(0).optional().nullable(),
  valor_mensual_estimado: z.number().min(0).optional().nullable(),
  observaciones: z.string().trim().optional().nullable(),
});

const contractSchema = z.object({
  client_id: z.string().min(1, "Selecciona un cliente."),
  fecha_inicio: z.string().min(1, "La fecha de inicio es obligatoria."),
  fecha_termino: z.string().optional().nullable(),
  duracion_meses: z.number().int().min(1).optional().nullable(),
  lugar_operacion: z.string().trim().optional().nullable(),
  forma_pago: z.string().trim().optional().nullable(),
  observaciones: z.string().trim().optional().nullable(),
  equipos: z.array(equipoSchema).min(1, "Agrega al menos un equipo."),
});

export type CreateContractInput = z.infer<typeof contractSchema>;

async function getNextContractNumber(): Promise<string> {
  const last = await prisma.contract.findFirst({
    orderBy: { numero_contrato: "desc" },
    select: { numero_contrato: true },
  });
  if (!last) return "CTR-0001";
  const match = last.numero_contrato.match(/(\d+)$/);
  const next = match ? parseInt(match[1], 10) + 1 : 1;
  return `CTR-${String(next).padStart(4, "0")}`;
}

export async function createContract(
  rawData: CreateContractInput
): Promise<{ id: string }> {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.rol !== "ADMINISTRADOR" && session.rol !== "SUPERVISOR") {
    throw new Error("Sin permisos para crear contratos.");
  }

  const data = contractSchema.parse(rawData);

  // Snapshot del cliente con datos frescos del servidor (no se confía en el cliente).
  const cliente = await prisma.client.findUnique({
    where: { id: data.client_id },
    select: { nombre: true, rut: true, direccion: true, email: true, telefono: true },
  });
  if (!cliente) {
    throw new Error("El cliente seleccionado no existe.");
  }

  // Se ancla al mediodía local para que el input date (YYYY-MM-DD) no retroceda
  // un día al convertirse a UTC en zonas horarias negativas (Chile, GMT-4).
  const fechaInicio = new Date(`${data.fecha_inicio}T12:00:00`);
  if (Number.isNaN(fechaInicio.getTime())) {
    throw new Error("La fecha de inicio no es válida.");
  }
  const fechaTermino = data.fecha_termino ? new Date(`${data.fecha_termino}T12:00:00`) : null;
  if (fechaTermino && Number.isNaN(fechaTermino.getTime())) {
    throw new Error("La fecha de término no es válida.");
  }
  if (fechaTermino && fechaTermino < fechaInicio) {
    throw new Error("La fecha de término no puede ser anterior a la de inicio.");
  }

  const numero = await getNextContractNumber();

  let contract: { id: string };
  try {
    contract = await prisma.contract.create({
      data: {
        numero_contrato: numero,
        client_id: data.client_id,
        user_id: session.id,
        estado: "BORRADOR",
        fecha_inicio: fechaInicio,
        fecha_termino: fechaTermino,
        duracion_meses: data.duracion_meses ?? null,
        lugar_operacion: data.lugar_operacion || null,
        forma_pago: data.forma_pago || null,
        observaciones: data.observaciones || null,
        // Snapshot al crear (ver reporte: el modelo preveía snapshot al pasar a VIGENTE).
        cliente_snapshot_at: new Date(),
        cliente_nombre_snapshot: cliente.nombre,
        cliente_rut_snapshot: cliente.rut,
        cliente_direccion_snapshot: cliente.direccion,
        cliente_email_snapshot: cliente.email,
        cliente_telefono_snapshot: cliente.telefono,
        equipos: {
          create: data.equipos.map((eq, idx) => ({
            orden: idx + 1,
            descripcion: eq.descripcion,
            marca: eq.marca || null,
            modelo: eq.modelo || null,
            patente: eq.patente || null,
            anio: eq.anio ?? null,
            chasis: eq.chasis || null,
            motor: eq.motor || null,
            color: eq.color || null,
            valor_hora: eq.valor_hora,
            horas_minimas_mensuales: eq.horas_minimas_mensuales ?? null,
            valor_mensual_estimado: eq.valor_mensual_estimado ?? null,
            observaciones: eq.observaciones || null,
          })),
        },
      },
      select: { id: true },
    });
  } catch (err) {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2002"
    ) {
      throw new Error("Número de contrato en conflicto, intenta de nuevo.");
    }
    throw err;
  }

  await logAudit(
    session.id,
    "contrato_creado",
    "contratos",
    `Nº ${numero} | Cliente: ${cliente.nombre} | Equipos: ${data.equipos.length}`
  );

  revalidatePath("/contratos");
  return { id: contract.id };
}
