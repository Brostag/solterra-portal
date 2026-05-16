import { z } from "zod";

export const clientSchema = z.object({
  nombre: z.string().min(2, "El nombre es requerido"),
  rut: z.string().optional(),
  email: z.string().email("Email inválido").optional().or(z.literal("")),
  telefono: z.string().optional(),
  direccion: z.string().optional(),
  observaciones: z.string().optional(),
});

export type ClientFormData = z.infer<typeof clientSchema>;
