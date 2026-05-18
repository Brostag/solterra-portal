import { getCompanySettings } from "@/lib/company-settings";
import { getPortalSessionFast } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import { saveConfig } from "./actions";
import { SubmitButton } from "@/components/portal/SubmitButton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SelectField } from "@/components/portal/SelectField";
import { Building2, Mail, Receipt, CheckCircle2, Info } from "lucide-react";

const MONEDA_OPTIONS = [
  { value: "CLP", label: "CLP — Peso Chileno" },
  { value: "USD", label: "USD — Dólar" },
  { value: "UF", label: "UF — Unidad de Fomento" },
];

interface Props {
  searchParams: Promise<{ guardado?: string }>;
}

export default async function ConfiguracionPage({ searchParams }: Props) {
  const sp = await searchParams;
  const guardado = sp.guardado === "1";

  const [session, config] = await Promise.all([
    getPortalSessionFast(),
    getCompanySettings(),
  ]);
  if (!session) redirect("/login");
  if (session.rol !== "ADMINISTRADOR") redirect("/dashboard");

  return (
    <div className="max-w-3xl space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-[#253158]">Configuración</h1>
        <p className="text-gray-500 text-sm mt-1">
          Datos de la empresa usados en facturas, órdenes de compra y documentos PDF
        </p>
      </div>

      {guardado && (
        <div className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-xl px-4 py-3 text-sm text-green-700">
          <CheckCircle2 className="h-4 w-4 flex-shrink-0 text-green-500" />
          Configuración guardada correctamente
        </div>
      )}

      <form action={saveConfig} className="space-y-6">
        {/* Sección 1: Identidad */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-100 bg-gray-50">
            <div className="h-8 w-8 rounded-lg bg-[#253158]/10 flex items-center justify-center">
              <Building2 className="h-4 w-4 text-[#253158]" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-800">Identidad de la empresa</p>
              <p className="text-xs text-gray-400">Nombre legal y RUT — se muestran como emisor en facturas y PDFs</p>
            </div>
          </div>
          <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div className="sm:col-span-2 space-y-2">
              <Label htmlFor="razon_social">
                Razón Social <span className="text-[#c6352e]">*</span>
              </Label>
              <Input
                id="razon_social"
                name="razon_social"
                required
                defaultValue={config?.razon_social ?? ""}
                placeholder="Ej: Solterra Movimiento de Tierra SpA"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="rut">
                RUT <span className="text-[#c6352e]">*</span>
              </Label>
              <Input
                id="rut"
                name="rut"
                required
                defaultValue={config?.rut ?? ""}
                placeholder="76.123.456-7"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="giro">Giro</Label>
              <Input
                id="giro"
                name="giro"
                defaultValue={config?.giro ?? ""}
                placeholder="Movimiento de Tierra y Maquinarias"
              />
            </div>
            <div className="sm:col-span-2 space-y-2">
              <Label htmlFor="logo_url">URL del Logo</Label>
              <Input
                id="logo_url"
                name="logo_url"
                type="url"
                defaultValue={config?.logo_url ?? ""}
                placeholder="https://ejemplo.com/logo.png"
              />
              <p className="text-xs text-gray-400">
                Dirección web pública de la imagen — se imprime en el encabezado de todos los PDFs generados
              </p>
            </div>
          </div>
        </div>

        {/* Sección 2: Contacto */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-100 bg-gray-50">
            <div className="h-8 w-8 rounded-lg bg-[#253158]/10 flex items-center justify-center">
              <Mail className="h-4 w-4 text-[#253158]" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-800">Información de contacto</p>
              <p className="text-xs text-gray-400">Aparecen en el pie de página de los documentos PDF</p>
            </div>
          </div>
          <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                defaultValue={config?.email ?? ""}
                placeholder="contacto@solterra.cl"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="telefono">Teléfono</Label>
              <Input
                id="telefono"
                name="telefono"
                defaultValue={config?.telefono ?? ""}
                placeholder="+56 55 242 6259"
              />
            </div>
            <div className="sm:col-span-2 space-y-2">
              <Label htmlFor="direccion">Dirección</Label>
              <Input
                id="direccion"
                name="direccion"
                defaultValue={config?.direccion ?? ""}
                placeholder="Calle Juan Zaldívar sitio 20, Calama"
              />
            </div>
          </div>
        </div>

        {/* Sección 3: Facturación */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-100 bg-gray-50">
            <div className="h-8 w-8 rounded-lg bg-[#253158]/10 flex items-center justify-center">
              <Receipt className="h-4 w-4 text-[#253158]" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-800">Configuración fiscal</p>
              <p className="text-xs text-gray-400">Valores por defecto al crear facturas y órdenes de compra</p>
            </div>
          </div>
          <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div className="space-y-2">
              <Label>Moneda Principal</Label>
              <SelectField
                id="moneda_principal"
                name="moneda_principal"
                defaultValue={config?.moneda_principal ?? "CLP"}
                options={MONEDA_OPTIONS}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="iva_porcentaje">
                IVA (%) <span className="text-[#c6352e]">*</span>
              </Label>
              <Input
                id="iva_porcentaje"
                name="iva_porcentaje"
                type="number"
                min="0"
                max="100"
                step="0.01"
                required
                defaultValue={config ? String(config.iva_porcentaje) : "19"}
              />
              <p className="text-xs text-gray-400">
                Se usa para calcular IVA al crear nuevas facturas y órdenes de compra (Chile: 19%)
              </p>
            </div>
          </div>
        </div>

        {/* Bloque informativo */}
        <div className="bg-blue-50 rounded-xl border border-blue-100 p-5">
          <div className="flex items-center gap-2 mb-3">
            <Info className="h-4 w-4 text-blue-500 flex-shrink-0" />
            <p className="text-sm font-semibold text-blue-800">¿Dónde se usa esta configuración?</p>
          </div>
          <ul className="space-y-2 text-sm text-blue-700">
            <li className="flex gap-2">
              <span className="text-blue-400 flex-shrink-0 mt-0.5">·</span>
              <span><strong>Datos de empresa</strong> (Razón Social, RUT, Giro): aparecen como emisor en facturas, órdenes de compra y documentos PDF.</span>
            </li>
            <li className="flex gap-2">
              <span className="text-blue-400 flex-shrink-0 mt-0.5">·</span>
              <span><strong>Logo</strong>: se imprime en el encabezado de todos los documentos PDF generados por el sistema.</span>
            </li>
            <li className="flex gap-2">
              <span className="text-blue-400 flex-shrink-0 mt-0.5">·</span>
              <span><strong>Contacto</strong> (email, teléfono, dirección): aparecen en el pie de página de los PDFs.</span>
            </li>
            <li className="flex gap-2">
              <span className="text-blue-400 flex-shrink-0 mt-0.5">·</span>
              <span><strong>IVA (%)</strong>: valor por defecto al calcular totales en nuevas facturas y órdenes de compra.</span>
            </li>
            <li className="flex gap-2">
              <span className="text-blue-400 flex-shrink-0 mt-0.5">·</span>
              <span>Los cambios se aplican únicamente a los documentos generados <strong>después de guardar</strong>.</span>
            </li>
          </ul>
        </div>

        {/* Acciones */}
        <div className="flex justify-end pt-2">
          <SubmitButton label="Guardar Configuración" loadingLabel="Guardando..." />
        </div>
      </form>
    </div>
  );
}
