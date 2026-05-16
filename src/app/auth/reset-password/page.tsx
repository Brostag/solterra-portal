"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function validatePassword(password: string): string | null {
  if (password.length < 8) return "La contraseña debe tener al menos 8 caracteres.";
  if (!/[a-zA-Z]/.test(password)) return "La contraseña debe contener al menos una letra.";
  if (!/[0-9]/.test(password)) return "La contraseña debe contener al menos un número.";
  return null;
}

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    // Detect error params from Supabase when token is expired/invalid
    const params = new URLSearchParams(window.location.search);
    if (params.get("error")) {
      setChecking(false);
      return;
    }

    const supabase = createClient();
    let resolved = false;

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === "PASSWORD_RECOVERY") {
          resolved = true;
          setSessionReady(true);
          setChecking(false);
        } else if (event === "SIGNED_IN" && session) {
          // PKCE: createBrowserClient auto-exchanges code from URL, fires SIGNED_IN
          resolved = true;
          setSessionReady(true);
          setChecking(false);
        } else if (event === "INITIAL_SESSION" && session) {
          // Session already established (e.g. server-side cookie)
          resolved = true;
          setSessionReady(true);
          setChecking(false);
        }
      }
    );

    // Fallback: if no valid auth event in 4s, the link is expired or invalid
    const timer = setTimeout(() => {
      if (!resolved) setChecking(false);
    }, 4000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timer);
    };
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const validationError = validatePassword(password);
    if (validationError) {
      setError(validationError);
      return;
    }
    if (password !== confirm) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    setLoading(true);
    const supabase = createClient();
    const { error: updateError } = await supabase.auth.updateUser({ password });

    if (updateError) {
      setError(
        "No se pudo actualizar la contraseña. El enlace puede haber expirado. Solicita un nuevo enlace."
      );
      setLoading(false);
      return;
    }

    await supabase.auth.signOut();
    router.push("/login?reset=success");
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
            <h1 className="text-2xl font-bold text-[#253158]">Nueva contraseña</h1>
            <p className="text-sm text-gray-500 mt-1">
              Elige una contraseña segura para tu cuenta.
            </p>
          </div>

          {checking ? (
            <p className="text-sm text-gray-400 text-center py-6">Verificando enlace...</p>
          ) : !sessionReady ? (
            <div className="space-y-4">
              <p className="text-sm text-[#c6352e] bg-red-50 border border-red-200 px-3 py-2 rounded">
                El enlace ha expirado o ya fue utilizado. Solicita uno nuevo.
              </p>
              <Link
                href="/auth/forgot-password"
                className="block text-center text-sm text-[#253158] hover:underline font-medium"
              >
                Solicitar nuevo enlace de recuperación →
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="password">Nueva contraseña</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Mínimo 8 caracteres"
                  required
                  autoFocus
                />
                <p className="text-xs text-gray-400">
                  Mínimo 8 caracteres, al menos una letra y un número.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirm">Confirmar contraseña</Label>
                <Input
                  id="confirm"
                  type="password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  placeholder="Repite la contraseña"
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
                {loading ? "Guardando..." : "Guardar nueva contraseña"}
              </Button>

              <Link
                href="/auth/forgot-password"
                className="block text-center text-sm text-gray-500 hover:text-[#253158] transition-colors"
              >
                Solicitar nuevo enlace de recuperación
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
