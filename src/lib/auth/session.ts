import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { cache } from "react";
import { unstable_cache } from "next/cache";
import type { UserSession } from "@/types";

export const profileCacheTag = (authUserId: string) => `profile-${authUserId}`;

// Cache de 120s por auth_user_id — evita 1 query Prisma por request en todas las rutas.
// Invalidar con revalidateTag(profileCacheTag(authUserId)) al editar/desactivar un usuario.
const getCachedProfile = (authUserId: string) =>
  unstable_cache(
    () =>
      prisma.profile.findUnique({
        where: { auth_user_id: authUserId },
        select: { id: true, email: true, nombre: true, rol: true, activo: true, area: true },
      }),
    ["profile", authUserId],
    { revalidate: 120, tags: [profileCacheTag(authUserId)] }
  )();

export const getSession = cache(async (): Promise<UserSession | null> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const profile = await getCachedProfile(user.id);
  if (!profile) return null;

  if (!profile.activo) {
    redirect("/login?error=inactive");
  }

  return {
    id: profile.id,
    email: profile.email,
    nombre: profile.nombre,
    rol: profile.rol as UserSession["rol"],
    area: profile.area as UserSession["area"],
  };
});

// Usar solo en Server Components/pages SSR protegidas por middleware. No usar en API routes ni Server Actions.
export const getPortalSessionFast = cache(async (): Promise<UserSession | null> => {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.user) return null;

  const profile = await getCachedProfile(session.user.id);
  if (!profile) return null;

  if (!profile.activo) {
    redirect("/login?error=inactive");
  }

  return {
    id: profile.id,
    email: profile.email,
    nombre: profile.nombre,
    rol: profile.rol as UserSession["rol"],
    area: profile.area as UserSession["area"],
  };
});
