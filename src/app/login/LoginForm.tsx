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
    <div className="min-h-screen w-full flex overflow-hidden border-t-[3px] border-[#c6352e]">

        {/* ── Panel izquierdo ── */}
        <div className="hidden lg:flex lg:w-1/2 bg-[#253158] flex-col relative overflow-hidden">
          {/* Textura punteada sutil */}
          <div
            className="absolute inset-0 opacity-[0.05]"
            style={{
              backgroundImage: "radial-gradient(circle, #fff 1px, transparent 1px)",
              backgroundSize: "28px 28px",
            }}
          />
          {/* Degradado inferior */}
          <div className="absolute bottom-0 inset-x-0 h-48 bg-gradient-to-t from-[#1a2240] to-transparent" />

          {/* Contenido centrado verticalmente — logo + texto juntos */}
          <div className="relative z-10 flex-1 flex flex-col justify-center items-center px-10 py-10">
            <div className="w-full max-w-[440px]">
              <Image
                src="/solterra-logo.png"
                alt="Solterra"
                width={160}
                height={54}
                className="h-[52px] w-auto object-contain mb-12"
              />
              <p className="text-[#c6352e] text-[11px] font-semibold tracking-[0.2em] uppercase mb-5">
                Portal Empresarial
              </p>
              <h2 className="text-[3.2rem] font-bold text-white leading-[1.1] mb-5">
                Gestión interna<br />de Solterra
              </h2>
              <p className="text-white/65 text-base leading-relaxed mb-10">
                Plataforma centralizada para la operación y control en el norte de Chile.
              </p>
              <ul className="space-y-5">
                {features.map((f) => (
                  <li key={f} className="flex items-center gap-4">
                    <span className="h-7 w-7 rounded-full bg-[#c6352e]/90 flex items-center justify-center flex-shrink-0">
                      <svg className="h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    </span>
                    <span className="text-white/80 text-[15px]">{f}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Footer izquierdo */}
          <div className="relative z-10 px-10 pb-8">
            <div className="border-t border-white/10 pt-4 max-w-[440px] mx-auto">
              <p className="text-white/25 text-[11px]">
                © Solterra {new Date().getFullYear()} · Movimiento de Tierra, Maquinarias y Equipos
              </p>
            </div>
          </div>
        </div>

        {/* ── Panel derecho ── */}
        <div className="flex-1 flex flex-col items-center justify-center bg-[#f4f6fb] px-10 py-12 overflow-y-auto">

          {/* Logo en mobile */}
          <div className="flex justify-center mb-8 lg:hidden">
            <Image src="/solterra-logo.png" alt="Solterra" width={140} height={48} className="h-10 w-auto" />
          </div>

          {/* Tarjeta */}
          <div className="w-full max-w-[480px]">
            <div className="bg-white rounded-xl shadow-[0_4px_28px_-4px_rgba(37,49,88,0.16)] overflow-hidden">

              {/* Encabezado */}
              <div className="px-12 pt-12 pb-7">
                <h1 className="text-[2rem] font-bold text-[#253158] leading-tight tracking-tight">
                  Iniciar sesión
                </h1>
                <p className="text-sm text-gray-400 mt-2">
                  Ingresa con tu cuenta corporativa
                </p>
                <div className="mt-6 border-b border-gray-100" />
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
                  <div className="space-y-1.5">
                    <label htmlFor="email" className="block text-sm font-semibold text-gray-700">
                      Correo electrónico
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-[18px] w-[18px] text-gray-400 pointer-events-none" />
                      <input
                        id="email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="usuario@solterra.cl"
                        required
                        autoFocus
                        className="w-full h-12 pl-11 pr-4 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#253158]/20 focus:border-[#253158] transition-all"
                      />
                    </div>
                  </div>

                  {/* Contraseña */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label htmlFor="password" className="text-sm font-semibold text-gray-700">
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
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-[18px] w-[18px] text-gray-400 pointer-events-none" />
                      <input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        required
                        className="w-full h-12 pl-11 pr-16 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#253158]/20 focus:border-[#253158] transition-all"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-medium text-gray-400 hover:text-gray-600 transition-colors"
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
                    className="w-full h-12 bg-[#c6352e] hover:bg-[#b02e28] active:bg-[#9e2822] disabled:opacity-60 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-xl transition-colors mt-1"
                  >
                    {loading ? "Verificando..." : "Ingresar al portal"}
                  </button>
                </form>
              </div>
            </div>

            {/* Footer */}
            <p className="text-center text-xs text-gray-400 mt-5">
              © Solterra {new Date().getFullYear()} — Uso interno
            </p>
          </div>
        </div>
    </div>
  );
}
