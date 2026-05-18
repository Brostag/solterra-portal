"use server";

import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth/session";
import { logAudit } from "@/lib/audit";
import { redirect } from "next/navigation";
import { revalidatePath, revalidateTag } from "next/cache";
import { profileCacheTag } from "@/lib/auth/session";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";

const userSchema = z.object({
  nombre: z.string().min(2, "El nombre debe tener al menos 2 caracteres"),
  email: z.string().email("Email inválido"),
  rol: z.enum(["ADMINISTRADOR", "SUPERVISOR", "USUARIO"]),
});

const updateUserSchema = z.object({
  nombre: z.string().min(2),
  rol: z.enum(["ADMINISTRADOR", "SUPERVISOR", "USUARIO"]),
});

export async function inviteUser(formData: FormData) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.rol !== "ADMINISTRADOR") throw new Error("Sin permisos");

  const validated = userSchema.parse({
    nombre: formData.get("nombre"),
    email: formData.get("email"),
    rol: formData.get("rol"),
  });

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const supabase = createAdminClient();
  const { data, error } = await supabase.auth.admin.inviteUserByEmail(validated.email, {
    data: { nombre: validated.nombre, rol: validated.rol },
    redirectTo: `${siteUrl}/auth/set-password`,
  });

  if (error) throw new Error(error.message);

  await prisma.profile.create({
    data: {
      auth_user_id: data.user.id,
      nombre: validated.nombre,
      email: validated.email,
      rol: validated.rol,
    },
  });

  await logAudit(session.id, "usuario_invitado", "usuarios", `${validated.nombre} — ${validated.rol}`);
  revalidatePath("/usuarios");
  redirect("/usuarios");
}

export async function updateUser(userId: string, formData: FormData) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.rol !== "ADMINISTRADOR") throw new Error("Sin permisos");

  const validated = updateUserSchema.parse({
    nombre: formData.get("nombre"),
    rol: formData.get("rol"),
  });

  const prev = await prisma.profile.findUnique({
    where: { id: userId },
    select: { nombre: true, rol: true, auth_user_id: true },
  });
  if (!prev) throw new Error("Usuario no encontrado");

  await prisma.profile.update({
    where: { id: userId },
    data: { nombre: validated.nombre, rol: validated.rol },
  });

  revalidateTag(profileCacheTag(prev.auth_user_id));
  await logAudit(session.id, "usuario_actualizado", "usuarios", `${validated.nombre} → ${validated.rol}`);
  revalidatePath("/usuarios");
  revalidatePath(`/usuarios/${userId}`);
  redirect(`/usuarios/${userId}`);
}

export async function deactivateUser(userId: string) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.rol !== "ADMINISTRADOR") throw new Error("Sin permisos");
  if (userId === session.id) throw new Error("No puedes desactivar tu propia cuenta");

  const user = await prisma.profile.findUnique({
    where: { id: userId },
    select: { nombre: true, auth_user_id: true },
  });
  if (!user) return;

  await prisma.profile.update({
    where: { id: userId },
    data: { activo: false },
  });

  revalidateTag(profileCacheTag(user.auth_user_id));
  await logAudit(session.id, "usuario_desactivado", "usuarios", user.nombre);
  revalidatePath("/usuarios");
}
