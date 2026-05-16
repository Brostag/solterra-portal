import { prisma } from "@/lib/prisma";

export interface PreflightInput {
  client_id: string;
  moneda: "CLP" | "USD" | "UF";
  tipo_cambio: number;
  items: { descripcion: string; cantidad: number; precio_unitario: number }[];
}

export interface PreflightResult {
  ok: boolean;
  errors: string[];
  warnings: string[];
}

export async function validateInvoicePreflight(
  input: PreflightInput
): Promise<PreflightResult> {
  const errors: string[] = [];
  const warnings: string[] = [];

  const config = await prisma.companySettings.findFirst({
    select: {
      razon_social: true,
      rut: true,
      giro: true,
      direccion: true,
      iva_porcentaje: true,
    },
  });

  if (!config) {
    errors.push(
      "No existe configuración de empresa. Ve a Configuración antes de crear facturas."
    );
  } else {
    if (!config.razon_social?.trim())
      errors.push("Falta la Razón Social de la empresa en Configuración.");
    if (!config.rut?.trim())
      errors.push("Falta el RUT de la empresa en Configuración.");
    if (!config.giro?.trim())
      warnings.push("Falta el Giro de la empresa. El PDF quedará incompleto.");
    if (!config.direccion?.trim())
      warnings.push("Falta la Dirección de la empresa en el PDF.");
    if (!config.iva_porcentaje || Number(config.iva_porcentaje) <= 0)
      errors.push("El IVA configurado debe ser mayor a 0%.");
  }

  const client = await prisma.client.findUnique({
    where: { id: input.client_id },
    select: { nombre: true, rut: true, activo: true },
  });

  if (!client) {
    errors.push("El cliente seleccionado no existe.");
  } else if (!client.activo) {
    errors.push("El cliente seleccionado está inactivo.");
  } else if (!client.rut?.trim()) {
    warnings.push(
      `El cliente "${client.nombre}" no tiene RUT. El PDF no identificará al receptor con RUT.`
    );
  }

  if (input.moneda !== "CLP" && (!input.tipo_cambio || input.tipo_cambio <= 1)) {
    errors.push(
      `Para moneda ${input.moneda}, el tipo de cambio debe ser mayor a 1 (equivalente en CLP).`
    );
  }

  return { ok: errors.length === 0, errors, warnings };
}
