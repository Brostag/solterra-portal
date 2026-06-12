"use server";

import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { getSession } from "@/lib/auth/session";
import { logAudit } from "@/lib/audit";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { parseContractNumber } from "@/lib/contracts";

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
  tarifa_hora_extra: z.number().min(0).optional().nullable(),
  horometro_inicial: z.string().trim().optional().nullable(),
  mantenimiento_horas: z.string().trim().optional().nullable(),
  observaciones: z.string().trim().optional().nullable(),
});

const contractSchema = z.object({
  // Empresa (Company) seleccionada como cliente/arrendatario — fuente oficial.
  company_id: z.string().min(1, "Selecciona una empresa (cliente / arrendatario)."),
  moneda: z.enum(["CLP", "USD", "UF"]).default("CLP"),
  fecha_inicio: z.string().min(1, "La fecha de inicio es obligatoria."),
  fecha_termino: z.string().optional().nullable(),
  duracion_meses: z.number().int().min(1).optional().nullable(),
  lugar_operacion: z.string().trim().optional().nullable(),
  forma_pago: z.string().trim().optional().nullable(),
  observaciones: z.string().trim().optional().nullable(),
  ciudad_celebracion: z.string().trim().optional().nullable(),
  vigencia_contrato: z.string().trim().optional().nullable(),
  numero_anexo: z.string().trim().optional().nullable(),
  fecha_anexo: z.string().optional().nullable(),
  numero_cotizacion: z.string().trim().optional().nullable(),
  correo_notificaciones: z.string().trim().optional().nullable(),
  representante_cliente: z.string().trim().optional().nullable(),
  rut_representante: z.string().trim().optional().nullable(),
  equipos: z.array(equipoSchema).min(1, "Agrega al menos un equipo."),
});

export type CreateContractInput = z.infer<typeof contractSchema>;

// Genera el número visible legal NNN/YYYY para contratos nuevos. El correlativo
// reinicia por año. Considera tanto contratos antiguos (CTR-XXXX, año desde
// fecha_emision) como nuevos (NNN/YYYY) del mismo año para no colisionar.
async function getNextContractNumber(): Promise<string> {
  const year = new Date().getFullYear();
  // Solo contratos emitidos este año: el correlativo reinicia por año y tanto
  // los CTR-XXXX viejos (año = fecha_emision) como los NNN/YYYY nuevos (año del
  // string == año de creación) quedan cubiertos por este filtro. Evita traer
  // toda la tabla solo para descartar años anteriores en memoria.
  const existentes = await prisma.contract.findMany({
    where: { fecha_emision: { gte: new Date(year, 0, 1) } },
    select: { numero_contrato: true, fecha_emision: true },
  });
  let maxCorrelativo = 0;
  for (const c of existentes) {
    const parsed = parseContractNumber(c.numero_contrato, c.fecha_emision);
    if (parsed && parsed.anio === year && parsed.correlativo > maxCorrelativo) {
      maxCorrelativo = parsed.correlativo;
    }
  }
  return `${String(maxCorrelativo + 1).padStart(3, "0")}/${year}`;
}

function normalizeRut(rut: string | null | undefined): string | null {
  if (!rut) return null;
  const n = rut.toLowerCase().replace(/[^0-9k]/g, "");
  return n || null;
}

// Compat-mapping: Contract.client_id es FK a Client, pero la fuente oficial es
// Company. Resuelve el Client vinculado a la empresa; si no existe, lo vincula
// por RUT o crea uno de compatibilidad. Nunca duplica por RUT.
async function resolveCompatClientId(empresa: {
  id: string;
  nombre_razon_social: string;
  rut: string | null;
  email: string | null;
  telefono: string | null;
  direccion: string | null;
}): Promise<string> {
  // 1. Client ya vinculado a la empresa.
  const linked = await prisma.client.findFirst({
    where: { company_id: empresa.id },
    select: { id: true },
  });
  if (linked) return linked.id;

  // 2. Client existente con el mismo RUT normalizado (sin vincular) → vincular.
  const norm = normalizeRut(empresa.rut);
  if (norm) {
    const candidates = await prisma.client.findMany({
      where: { rut: { not: null } },
      select: { id: true, rut: true },
    });
    const match = candidates.find((c) => normalizeRut(c.rut) === norm);
    if (match) {
      await prisma.client.update({
        where: { id: match.id },
        data: { company_id: empresa.id },
      });
      return match.id;
    }
  }

  // 3. Crear Client de compatibilidad con datos de la empresa.
  const created = await prisma.client.create({
    data: {
      nombre: empresa.nombre_razon_social,
      rut: empresa.rut,
      email: empresa.email,
      telefono: empresa.telefono,
      direccion: empresa.direccion,
      activo: true,
      company_id: empresa.id,
    },
    select: { id: true },
  });
  return created.id;
}

export async function createContract(
  rawData: CreateContractInput
  // Devuelve también los equipos creados (id + orden) para que el formulario
  // pueda subir las fotos de respaldo inmediatamente después de crear.
): Promise<{ id: string; equipos: { id: string; orden: number }[] }> {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.rol !== "ADMINISTRADOR" && session.rol !== "SUPERVISOR") {
    throw new Error("Sin permisos para crear contratos.");
  }

  const data = contractSchema.parse(rawData);

  // Empresa (Company) seleccionada — fuente oficial, datos frescos del servidor.
  const empresa = await prisma.company.findUnique({
    where: { id: data.company_id },
    select: {
      id: true,
      nombre_razon_social: true,
      rut: true,
      email: true,
      telefono: true,
      direccion: true,
      comuna: true,
      ciudad: true,
      representante_legal: true,
      rut_representante: true,
      correo_notificaciones: true,
    },
  });
  if (!empresa) {
    throw new Error("La empresa seleccionada no existe.");
  }

  // Compat-mapping con la FK Contract.client_id (ver resolveCompatClientId).
  const clientId = await resolveCompatClientId(empresa);

  // Snapshot del cliente tomado desde la Empresa (Company) al crear.
  const direccionSnapshot =
    [empresa.direccion, empresa.comuna, empresa.ciudad]
      .filter((v) => v && v.trim() !== "")
      .join(", ") || null;

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
  const fechaAnexo = data.fecha_anexo ? new Date(`${data.fecha_anexo}T12:00:00`) : null;
  if (fechaAnexo && Number.isNaN(fechaAnexo.getTime())) {
    throw new Error("La fecha del anexo no es válida.");
  }

  const numero = await getNextContractNumber();

  let contract: { id: string; equipos: { id: string; orden: number }[] };
  try {
    contract = await prisma.contract.create({
      data: {
        numero_contrato: numero,
        client_id: clientId,
        user_id: session.id,
        estado: "BORRADOR",
        moneda: data.moneda,
        fecha_inicio: fechaInicio,
        fecha_termino: fechaTermino,
        duracion_meses: data.duracion_meses ?? null,
        lugar_operacion: data.lugar_operacion || null,
        forma_pago: data.forma_pago || null,
        observaciones: data.observaciones || null,
        ciudad_celebracion: data.ciudad_celebracion || null,
        vigencia_contrato: data.vigencia_contrato || null,
        numero_anexo: data.numero_anexo || null,
        fecha_anexo: fechaAnexo,
        numero_cotizacion: data.numero_cotizacion || null,
        // Representante / correo: lo del formulario tiene prioridad; si viene
        // vacío, se completa desde la Empresa (Company).
        correo_notificaciones:
          data.correo_notificaciones || empresa.correo_notificaciones || null,
        representante_cliente:
          data.representante_cliente || empresa.representante_legal || null,
        rut_representante:
          data.rut_representante || empresa.rut_representante || null,
        // Snapshot al crear, tomado desde la Empresa (Company).
        cliente_snapshot_at: new Date(),
        cliente_nombre_snapshot: empresa.nombre_razon_social,
        cliente_rut_snapshot: empresa.rut,
        cliente_direccion_snapshot: direccionSnapshot,
        cliente_email_snapshot: empresa.email ?? empresa.correo_notificaciones,
        cliente_telefono_snapshot: empresa.telefono,
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
            tarifa_hora_extra: eq.tarifa_hora_extra ?? null,
            horometro_inicial: eq.horometro_inicial || null,
            mantenimiento_horas: eq.mantenimiento_horas || null,
            observaciones: eq.observaciones || null,
          })),
        },
      },
      select: {
        id: true,
        equipos: { select: { id: true, orden: true }, orderBy: { orden: "asc" } },
      },
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
    `Nº ${numero} | Cliente: ${empresa.nombre_razon_social} | Equipos: ${data.equipos.length}`
  );

  revalidatePath("/contratos");
  return { id: contract.id, equipos: contract.equipos };
}

// Cambio de estado BORRADOR → VIGENTE. Mantiene PDF y datos intactos; solo
// actualiza el campo `estado`. Transición única y controlada: no permite volver
// a BORRADOR desde otros estados ni saltar a FINALIZADO/ANULADO (por ahora).
export async function marcarContratoVigente(id: string): Promise<void> {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.rol !== "ADMINISTRADOR" && session.rol !== "SUPERVISOR") {
    throw new Error("Sin permisos para cambiar el estado del contrato.");
  }

  const contrato = await prisma.contract.findUnique({
    where: { id },
    select: { id: true, estado: true, numero_contrato: true },
  });
  if (!contrato) throw new Error("El contrato no existe.");
  if (contrato.estado !== "BORRADOR") {
    throw new Error("Solo un contrato en borrador puede marcarse como vigente.");
  }

  await prisma.contract.update({
    where: { id },
    data: { estado: "VIGENTE" },
  });

  await logAudit(
    session.id,
    "contrato_vigente",
    "contratos",
    `Nº ${contrato.numero_contrato} marcado como VIGENTE`
  );

  revalidatePath("/contratos");
  revalidatePath(`/contratos/${id}`);
}
