"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawRedirect = searchParams.get("redirectTo") ?? "/dashboard";
  const redirectTo = rawRedirect.startsWith("/") && !rawRedirect.startsWith("//") ? rawRedirect : "/dashboard";
  const inactiveError = searchParams.get("error") === "inactive"
    ? "Tu cuenta está desactivada. Contacta al administrador."
    : null;
  const resetSuccess = searchParams.get("reset") === "success";
  const inviteSuccess = searchParams.get("invite") === "success";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(inactiveError);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createClient();
    const { error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      setError("Correo o contraseña incorrectos");
      setLoading(false);
      return;
    }

    router.push(redirectTo);
    router.refresh();
  }

  return (
    <div className="min-h-screen bg-[#f8f8f8] flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="flex justify-center mb-8">
          <Image
            src="https://ext.same-assets.com/2134444905/2984985315.png"
            alt="Solterra Logo"
            width={200}
            height={80}
            className="h-16 w-auto"
          />
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-[#253158]">Portal de Gestión</h1>
            <p className="text-sm text-gray-500 mt-1">Ingresa con tu cuenta corporativa</p>
          </div>

          {resetSuccess && (
            <p className="text-sm text-green-700 bg-green-50 border border-green-200 px-3 py-2 rounded mb-4">
              Contraseña actualizada correctamente. Ya puedes iniciar sesión.
            </p>
          )}
          {inviteSuccess && (
            <p className="text-sm text-green-700 bg-green-50 border border-green-200 px-3 py-2 rounded mb-4">
              Cuenta activada correctamente. Ingresa con tu correo y contraseña.
            </p>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email">Correo electrónico</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="usuario@solterra.cl"
                required
                autoFocus
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Contraseña</Label>
                <a
                  href="/auth/forgot-password"
                  className="text-xs text-[#253158] hover:underline"
                >
                  ¿Olvidaste tu contraseña?
                </a>
              </div>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
            </div>

            {error && (
              <p className="text-sm text-[#c6352e] bg-red-50 px-3 py-2 rounded">{error}</p>
            )}

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-[#253158] hover:bg-[#1e305e] text-white"
            >
              {loading ? "Ingresando..." : "Ingresar"}
            </Button>
          </form>
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">
          © Solterra {new Date().getFullYear()} — Uso interno
        </p>
      </div>
    </div>
  );
}
