import { z } from "zod";

export const productSchema = z.object({
  nombre: z.string().min(2, "El nombre es requerido"),
  codigo_interno: z.string().optional(),
  descripcion: z.string().optional(),
  precio_unitario: z.coerce
    .number()
    .positive("El precio debe ser mayor a 0"),
});

export type ProductFormData = z.infer<typeof productSchema>;
