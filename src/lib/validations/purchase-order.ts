import { z } from "zod";

export const ocItemSchema = z.object({
  producto_id: z.string().uuid().optional().nullable(),
  descripcion: z.string().min(1, "La descripción es requerida"),
  cantidad: z.coerce.number().positive("La cantidad debe ser mayor a 0"),
  valor_unitario: z.coerce.number().min(0, "El valor debe ser >= 0"),
});

export const purchaseOrderSchema = z
  .object({
    proveedor_id: z.string().min(1, "Selecciona un proveedor"),
    fecha_envio: z.string().optional().nullable(),
    moneda: z.enum(["CLP", "USD"]),
    tipo_cambio: z.coerce.number().optional().nullable(),
    condiciones_pago: z.string().optional(),
    observaciones: z.string().optional(),
    descuento_pct: z.coerce.number().min(0).max(100).default(0),
    items: z.array(ocItemSchema).min(1, "Agrega al menos un ítem"),
  })
  .refine(
    (data) => {
      if (data.moneda === "USD" && (!data.tipo_cambio || data.tipo_cambio <= 0)) {
        return false;
      }
      return true;
    },
    { message: "El tipo de cambio es requerido y debe ser > 0 para moneda USD", path: ["tipo_cambio"] }
  );

export const annulOCSchema = z.object({
  motivo_anulacion: z.string().min(5, "El motivo debe tener al menos 5 caracteres"),
});

export type OCItemData = z.infer<typeof ocItemSchema>;
export type PurchaseOrderData = z.infer<typeof purchaseOrderSchema>;
