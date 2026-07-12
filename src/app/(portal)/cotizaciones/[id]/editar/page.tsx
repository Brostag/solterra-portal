import { prisma } from "@/lib/prisma";
import { getPortalSessionFast } from "@/lib/auth/session";
import { getCompanySettings } from "@/lib/company-settings";
import { getCompanyClientsForSelector } from "@/lib/cache/master-lists";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import CotizadorForm from "../../../cotizador/CotizadorForm";
import {
  GASTOS_INICIALES,
  normalizarGastos,
  type CotizadorItem,
  type TipoCotizacion,
} from "@/lib/cotizador";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function EditarCotizacionPage({ params }: Props) {
  const { id } = await params;

  const [session, config, empresas, cotizacion] = await Promise.all([
    getPortalSessionFast(),
    getCompanySettings(),
    getCompanyClientsForSelector(),
    prisma.quotation.findUnique({
      where: { id },
      include: { items: { orderBy: { orden: "asc" } } },
    }),
  ]);
  if (!session) redirect("/login");

  // Solo ADMIN/SUPERVISOR editan; el resto va al detalle (los checks server-side
  // en las actions son la barrera real, esto es solo el gate de navegación).
  const canManage = session.rol === "ADMINISTRADOR" || session.rol === "SUPERVISOR";
  if (!canManage) redirect(`/cotizaciones/${id}`);

  if (!cotizacion) notFound();
  // Solo un borrador se edita: una emitida/anulada vuelve al detalle.
  if (cotizacion.estado !== "BORRADOR") redirect(`/cotizaciones/${id}`);

  const ivaPorcentaje = config ? Number(config.iva_porcentaje) : 19;

  const gastosGuardados = config ? normalizarGastos(config.cotizador_gastos_default) : [];
  const gastosDefault = gastosGuardados.length > 0 ? gastosGuardados : GASTOS_INICIALES;

  const clientes = empresas.map((e) => ({
    id: e.id,
    nombre: e.nombre_razon_social,
    rut: e.rut,
  }));

  // Decimal de Prisma SIEMPRE con Number() al cruzar al client component.
  const items: CotizadorItem[] = cotizacion.items.map((it) => ({
    id:                  it.id,
    equipo:              it.descripcion,
    tipo:                it.tipo as TipoCotizacion,
    valorHora:           Number(it.valor_hora),
    horasMinimasDiarias: it.horas_minimas_diarias,
    cantidadHoras:       Number(it.cantidad_horas),
    cantidadDias:        Number(it.cantidad_dias),
  }));

  // Fechas guardadas por ítem → forma que consume el form (clave = it.id, el
  // mismo id de cada CotizadorItem). Columnas @db.Date: se leen en UTC con
  // toISOString().slice(0,10) para evitar el off-by-one. Solo se incluye el
  // ítem si trae al menos una fecha (cotizaciones viejas quedan sin entrada).
  const fechasPorItem: Record<string, { desde: string; hasta: string }> = {};
  for (const it of cotizacion.items) {
    if (!it.fecha_desde && !it.fecha_hasta) continue;
    fechasPorItem[it.id] = {
      desde: it.fecha_desde ? it.fecha_desde.toISOString().slice(0, 10) : "",
      hasta: it.fecha_hasta ? it.fecha_hasta.toISOString().slice(0, 10) : "",
    };
  }

  const initial = {
    numero:              cotizacion.numero,
    validezDias:         cotizacion.validez_dias,
    clienteId:           cotizacion.company_id,
    porcentajeDescuento: Number(cotizacion.descuento_porcentaje),
    items,
    gastos:              normalizarGastos(cotizacion.gastos),
    fechasPorItem,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href={`/cotizaciones/${id}`}>
          <Button variant="ghost" size="sm" className="flex-shrink-0">
            <ChevronLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-[#253158]">
            Editar cotización {cotizacion.numero}
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Modifica los datos y guarda los cambios. Solo cotizaciones en borrador.
          </p>
        </div>
      </div>

      <CotizadorForm
        ivaPorcentaje={ivaPorcentaje}
        clientes={clientes}
        numeroSugerido={cotizacion.numero}
        gastosDefault={gastosDefault}
        canSaveGastos={canManage}
        quotationId={cotizacion.id}
        initial={initial}
      />
    </div>
  );
}
