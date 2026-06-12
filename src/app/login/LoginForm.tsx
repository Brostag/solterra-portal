"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { ArrowRight, FileText, Lock, Mail, ShieldCheck, Smartphone } from "lucide-react";

const FEATURES = [
  { Icon: ShieldCheck, text: "Acceso seguro por roles para todo el equipo" },
  { Icon: FileText, text: "Contratos, cotizaciones y órdenes de compra en un solo lugar" },
  { Icon: Smartphone, text: "Pensado para terreno: úsalo desde el celular" },
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
    <div className="min-h-screen w-full grid lg:grid-cols-[1.22fr_1fr] border-t-[3px] border-[#c6352e]">

      {/* ── Panel izquierdo ── */}
      <div
        className="hidden lg:flex flex-col relative overflow-hidden"
        style={{ background: "linear-gradient(145deg, #243561 0%, #1b2a4e 55%, #14213d 100%)" }}
      >
        {/* Patrón diagonal sutil */}
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: "repeating-linear-gradient(45deg, #fff 0, #fff 1px, transparent 0, transparent 50%)",
            backgroundSize: "24px 24px",
          }}
        />
        {/* Degradado inferior */}
        <div className="absolute bottom-0 inset-x-0 h-56 bg-gradient-to-t from-[#0f1a2e]/60 to-transparent" />

        {/* Contenido centrado verticalmente */}
        <div className="relative z-10 flex-1 flex flex-col justify-center px-16 py-14">
          <div className="w-full max-w-[520px] mx-auto">
            <Image
              src="/solterra-logo.png"
              alt="Solterra"
              width={210}
              height={72}
              className="h-[60px] w-auto object-contain mb-9"
            />
            <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/5 px-3.5 py-1.5 text-[11px] font-semibold tracking-[0.18em] text-white/80 uppercase mb-6">
              Portal interno
            </span>
            <p className="text-[#e05a54] text-[11px] font-semibold tracking-[0.22em] uppercase mb-4">
              Sistema administrativo
            </p>
            <h2 className="text-[42px] font-bold text-white leading-[1.08] mb-6">
              Gestión interna<br />
              <em className="not-italic">de Solterra</em>
            </h2>
            <p className="text-white/60 text-lg leading-relaxed mb-9 max-w-[440px]">
              Gestiona contratos, cotizaciones, órdenes de compra, empresas y documentos
              desde un mismo lugar — en oficina, en faena o desde el celular.
            </p>
            <ul className="space-y-4">
              {FEATURES.map(({ Icon, text }) => (
                <li key={text} className="flex items-center gap-4">
                  <span className="h-10 w-10 rounded-xl bg-white/8 border border-white/15 flex items-center justify-center flex-shrink-0">
                    <Icon className="h-[18px] w-[18px] text-white/85" />
                  </span>
                  <span className="text-white/75 text-[16px]">{text}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Footer izquierdo */}
        <div className="relative z-10 px-16 pb-8">
          <div className="border-t border-white/10 pt-5 max-w-[520px] mx-auto flex items-center justify-between gap-4">
            <span className="inline-flex items-center gap-2 rounded-full bg-emerald-500/10 border border-emerald-400/25 px-3 py-1 text-[11px] font-medium text-emerald-300">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60 animate-ping" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
              </span>
              Sistema operativo
            </span>
            <p className="text-white/25 text-[11px]">
              Calama · Región de Antofagasta · Chile
            </p>
          </div>
        </div>
      </div>

      {/* ── Panel derecho ── */}
      <div className="flex flex-col items-center justify-start sm:justify-center bg-[#f6f7f9] px-4 sm:px-10 pt-12 pb-6 sm:py-12 overflow-y-auto">

        {/* Logo en mobile */}
        <div className="flex justify-center mb-4 sm:mb-8 lg:hidden">
          <Image src="https://ext.same-assets.com/2134444905/2150008532.png" alt="Solterra Logo" width={150} height={50} className="h-12 w-auto" />
        </div>

        {/* Tarjeta */}
        <div className="w-full max-w-[480px]">
          <div className="bg-white rounded-2xl border border-gray-200 shadow-[0_24px_60px_-20px_rgba(20,33,61,0.28),0_2px_8px_rgba(20,33,61,0.06)] overflow-hidden">

            {/* Encabezado */}
            <div className="px-6 pt-8 pb-5 sm:px-12 sm:pt-10 sm:pb-6">
              <h1 className="text-[28px] font-bold text-[#1b2a4e] leading-tight tracking-tight">
                Iniciar sesión
              </h1>
              <p className="text-sm text-gray-400 mt-1.5">
                Ingresa con tu cuenta corporativa
              </p>
              <div className="mt-5 border-b border-gray-100" />
            </div>

            {/* Formulario */}
            <div className="px-6 pb-8 sm:px-12 sm:pb-12 space-y-5">
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
                      autoComplete="email"
                      className="w-full h-[46px] pl-11 pr-4 border border-gray-200 rounded-lg text-sm bg-[#f8f9fb] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1b2a4e]/15 focus:border-[#1b2a4e] transition-all"
                    />
                  </div>
                </div>

                {/* Contraseña */}
                <div className="space-y-2">
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
                      autoComplete="current-password"
                      className="w-full h-[46px] pl-11 pr-16 border border-gray-200 rounded-lg text-sm bg-[#f8f9fb] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1b2a4e]/15 focus:border-[#1b2a4e] transition-all"
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

                {/* Recuérdame: la sesión de Supabase ya persiste en este equipo;
                    el control es informativo y no altera el submit. */}
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    defaultChecked
                    className="h-4 w-4 rounded border-gray-300 accent-[#253158] cursor-pointer"
                  />
                  <span className="text-sm text-gray-500">Recuérdame en este equipo</span>
                </label>

                {error && (
                  <div className="text-sm text-[#c6352e] bg-red-50 border border-red-100 px-4 py-3 rounded-lg">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full h-12 flex items-center justify-center gap-2 bg-[#c6352e] hover:bg-[#a82a24] active:bg-[#9e2822] disabled:opacity-60 disabled:cursor-not-allowed text-white text-base font-semibold rounded-lg transition-colors mt-1"
                >
                  {loading ? "Verificando..." : "Ingresar al portal"}
                  {!loading && <ArrowRight className="h-[18px] w-[18px]" />}
                </button>
              </form>
            </div>
          </div>

          {/* Footer */}
          <p className="text-center text-xs text-gray-400 mt-5">
            ¿Problemas para entrar? Escríbenos a{" "}
            <a href="mailto:maquinarias@solterra.cl" className="text-[#253158] hover:underline">maquinarias@solterra.cl</a>
          </p>
          <p className="text-center text-[11px] text-gray-300 mt-1.5">
            © Solterra {new Date().getFullYear()} — Uso interno
          </p>
        </div>
      </div>
    </div>
  );
}
