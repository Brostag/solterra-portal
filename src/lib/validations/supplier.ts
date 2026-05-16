import { z } from "zod";

export const supplierSchema = z.object({
  nombre: z.string().min(2, "El nombre es requerido"),
  rut: z.string().optional(),
  giro: z.string().optional(),
  direccion: z.string().optional(),
  ciudad: z.string().optional(),
  telefono: z.string().optional(),
  email: z.string().email("Email inválido").optional().or(z.literal("")),
  contacto: z.string().optional(),
  observaciones: z.string().optional(),
});

export type SupplierFormData = z.infer<typeof supplierSchema>;
