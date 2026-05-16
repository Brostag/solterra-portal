import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { cache } from "react";
import type { UserSession } from "@/types";

export const getSession = cache(async (): Promise<UserSession | null> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const profile = await prisma.profile.findUnique({
    where: { auth_user_id: user.id },
    select: { id: true, email: true, nombre: true, rol: true, activo: true },
  });

  if (!profile) return null;

  if (!profile.activo) {
    redirect("/login?error=inactive");
  }

  return {
    id: profile.id,
    email: profile.email,
    nombre: profile.nombre,
    rol: profile.rol as UserSession["rol"],
  };
});
