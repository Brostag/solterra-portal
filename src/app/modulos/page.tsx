import { redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Building2, Settings, Package, ArrowRight } from "lucide-react";
import { getPortalSessionFast } from "@/lib/auth/session";
import { allowedModules, MODULE_META, type Module } from "@/lib/modules";

const ICONS: Record<Module, typeof Building2> = {
  COMERCIAL: Building2,
  MANTENCION: Settings,
  OPERACION: Package,
};

export default async function ModulosPage() {
  const session = await getPortalSessionFast();
  if (!session) redirect("/login");

  const mods = allowedModules(session.rol, session.area);
  // Un solo módulo permitido → entra directo, sin pasar por el selector.
  if (mods.length === 1) redirect(MODULE_META[mods[0]].home);

  const primerNombre = session.nombre.split(" ")[0];

  return (
    <main className="min-h-screen bg-[#f6f7f9] border-t-[3px] border-[#c6352e]">
      <div className="mx-auto flex min-h-screen max-w-5xl flex-col px-4 py-10 sm:px-6 sm:py-16">
        <header className="mb-10 text-center">
          <Image
            src="/solterra-logo.png"
            alt="Solterra"
            width={170}
            height={52}
            className="mx-auto mb-8 h-11 w-auto object-contain"
            priority
          />
          <h1 className="text-2xl font-bold text-[#253158] sm:text-3xl">
            Hola, {primerNombre}
          </h1>
          <p className="mt-2 text-sm text-gray-500">
            Selecciona el módulo al que quieres entrar
          </p>
        </header>

        <div className="grid flex-1 content-start gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {mods.map((m) => {
            const Icon = ICONS[m];
            const meta = MODULE_META[m];
            return (
              <Link
                key={m}
                href={meta.home}
                className="group flex flex-col rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:border-[#253158]/30 hover:shadow-md"
              >
                <span className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-[#253158]/10 text-[#253158]">
                  <Icon className="h-6 w-6" />
                </span>
                <h2 className="mt-5 text-lg font-bold text-[#253158]">{meta.titulo}</h2>
                <p className="mt-1.5 flex-1 text-sm leading-relaxed text-gray-500">
                  {meta.subtitulo}
                </p>
                <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-[#c6352e]">
                  Entrar
                  <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </main>
  );
}
