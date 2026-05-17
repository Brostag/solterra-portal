"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CheckCircle2 } from "lucide-react";

const features = [
  "Gestión de facturas y órdenes de compra",
  "Control documental centralizado",
  "Clientes, proveedores y productos",
];

export default function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawRedirect = searchParams.get("redirectTo") ?? "/dashboard";
  const redirectTo =
    rawRedirect.startsWith("/") && !rawRedirect.startsWith("//")
      ? rawRedirect
      : "/dashboard";
  const inactiveError =
    searchParams.get("error") === "inactive"
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
    const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
    if (authError) {
      setError("Correo o contraseña incorrectos");
      setLoading(false);
      return;
    }
    router.push(redirectTo);
    router.refresh();
  }

  return (
    <div className="min-h-screen flex">

      {/* ── Panel izquierdo ─────────────────────────────────────── */}
      <div className="hidden lg:flex lg:w-[44%] bg-[#253158] flex-col relative overflow-hidden">
        {/* Acento rojo superior */}
        <div className="absolute top-0 inset-x-0 h-[3px] bg-[#c6352e]" />

        {/* Patrón de puntos */}
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: "radial-gradient(circle, #fff 1px, transparent 1px)",
            backgroundSize: "28px 28px",
          }}
        />

        {/* Gradiente inferior para fade del patrón */}
        <div className="absolute bottom-0 inset-x-0 h-40 bg-gradient-to-t from-[#253158] to-transparent" />

        {/* Logo — esquina superior */}
        <div className="relative z-10 px-12 pt-10">
          <Image
            src="/solterra-logo.png"
            alt="Solterra"
            width={140}
            height={48}
            className="h-9 w-auto"
          />
        </div>

        {/* Contenido central */}
        <div className="relative z-10 flex-1 flex flex-col justify-center px-12">
          <p className="text-[#c6352e] text-xs font-semibold tracking-widest uppercase mb-4">
            Portal Empresarial
          </p>
          <h2 className="text-[2.1rem] font-bold text-white leading-tight mb-5">
            Gestión interna<br />de Solterra
          </h2>
          <p className="text-white/45 text-sm leading-relaxed mb-10 max-w-[280px]">
            Plataforma centralizada para la operación y control en el norte de Chile.
          </p>

          <ul className="space-y-3.5">
            {features.map((f) => (
              <li key={f} className="flex items-center gap-3">
                <CheckCircle2 className="h-4 w-4 text-[#c6352e] flex-shrink-0" />
                <span className="text-white/55 text-sm">{f}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Footer del panel */}
        <div className="relative z-10 px-12 pb-8">
          <div className="border-t border-white/10 pt-5">
            <p className="text-white/20 text-[11px]">
              © Solterra {new Date().getFullYear()} · Movimiento de Tierra, Maquinarias y Equipos
            </p>
          </div>
        </div>
      </div>

      {/* ── Panel derecho ────────────────────────────────────────── */}
      <div className="flex-1 flex items-center justify-center bg-[#f4f6fb] px-6 py-8">
        <div className="w-full max-w-[400px]">

          {/* Logo móvil */}
          <div className="flex justify-center mb-8 lg:hidden">
            <Image src="/solterra-logo.png" alt="Solterra" width={130} height={44} className="h-9 w-auto" />
          </div>

          {/* Tarjeta del formulario */}
          <div className="bg-white rounded-2xl shadow-[0_4px_32px_-4px_rgba(37,49,88,0.12)] border border-gray-100 overflow-hidden">
            {/* Cabecera de la tarjeta */}
            <div className="px-8 pt-8 pb-6 border-b border-gray-100">
              <h1 className="text-xl font-bold text-[#253158]">Iniciar sesión</h1>
              <p className="text-sm text-gray-400 mt-1">Ingresa con tu cuenta corporativa</p>
            </div>

            {/* Cuerpo del formulario */}
            <div className="px-8 py-7">
              {resetSuccess && (
                <div className="text-sm text-green-700 bg-green-50 border border-green-200 px-4 py-3 rounded-lg mb-5">
                  Contraseña actualizada. Ya puedes iniciar sesión.
                </div>
              )}
              {inviteSuccess && (
                <div className="text-sm text-green-700 bg-green-50 border border-green-200 px-4 py-3 rounded-lg mb-5">
                  Cuenta activada. Ingresa con tu correo y contraseña.
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-1.5">
                  <Label htmlFor="email" className="text-sm font-medium text-gray-600">
                    Correo electrónico
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="usuario@solterra.cl"
                    required
                    autoFocus
                    className="h-10 bg-gray-50 border-gray-200 focus:bg-white text-sm"
                  />
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password" className="text-sm font-medium text-gray-600">
                      Contraseña
                    </Label>
                    <a
                      href="/auth/forgot-password"
                      className="text-xs text-[#253158]/60 hover:text-[#253158] transition-colors"
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
                    className="h-10 bg-gray-50 border-gray-200 focus:bg-white text-sm"
                  />
                </div>

                {error && (
                  <div className="text-sm text-[#c6352e] bg-red-50 border border-red-100 px-4 py-3 rounded-lg">
                    {error}
                  </div>
                )}

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full h-10 bg-[#253158] hover:bg-[#1d2a4f] text-white text-sm font-semibold rounded-lg transition-colors mt-1"
                >
                  {loading ? "Verificando..." : "Ingresar al portal"}
                </Button>
              </form>
            </div>
          </div>

          {/* Footer bajo tarjeta */}
          <p className="text-center text-xs text-gray-400 mt-6">
            © Solterra {new Date().getFullYear()} — Uso interno
          </p>
        </div>
      </div>
    </div>
  );
}
