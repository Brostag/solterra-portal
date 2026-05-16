import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import { saveConfig } from "./actions";
import { Button } from "@/components/ui/button";
import { SubmitButton } from "@/components/portal/SubmitButton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SelectField } from "@/components/portal/SelectField";

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

  const session = await getSession();
  if (!session) redirect("/login");
  if (session.rol !== "ADMINISTRADOR") redirect("/dashboard");

  const config = await prisma.companySettings.findFirst();

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#253158]">Configuración de Empresa</h1>
        <p className="text-gray-500 text-sm mt-1">
          Estos datos se usarán en todas las facturas PDF generadas
        </p>
      </div>

      {guardado && (
        <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-3 text-sm text-green-700">
          Configuración guardada correctamente
        </div>
      )}

      <div className="bg-white rounded-lg border p-6">
        <form action={saveConfig} className="space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 space-y-2">
              <Label htmlFor="razon_social">
                Razón Social <span className="text-[#c6352e]">*</span>
              </Label>
              <Input
                id="razon_social"
                name="razon_social"
                required
                defaultValue={config?.razon_social ?? ""}
                placeholder="Solterra SpA"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="rut">RUT <span className="text-[#c6352e]">*</span></Label>
              <Input id="rut" name="rut" required defaultValue={config?.rut ?? ""} placeholder="76.123.456-7" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="giro">Giro</Label>
              <Input id="giro" name="giro" defaultValue={config?.giro ?? ""} placeholder="Movimiento de Tierra" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" defaultValue={config?.email ?? ""} placeholder="contacto@solterra.cl" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="telefono">Teléfono</Label>
              <Input id="telefono" name="telefono" defaultValue={config?.telefono ?? ""} placeholder="+56 55 242 6259" />
            </div>
            <div className="col-span-2 space-y-2">
              <Label htmlFor="direccion">Dirección</Label>
              <Input id="direccion" name="direccion" defaultValue={config?.direccion ?? ""} placeholder="Calle Juan Zaldívar sitio 20, Calama" />
            </div>
            <div className="col-span-2 space-y-2">
              <Label htmlFor="logo_url">URL del Logo</Label>
              <Input
                id="logo_url"
                name="logo_url"
                type="url"
                defaultValue={config?.logo_url ?? ""}
                placeholder="https://ejemplo.com/logo.png"
              />
              <p className="text-xs text-gray-400">URL pública de la imagen del logo (aparecerá en los PDF)</p>
            </div>
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
            </div>
          </div>

          <SubmitButton label="Guardar Configuración" loadingLabel="Guardando..." />
        </form>
      </div>
    </div>
  );
}

