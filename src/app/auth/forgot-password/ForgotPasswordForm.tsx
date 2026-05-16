"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function ForgotPasswordForm() {
  const searchParams = useSearchParams();
  const expired = searchParams.get("expired") === "true";

  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createClient();
    const origin = window.location.origin;

    await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${origin}/auth/reset-password`,
    });

    // Siempre mostrar éxito — nunca revelar si el correo existe
    setSent(true);
    setLoading(false);
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
            <h1 className="text-2xl font-bold text-[#253158]">Recuperar contraseña</h1>
            <p className="text-sm text-gray-500 mt-1">
              Ingresa tu correo y te enviaremos un enlace para restablecer tu contraseña.
            </p>
          </div>

          {sent ? (
            <div className="space-y-4">
              <p className="text-sm text-green-700 bg-green-50 border border-green-200 px-4 py-3 rounded">
                Si el correo existe en nuestro sistema, recibirás un enlace para restablecer tu
                contraseña en los próximos minutos.
              </p>
              <Link
                href="/login"
                className="block text-center text-sm text-[#253158] hover:underline font-medium"
              >
                ← Volver al inicio de sesión
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              {expired && (
                <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 px-3 py-2 rounded">
                  El enlace de recuperación ha expirado. Ingresa tu correo para recibir uno nuevo.
                </p>
              )}

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

              {error && (
                <p className="text-sm text-[#c6352e] bg-red-50 px-3 py-2 rounded">{error}</p>
              )}

              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-[#253158] hover:bg-[#1e305e] text-white"
              >
                {loading ? "Enviando..." : "Enviar enlace de recuperación"}
              </Button>

              <Link
                href="/login"
                className="block text-center text-sm text-gray-500 hover:text-[#253158] transition-colors"
              >
                ← Volver al inicio de sesión
              </Link>
            </form>
          )}
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">
          © Solterra {new Date().getFullYear()} — Uso interno
        </p>
      </div>
    </div>
  );
}
