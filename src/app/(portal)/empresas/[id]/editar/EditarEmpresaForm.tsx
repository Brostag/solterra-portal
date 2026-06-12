"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { updateCompany, type UpdateCompanyInput } from "../../actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export interface EmpresaInitial {
  id: string;
  nombre_razon_social: string;
  rut: string;
  giro: string;
  email: string;
  telefono: string;
  direccion: string;
  comuna: string;
  ciudad: string;
  region: string;
  pais: string;
  observaciones: string;
  activo: boolean;
  es_cliente: boolean;
  es_proveedor: boolean;
  es_arrendataria: boolean;
  es_otro: boolean;
  representante_legal: string;
  rut_representante: string;
  cargo_representante: string;
  email_representante: string;
  telefono_representante: string;
  contacto_nombre: string;
  contacto_cargo: string;
  contacto_email: string;
  contacto_telefono: string;
  condicion_pago: string;
  correo_notificaciones: string;
  banco: string;
  tipo_cuenta: string;
  numero_cuenta: string;
  titular_cuenta: string;
  rut_titular_cuenta: string;
}

type RoleKey = "es_cliente" | "es_proveedor" | "es_arrendataria" | "es_otro";

const ROLES: { key: RoleKey; label: string }[] = [
  { key: "es_cliente", label: "Cliente" },
  { key: "es_proveedor", label: "Proveedor" },
  { key: "es_arrendataria", label: "Arrendataria" },
  { key: "es_otro", label: "Otro" },
];

// Campos de texto (todo menos id, activo y roles, que tienen su propio estado).
type TextKey =
  | "nombre_razon_social" | "rut" | "giro" | "email" | "telefono"
  | "direccion" | "comuna" | "ciudad" | "region" | "pais" | "observaciones"
  | "representante_legal" | "rut_representante" | "cargo_representante"
  | "email_representante" | "telefono_representante"
  | "contacto_nombre" | "contacto_cargo" | "contacto_email" | "contacto_telefono"
  | "condicion_pago" | "correo_notificaciones"
  | "banco" | "tipo_cuenta" | "numero_cuenta" | "titular_cuenta" | "rut_titular_cuenta";

interface Props {
  initial: EmpresaInitial;
}

export default function EditarEmpresaForm({ initial }: Props) {
  const router = useRouter();
  const [form, setForm] = useState<Record<TextKey, string>>({
    nombre_razon_social: initial.nombre_razon_social,
    rut: initial.rut,
    giro: initial.giro,
    email: initial.email,
    telefono: initial.telefono,
    direccion: initial.direccion,
    comuna: initial.comuna,
    ciudad: initial.ciudad,
    region: initial.region,
    pais: initial.pais,
    observaciones: initial.observaciones,
    representante_legal: initial.representante_legal,
    rut_representante: initial.rut_representante,
    cargo_representante: initial.cargo_representante,
    email_representante: initial.email_representante,
    telefono_representante: initial.telefono_representante,
    contacto_nombre: initial.contacto_nombre,
    contacto_cargo: initial.contacto_cargo,
    contacto_email: initial.contacto_email,
    contacto_telefono: initial.contacto_telefono,
    condicion_pago: initial.condicion_pago,
    correo_notificaciones: initial.correo_notificaciones,
    banco: initial.banco,
    tipo_cuenta: initial.tipo_cuenta,
    numero_cuenta: initial.numero_cuenta,
    titular_cuenta: initial.titular_cuenta,
    rut_titular_cuenta: initial.rut_titular_cuenta,
  });
  const [roles, setRoles] = useState<Record<RoleKey, boolean>>({
    es_cliente: initial.es_cliente,
    es_proveedor: initial.es_proveedor,
    es_arrendataria: initial.es_arrendataria,
    es_otro: initial.es_otro,
  });
  const [activo, setActivo] = useState(initial.activo);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  function set(name: TextKey, value: string) {
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
    const payload: UpdateCompanyInput = {
      id: initial.id,
      activo,
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
      await updateCompany(payload);
      router.push(`/empresas/${initial.id}`);
      router.refresh();
    } catch (err) {
      setErrors(
        err instanceof Error ? err.message.split("\n") : ["Error al guardar la empresa. Intenta nuevamente."],
      );
      setLoading(false);
    }
  }

  const fld = (name: TextKey, label: string, opts: { type?: string; placeholder?: string; required?: boolean } = {}) => (
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
          <div className="sm:col-span-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={activo} onChange={() => setActivo((v) => !v)}
                className="h-4 w-4 rounded border-gray-300 text-[#253158] focus:ring-2 focus:ring-[#253158]/30 cursor-pointer" />
              <span className="text-sm text-gray-700">Empresa activa</span>
            </label>
            <p className="text-xs text-gray-400 mt-1">Desmárcala para desactivar la empresa sin eliminarla.</p>
          </div>
        </div>
      </div>

      {/* B — Roles */}
      <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6 space-y-3">
        <h2 className="font-semibold text-[#253158]">Roles <span className="text-[#c6352e]">*</span></h2>
        <p className="text-xs text-gray-400 -mt-1">Selecciona al menos uno. Una empresa puede tener varios roles.</p>
        <div className="flex flex-wrap gap-x-6 gap-y-3">
          {ROLES.map((r) => (
            <label key={r.key} className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={roles[r.key]} onChange={() => toggleRole(r.key)}
                className="h-4 w-4 rounded border-gray-300 text-[#253158] focus:ring-2 focus:ring-[#253158]/30 cursor-pointer" />
              <span className="text-sm text-gray-700">{r.label}</span>
            </label>
          ))}
        </div>
      </div>

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

      {errors.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded p-3 space-y-0.5">
          {errors.map((e) => (<p key={e} className="text-sm text-red-600">• {e}</p>))}
        </div>
      )}

      <div className="flex justify-end gap-2">
        <Link href={`/empresas/${initial.id}`}>
          <Button className="bg-white border border-gray-300 text-[#253158] hover:bg-gray-50">Cancelar</Button>
        </Link>
        <Button onClick={handleSubmit} disabled={loading} className="bg-[#253158] hover:bg-[#1e305e] text-white">
          {loading ? "Guardando..." : "Guardar cambios"}
        </Button>
      </div>
    </div>
  );
}
