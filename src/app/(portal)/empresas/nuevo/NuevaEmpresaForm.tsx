"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createCompany, type CreateCompanyInput } from "../actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import Stepper from "@/components/portal/Stepper";

// Pasos del asistente: solo el paso 1 es obligatorio (razón social + roles).
const WIZARD_STEPS = ["Datos generales y roles", "Representante y contacto", "Comercial y bancario"];

type RoleKey = "es_cliente" | "es_proveedor" | "es_arrendataria" | "es_otro";

const ROLES: { key: RoleKey; label: string }[] = [
  { key: "es_cliente", label: "Cliente" },
  { key: "es_proveedor", label: "Proveedor" },
  { key: "es_arrendataria", label: "Arrendataria" },
  { key: "es_otro", label: "Otro" },
];

const EMPTY_FORM = {
  nombre_razon_social: "", rut: "", giro: "", email: "", telefono: "",
  direccion: "", comuna: "", ciudad: "", region: "", pais: "Chile", observaciones: "",
  representante_legal: "", rut_representante: "", cargo_representante: "",
  email_representante: "", telefono_representante: "",
  contacto_nombre: "", contacto_cargo: "", contacto_email: "", contacto_telefono: "",
  condicion_pago: "", correo_notificaciones: "",
  banco: "", tipo_cuenta: "", numero_cuenta: "", titular_cuenta: "", rut_titular_cuenta: "",
};

type FormKey = keyof typeof EMPTY_FORM;

export default function NuevaEmpresaForm() {
  const router = useRouter();
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [roles, setRoles] = useState<Record<RoleKey, boolean>>({
    es_cliente: false, es_proveedor: false, es_arrendataria: false, es_otro: false,
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  // Paso visible del asistente (presentación pura: no afecta el payload).
  const [step, setStep] = useState(1);

  function set(name: FormKey, value: string) {
    setForm((f) => ({ ...f, [name]: value }));
  }
  function toggleRole(key: RoleKey) {
    setRoles((r) => ({ ...r, [key]: !r[key] }));
  }

  function validate(): boolean {
    const errs: string[] = [];
    if (!form.nombre_razon_social.trim()) errs.push("La razón social es obligatoria.");
    if (!ROLES.some((r) => roles[r.key])) errs.push("Selecciona al menos un rol.");
    setErrors(errs);
    return errs.length === 0;
  }

  async function handleSubmit() {
    if (!validate()) return;
    setLoading(true);
    const payload: CreateCompanyInput = {
      nombre_razon_social: form.nombre_razon_social.trim(),
      rut: form.rut || null,
      giro: form.giro || null,
      email: form.email || null,
      telefono: form.telefono || null,
      direccion: form.direccion || null,
      comuna: form.comuna || null,
      ciudad: form.ciudad || null,
      region: form.region || null,
      pais: form.pais || null,
      observaciones: form.observaciones || null,
      es_cliente: roles.es_cliente,
      es_proveedor: roles.es_proveedor,
      es_arrendataria: roles.es_arrendataria,
      es_otro: roles.es_otro,
      representante_legal: form.representante_legal || null,
      rut_representante: form.rut_representante || null,
      cargo_representante: form.cargo_representante || null,
      email_representante: form.email_representante || null,
      telefono_representante: form.telefono_representante || null,
      contacto_nombre: form.contacto_nombre || null,
      contacto_cargo: form.contacto_cargo || null,
      contacto_email: form.contacto_email || null,
      contacto_telefono: form.contacto_telefono || null,
      condicion_pago: form.condicion_pago || null,
      correo_notificaciones: form.correo_notificaciones || null,
      banco: form.banco || null,
      tipo_cuenta: form.tipo_cuenta || null,
      numero_cuenta: form.numero_cuenta || null,
      titular_cuenta: form.titular_cuenta || null,
      rut_titular_cuenta: form.rut_titular_cuenta || null,
    };
    try {
      const result = await createCompany(payload);
      router.push(`/empresas/${result.id}`);
    } catch (err) {
      setErrors(
        err instanceof Error ? err.message.split("\n") : ["Error al guardar la empresa. Intenta nuevamente."],
      );
      setLoading(false);
    }
  }

  const fld = (name: FormKey, label: string, opts: { type?: string; placeholder?: string; required?: boolean } = {}) => (
    <div className="space-y-1.5">
      <Label>{label}{opts.required && <span className="text-[#c6352e]"> *</span>}</Label>
      <Input
        type={opts.type ?? "text"}
        value={form[name]}
        placeholder={opts.placeholder}
        onChange={(e) => set(name, e.target.value)}
      />
    </div>
  );

  return (
    <div className="space-y-6">
      <Stepper steps={WIZARD_STEPS} current={step} />

      {step === 1 && (<>
      {/* A — Datos generales */}
      <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6 space-y-4">
        <h2 className="font-semibold text-[#253158]">Datos generales</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">{fld("nombre_razon_social", "Nombre / Razón social", { required: true })}</div>
          {fld("rut", "RUT", { placeholder: "76.123.456-7" })}
          {fld("giro", "Giro")}
          {fld("email", "Email", { type: "email" })}
          {fld("telefono", "Teléfono")}
          <div className="sm:col-span-2">{fld("direccion", "Dirección")}</div>
          {fld("comuna", "Comuna")}
          {fld("ciudad", "Ciudad")}
          {fld("region", "Región")}
          {fld("pais", "País")}
          <div className="sm:col-span-2 space-y-1.5">
            <Label>Observaciones</Label>
            <textarea value={form.observaciones} onChange={(e) => set("observaciones", e.target.value)} rows={2}
              className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#253158]/20 focus:border-[#253158]" />
          </div>
        </div>
      </div>

      {/* B — Roles (chips toggle: mismo estado `roles`, mismo toggleRole) */}
      <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6 space-y-3">
        <h2 className="font-semibold text-[#253158]">Roles <span className="text-[#c6352e]">*</span></h2>
        <p className="text-xs text-gray-400 -mt-1">Selecciona al menos uno. Una empresa puede tener varios roles.</p>
        <div className="flex flex-wrap gap-2">
          {ROLES.map((r) => (
            <button
              key={r.key}
              type="button"
              onClick={() => toggleRole(r.key)}
              className={cn(
                "inline-flex items-center gap-2 rounded-[10px] border-[1.5px] px-4 py-2.5 text-sm font-medium transition-colors",
                roles[r.key]
                  ? "border-[#253158] bg-[#253158]/5 font-semibold text-[#253158]"
                  : "border-gray-200 bg-white text-gray-700 hover:border-[#253158]"
              )}
            >
              <span className={cn("flex h-[18px] w-[18px] items-center justify-center rounded-full border-[1.5px]", roles[r.key] ? "border-[#253158] bg-[#253158] text-white" : "border-gray-300 text-transparent")}>
                <Check className="h-3 w-3" />
              </span>
              {r.label}
            </button>
          ))}
        </div>
      </div>
      </>)}

      {step === 2 && (<>
      {/* C — Representante legal */}
      <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6 space-y-4">
        <h2 className="font-semibold text-[#253158]">Representante legal</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {fld("representante_legal", "Nombre completo")}
          {fld("rut_representante", "Cédula", { placeholder: "12.345.678-9" })}
          {fld("cargo_representante", "Cargo")}
          {fld("email_representante", "Email", { type: "email" })}
          {fld("telefono_representante", "Teléfono")}
        </div>
      </div>

      {/* D — Contacto comercial */}
      <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6 space-y-4">
        <h2 className="font-semibold text-[#253158]">Contacto comercial</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {fld("contacto_nombre", "Nombre")}
          {fld("contacto_cargo", "Cargo")}
          {fld("contacto_email", "Email", { type: "email" })}
          {fld("contacto_telefono", "Teléfono")}
        </div>
      </div>
      </>)}

      {step === 3 && (<>
      {/* E — Datos comerciales */}
      <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6 space-y-4">
        <h2 className="font-semibold text-[#253158]">Datos comerciales</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {fld("condicion_pago", "Condición de pago", { placeholder: "30 días, anticipado..." })}
          {fld("correo_notificaciones", "Correo para notificaciones", { type: "email" })}
        </div>
      </div>

      {/* F — Datos bancarios */}
      <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6 space-y-4">
        <h2 className="font-semibold text-[#253158]">Datos bancarios</h2>
        <p className="text-xs text-gray-400 -mt-2">Principalmente para empresas proveedoras.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {fld("banco", "Banco")}
          {fld("tipo_cuenta", "Tipo de cuenta", { placeholder: "Corriente / Vista" })}
          {fld("numero_cuenta", "N° de cuenta")}
          {fld("titular_cuenta", "Titular de la cuenta")}
          {fld("rut_titular_cuenta", "RUT del titular")}
        </div>
      </div>
      </>)}

      {errors.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded p-3 space-y-0.5">
          {errors.map((e) => (<p key={e} className="text-sm text-red-600">• {e}</p>))}
        </div>
      )}

      {/* Footer del asistente. La validación del paso 1 es la validate()
          existente (razón social + rol); C–F son opcionales, por eso
          "Guardar Empresa" está disponible desde el paso 2. */}
      <div className="flex justify-between gap-2 bg-white rounded-xl shadow-sm px-5 py-4">
        <Button type="button" variant="outline" disabled={step === 1} onClick={() => setStep(step - 1)}>
          ← Atrás
        </Button>
        <div className="flex gap-2">
          <Link href="/empresas">
            <Button type="button" className="bg-white border border-gray-300 text-[#253158] hover:bg-gray-50">Cancelar</Button>
          </Link>
          {step < 3 && (
            <Button
              type="button"
              className="bg-[#253158] hover:bg-[#1e305e] text-white"
              onClick={() => { if (step !== 1 || validate()) setStep(step + 1); }}
            >
              Siguiente →
            </Button>
          )}
          {step >= 2 && (
            <Button
              onClick={handleSubmit}
              disabled={loading}
              className={step === 3 ? "bg-[#253158] hover:bg-[#1e305e] text-white" : "bg-white border border-gray-300 text-[#253158] hover:bg-gray-50"}
            >
              {loading ? "Guardando..." : "Guardar Empresa"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
