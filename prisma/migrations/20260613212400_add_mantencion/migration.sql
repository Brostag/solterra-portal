-- ============================================================
-- Migración: add_mantencion
-- Módulos Mantención / Operación — tablas mant_* (uuid, aisladas).
-- Aditiva: no toca tablas financieras, no hay DROP/TRUNCATE/DELETE.
-- Generada offline con `prisma migrate diff` (baseline -> schema nuevo).
-- ============================================================

-- CreateEnum
CREATE TYPE "Area" AS ENUM ('OPERACIONES', 'MANTENCION');

-- AlterTable
ALTER TABLE "profiles" ADD COLUMN     "area" "Area";

-- CreateTable
CREATE TABLE "mant_equipos" (
    "id" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "marca" TEXT,
    "modelo" TEXT,
    "numero_serie" TEXT,
    "patente" TEXT,
    "anio" INTEGER,
    "horometro_actual" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "km_actual" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "estado" TEXT NOT NULL DEFAULT 'Activo',
    "imagen_url" TEXT,
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "mant_equipos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mant_partes_diarios" (
    "id" TEXT NOT NULL,
    "equipo_id" TEXT NOT NULL,
    "operador_id" TEXT NOT NULL,
    "fecha" DATE NOT NULL,
    "horometro_inicio" DECIMAL(10,2),
    "horometro_fin" DECIMAL(10,2),
    "km_inicio" DECIMAL(10,2),
    "km_fin" DECIMAL(10,2),
    "combustible_litros" DECIMAL(8,2),
    "aceite_litros" DECIMAL(8,2),
    "descripcion_trabajo" TEXT,
    "observaciones" TEXT,
    "estado" TEXT NOT NULL DEFAULT 'Pendiente',
    "firma_operador_b64" TEXT,
    "firma_encargado_b64" TEXT,
    "foto_urls" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "mant_partes_diarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mant_mantenciones" (
    "id" TEXT NOT NULL,
    "equipo_id" TEXT NOT NULL,
    "responsable_id" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "fecha_inicio" TIMESTAMP(3) NOT NULL,
    "fecha_fin" TIMESTAMP(3),
    "horometro_realizada" DECIMAL(10,2),
    "descripcion" TEXT NOT NULL,
    "trabajos_realizados" TEXT,
    "repuestos_usados" TEXT,
    "costo" DECIMAL(12,2),
    "proxima_mantencion_horometro" DECIMAL(10,2),
    "proxima_mantencion_fecha" DATE,
    "estado" TEXT NOT NULL DEFAULT 'En Proceso',
    "observaciones" TEXT,
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "mant_mantenciones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mant_checklists" (
    "id" TEXT NOT NULL,
    "equipo_id" TEXT NOT NULL,
    "operador_id" TEXT NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "nivel_aceite" BOOLEAN,
    "nivel_combustible" BOOLEAN,
    "nivel_agua_radiador" BOOLEAN,
    "nivel_hidraulico" BOOLEAN,
    "presion_neumaticos" BOOLEAN,
    "luces_funcionan" BOOLEAN,
    "frenos_funcionan" BOOLEAN,
    "cinturon_seguridad" BOOLEAN,
    "extintor_presente" BOOLEAN,
    "documentacion_vigente" BOOLEAN,
    "limpieza_cabina" BOOLEAN,
    "alarma_retroceso" BOOLEAN,
    "estado_cucharas" BOOLEAN,
    "fugas_aceite" BOOLEAN,
    "fugas_combustible" BOOLEAN,
    "estado_general" TEXT NOT NULL DEFAULT 'Apto',
    "observaciones" TEXT,
    "firma_operador_b64" TEXT,
    "anulado_at" TIMESTAMP(3),
    "motivo_anulacion" TEXT,
    "anulado_por_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "mant_checklists_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mant_certificados" (
    "id" TEXT NOT NULL,
    "equipo_id" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "numero" TEXT,
    "fecha_emision" DATE,
    "fecha_vencimiento" DATE NOT NULL,
    "empresa_emisora" TEXT,
    "observaciones" TEXT,
    "documento_url" TEXT,
    "firma_encargado_b64" TEXT,
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "mant_certificados_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "mant_equipos_codigo_key" ON "mant_equipos"("codigo");

-- CreateIndex
CREATE INDEX "mant_equipos_estado_idx" ON "mant_equipos"("estado");

-- CreateIndex
CREATE INDEX "mant_equipos_updated_at_idx" ON "mant_equipos"("updated_at");

-- CreateIndex
CREATE INDEX "mant_partes_diarios_equipo_id_idx" ON "mant_partes_diarios"("equipo_id");

-- CreateIndex
CREATE INDEX "mant_partes_diarios_operador_id_idx" ON "mant_partes_diarios"("operador_id");

-- CreateIndex
CREATE INDEX "mant_partes_diarios_fecha_idx" ON "mant_partes_diarios"("fecha");

-- CreateIndex
CREATE INDEX "mant_partes_diarios_updated_at_idx" ON "mant_partes_diarios"("updated_at");

-- CreateIndex
CREATE INDEX "mant_mantenciones_equipo_id_idx" ON "mant_mantenciones"("equipo_id");

-- CreateIndex
CREATE INDEX "mant_mantenciones_estado_idx" ON "mant_mantenciones"("estado");

-- CreateIndex
CREATE INDEX "mant_mantenciones_updated_at_idx" ON "mant_mantenciones"("updated_at");

-- CreateIndex
CREATE INDEX "mant_checklists_equipo_id_idx" ON "mant_checklists"("equipo_id");

-- CreateIndex
CREATE INDEX "mant_checklists_operador_id_idx" ON "mant_checklists"("operador_id");

-- CreateIndex
CREATE INDEX "mant_checklists_fecha_idx" ON "mant_checklists"("fecha");

-- CreateIndex
CREATE INDEX "mant_checklists_updated_at_idx" ON "mant_checklists"("updated_at");

-- CreateIndex
CREATE INDEX "mant_certificados_equipo_id_idx" ON "mant_certificados"("equipo_id");

-- CreateIndex
CREATE INDEX "mant_certificados_fecha_vencimiento_idx" ON "mant_certificados"("fecha_vencimiento");

-- CreateIndex
CREATE INDEX "mant_certificados_updated_at_idx" ON "mant_certificados"("updated_at");

-- AddForeignKey
ALTER TABLE "mant_partes_diarios" ADD CONSTRAINT "mant_partes_diarios_equipo_id_fkey" FOREIGN KEY ("equipo_id") REFERENCES "mant_equipos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mant_partes_diarios" ADD CONSTRAINT "mant_partes_diarios_operador_id_fkey" FOREIGN KEY ("operador_id") REFERENCES "profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mant_mantenciones" ADD CONSTRAINT "mant_mantenciones_equipo_id_fkey" FOREIGN KEY ("equipo_id") REFERENCES "mant_equipos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mant_mantenciones" ADD CONSTRAINT "mant_mantenciones_responsable_id_fkey" FOREIGN KEY ("responsable_id") REFERENCES "profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mant_checklists" ADD CONSTRAINT "mant_checklists_equipo_id_fkey" FOREIGN KEY ("equipo_id") REFERENCES "mant_equipos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mant_checklists" ADD CONSTRAINT "mant_checklists_operador_id_fkey" FOREIGN KEY ("operador_id") REFERENCES "profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mant_checklists" ADD CONSTRAINT "mant_checklists_anulado_por_id_fkey" FOREIGN KEY ("anulado_por_id") REFERENCES "profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mant_certificados" ADD CONSTRAINT "mant_certificados_equipo_id_fkey" FOREIGN KEY ("equipo_id") REFERENCES "mant_equipos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ============================================================
-- RLS — tablas de Mantención/Operación
-- El cliente offline escribe DIRECTO a Supabase REST con la anon key +
-- sesión del usuario, por eso estas tablas REQUIEREN RLS habilitado
-- (a diferencia de las tablas del Comercial, que se acceden vía Prisma
-- en el servidor). v1: acceso para cualquier usuario autenticado.
-- El scope por área (OPERACIONES / MANTENCION) se endurece en Fase 6.
-- ============================================================
ALTER TABLE "mant_equipos" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "mant_partes_diarios" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "mant_mantenciones" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "mant_checklists" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "mant_certificados" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "mant_equipos_authenticated" ON "mant_equipos"
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "mant_partes_diarios_authenticated" ON "mant_partes_diarios"
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "mant_mantenciones_authenticated" ON "mant_mantenciones"
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "mant_checklists_authenticated" ON "mant_checklists"
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "mant_certificados_authenticated" ON "mant_certificados"
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
