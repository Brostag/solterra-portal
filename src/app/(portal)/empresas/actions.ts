"use server";

import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth/session";
import { logAudit } from "@/lib/audit";
import { revalidatePath, revalidateTag } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import {
  ACTIVE_COMPANY_CLIENTS_TAG,
  ACTIVE_COMPANY_SUPPLIERS_TAG,
} from "@/lib/cache/master-lists";

const opt = z.string().trim().optional().nullable();

const companyFields = z.object({
  nombre_razon_social: z.string().trim().min(1, "La razón social es obligatoria."),
  rut: opt,
  giro: opt,
  email: opt,
  telefono: opt,
  direccion: opt,
  comuna: opt,
  ciudad: opt,
  region: opt,
  pais: opt,
  observaciones: opt,
  es_cliente: z.boolean(),
  es_proveedor: z.boolean(),
  es_arrendataria: z.boolean(),
  es_otro: z.boolean(),
  representante_legal: opt,
  rut_representante: opt,
  cargo_representante: opt,
  email_representante: opt,
  telefono_representante: opt,
  contacto_nombre: opt,
  contacto_cargo: opt,
  contacto_email: opt,
  contacto_telefono: opt,
  condicion_pago: opt,
  correo_notificaciones: opt,
  banco: opt,
  tipo_cuenta: opt,
  numero_cuenta: opt,
  titular_cuenta: opt,
  rut_titular_cuenta: opt,
});

type CompanyFields = z.infer<typeof companyFields>;

const hasRole = (d: CompanyFields): boolean =>
  d.es_cliente || d.es_proveedor || d.es_arrendataria || d.es_otro;

const ROLE_REQUIRED = { message: "Selecciona al menos un rol para la empresa." };

const companySchema = companyFields.refine(hasRole, ROLE_REQUIRED);

export type CreateCompanyInput = z.infer<typeof companySchema>;

const updateCompanySchema = companyFields
  .extend({
    id: z.string().trim().min(1),
    activo: z.boolean(),
  })
  .refine(hasRole, ROLE_REQUIRED);

export type UpdateCompanyInput = z.infer<typeof updateCompanySchema>;

// Mapeo compartido de campos de empresa: strings vacíos → null, país por
// defecto Chile. Única fuente de verdad para crear y editar (evita drift).
function companyWriteData(data: CompanyFields) {
  return {
    nombre_razon_social: data.nombre_razon_social,
    rut: data.rut || null,
    giro: data.giro || null,
    email: data.email || null,
    telefono: data.telefono || null,
    direccion: data.direccion || null,
    comuna: data.comuna || null,
    ciudad: data.ciudad || null,
    region: data.region || null,
    pais: data.pais || "Chile",
    observaciones: data.observaciones || null,
    es_cliente: data.es_cliente,
    es_proveedor: data.es_proveedor,
    es_arrendataria: data.es_arrendataria,
    es_otro: data.es_otro,
    representante_legal: data.representante_legal || null,
    rut_representante: data.rut_representante || null,
    cargo_representante: data.cargo_representante || null,
    email_representante: data.email_representante || null,
    telefono_representante: data.telefono_representante || null,
    contacto_nombre: data.contacto_nombre || null,
    contacto_cargo: data.contacto_cargo || null,
    contacto_email: data.contacto_email || null,
    contacto_telefono: data.contacto_telefono || null,
    condicion_pago: data.condicion_pago || null,
    correo_notificaciones: data.correo_notificaciones || null,
    banco: data.banco || null,
    tipo_cuenta: data.tipo_cuenta || null,
    numero_cuenta: data.numero_cuenta || null,
    titular_cuenta: data.titular_cuenta || null,
    rut_titular_cuenta: data.rut_titular_cuenta || null,
  };
}

function rolesLabel(data: CompanyFields): string {
  return [
    data.es_cliente && "Cliente",
    data.es_proveedor && "Proveedor",
    data.es_arrendataria && "Arrendataria",
    data.es_otro && "Otro",
  ]
    .filter(Boolean)
    .join(", ");
}

export async function createCompany(
  rawData: CreateCompanyInput,
): Promise<{ id: string }> {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.rol !== "ADMINISTRADOR" && session.rol !== "SUPERVISOR") {
    throw new Error("Sin permisos para crear empresas.");
  }

  const data = companySchema.parse(rawData);

  const company = await prisma.company.create({
    data: companyWriteData(data),
    select: { id: true },
  });

  await logAudit(
    session.id,
    "empresa_creada",
    "empresas",
    `${data.nombre_razon_social}${data.rut ? ` (${data.rut})` : ""} | Roles: ${rolesLabel(data)}`,
  );

  revalidatePath("/empresas");
  // Selectores Company usados por Cotizador, Contratos y OC.
  revalidateTag(ACTIVE_COMPANY_CLIENTS_TAG);
  revalidateTag(ACTIVE_COMPANY_SUPPLIERS_TAG);
  return { id: company.id };
}

export async function updateCompany(
  rawData: UpdateCompanyInput,
): Promise<{ id: string }> {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.rol !== "ADMINISTRADOR" && session.rol !== "SUPERVISOR") {
    throw new Error("Sin permisos para editar empresas.");
  }

  const data = updateCompanySchema.parse(rawData);

  const existing = await prisma.company.findUnique({
    where: { id: data.id },
    select: { id: true },
  });
  if (!existing) {
    throw new Error("La empresa no existe.");
  }

  await prisma.company.update({
    where: { id: data.id },
    data: {
      ...companyWriteData(data),
      activo: data.activo,
    },
  });

  await logAudit(
    session.id,
    "empresa_editada",
    "empresas",
    `${data.nombre_razon_social}${data.rut ? ` (${data.rut})` : ""} | Roles: ${rolesLabel(data)}`,
  );

  revalidatePath("/empresas");
  revalidatePath(`/empresas/${data.id}`);
  // Selectores Company usados por Cotizador, Contratos y OC.
  revalidateTag(ACTIVE_COMPANY_CLIENTS_TAG);
  revalidateTag(ACTIVE_COMPANY_SUPPLIERS_TAG);
  return { id: data.id };
}
