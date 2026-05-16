import { z } from "zod";

export const invoiceItemSchema = z.object({
  product_id: z.string().optional(),
  descripcion: z.string().min(1, "La descripción es requerida"),
  cantidad: z.coerce.number().positive("La cantidad debe ser mayor a 0"),
  precio_unitario: z.coerce
    .number()
    .positive("El precio debe ser mayor a 0"),
});

export const invoiceSchema = z.object({
  client_id: z.string().min(1, "Selecciona un cliente"),
  moneda: z.enum(["CLP", "USD", "UF"]),
  tipo_cambio: z.coerce.number().positive().default(1),
  items: z
    .array(invoiceItemSchema)
    .min(1, "Agrega al menos un producto o servicio"),
});

export const annulSchema = z.object({
  motivo_anulacion: z
    .string()
    .min(10, "El motivo debe tener al menos 10 caracteres"),
});

export type InvoiceFormData = z.infer<typeof invoiceSchema>;
export type AnnulFormData = z.infer<typeof annulSchema>;
