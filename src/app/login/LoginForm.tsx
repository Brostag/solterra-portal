"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { Mail, Lock } from "lucide-react";

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
  const [showPassword, setShowPassword] = useState(false);
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
    <div className="h-screen flex overflow-hidden">

      {/* ── Panel izquierdo ── */}
      <div className="hidden lg:flex lg:w-[46%] bg-[#253158] flex-col relative overflow-hidden">
        {/* Acento rojo superior */}
        <div className="absolute top-0 inset-x-0 h-[3px] bg-[#c6352e]" />
        {/* Textura punteada sutil */}
        <div
          className="absolute inset-0 opacity-[0.05]"
          style={{
            backgroundImage: "radial-gradient(circle, #fff 1px, transparent 1px)",
            backgroundSize: "28px 28px",
          }}
        />
        {/* Degradado inferior */}
        <div className="absolute bottom-0 inset-x-0 h-56 bg-gradient-to-t from-[#1a2240] to-transparent" />

        {/* Logo */}
        <div className="absolute top-10 left-12 z-10">
          <Image
            src="/solterra-logo.png"
            alt="Solterra"
            width={170}
            height={56}
            className="h-[52px] w-auto object-contain"
          />
        </div>

        {/* Contenido centrado verticalmente */}
        <div className="relative z-10 flex-1 flex flex-col justify-center px-12 pb-8">
          <p className="text-[#c6352e] text-[11px] font-semibold tracking-[0.2em] uppercase mb-5">
            Portal Empresarial
          </p>
          <h2 className="text-[2.85rem] font-bold text-white leading-[1.15] mb-6">
            Gestión interna<br />de Solterra
          </h2>
          <p className="text-white/60 text-[15px] leading-relaxed mb-12 max-w-[300px]">
            Plataforma centralizada para la operación y control en el norte de Chile.
          </p>
          <ul className="space-y-5">
            {features.map((f) => (
              <li key={f} className="flex items-center gap-3.5">
                <span className="h-6 w-6 rounded-full bg-[#c6352e]/90 flex items-center justify-center flex-shrink-0">
                  <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </span>
                <span className="text-white/75 text-[15px]">{f}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Footer izquierdo */}
        <div className="absolute bottom-0 left-0 right-0 z-10 px-12 pb-8">
          <div className="border-t border-white/10 pt-5">
            <p className="text-white/25 text-[11px]">
              © Solterra {new Date().getFullYear()} · Movimiento de Tierra, Maquinarias y Equipos
            </p>
          </div>
        </div>
      </div>

      {/* ── Panel derecho ── */}
      <div className="flex-1 flex items-center justify-center bg-[#f4f6fb] px-6 py-10 overflow-y-auto">
        <div className="w-full max-w-[500px]">

          {/* Logo en mobile (panel izquierdo oculto) */}
          <div className="flex justify-center mb-8 lg:hidden">
            <Image src="/solterra-logo.png" alt="Solterra" width={140} height={46} className="h-10 w-auto" />
          </div>

          {/* Tarjeta */}
          <div className="bg-white rounded-2xl shadow-[0_8px_56px_-8px_rgba(37,49,88,0.20)] overflow-hidden">

            {/* Encabezado */}
            <div className="px-12 pt-12 pb-7">
              <h1 className="text-[1.75rem] font-bold text-[#253158] leading-tight">
                Iniciar sesión
              </h1>
              <p className="text-[15px] text-gray-400 mt-1.5">
                Ingresa con tu cuenta corporativa
              </p>
              <div className="mt-7 border-b border-gray-100" />
            </div>

            {/* Formulario */}
            <div className="px-12 pb-12 space-y-5">
              {resetSuccess && (
                <div className="text-sm text-green-700 bg-green-50 border border-green-200 px-4 py-3 rounded-lg">
                  Contraseña actualizada. Ya puedes iniciar sesión.
                </div>
              )}
              {inviteSuccess && (
                <div className="text-sm text-green-700 bg-green-50 border border-green-200 px-4 py-3 rounded-lg">
                  Cuenta activada. Ingresa con tu correo y contraseña.
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-5">

                {/* Email */}
                <div className="space-y-2">
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                    Correo electrónico
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                    <input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="usuario@solterra.cl"
                      required
                      autoFocus
                      className="w-full h-12 pl-10 pr-4 border border-gray-200 rounded-lg text-sm bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#253158]/25 focus:border-[#253158] transition-all"
                    />
                  </div>
                </div>

                {/* Contraseña */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label htmlFor="password" className="text-sm font-medium text-gray-700">
                      Contraseña
                    </label>
                    <a
                      href="/auth/forgot-password"
                      className="text-xs text-[#c6352e] hover:text-[#b02e28] hover:underline transition-colors"
                    >
                      ¿Olvidaste tu contraseña?
                    </a>
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                    <input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                      className="w-full h-12 pl-10 pr-20 border border-gray-200 rounded-lg text-sm bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#253158]/25 focus:border-[#253158] transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      {showPassword ? "Ocultar" : "Mostrar"}
                    </button>
                  </div>
                </div>

                {error && (
                  <div className="text-sm text-[#c6352e] bg-red-50 border border-red-100 px-4 py-3 rounded-lg">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full h-12 bg-[#c6352e] hover:bg-[#b02e28] active:bg-[#9e2822] disabled:opacity-60 disabled:cursor-not-allowed text-white text-[15px] font-semibold rounded-lg transition-colors mt-2"
                >
                  {loading ? "Verificando..." : "Ingresar al portal"}
                </button>
              </form>
            </div>
          </div>

          {/* Footer */}
          <p className="text-center text-xs text-gray-400 mt-6">
            © Solterra {new Date().getFullYear()} — Uso interno
          </p>
        </div>
      </div>
    </div>
  );
}
