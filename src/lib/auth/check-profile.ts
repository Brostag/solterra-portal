"use server";

import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

export async function checkProfile(): Promise<{ activo: boolean } | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const profile = await prisma.profile.findUnique({
    where: { auth_user_id: user.id },
    select: { activo: true },
  });

  return profile ? { activo: profile.activo } : null;
}
