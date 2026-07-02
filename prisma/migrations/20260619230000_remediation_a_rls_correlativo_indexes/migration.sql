-- Tanda A de remediación: RLS en las 2 tablas de documentos faltantes,
-- unicidad de correlativo por año, e índices de soft-delete. 100% aditivo.

-- AlterTable: columna año para unicidad de correlativo por año (tablas vacías).
ALTER TABLE "mant_certificados_mantencion" ADD COLUMN     "anio" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "mant_checklists_mantencion" ADD COLUMN     "anio" INTEGER NOT NULL DEFAULT 0;

-- CreateIndex
CREATE INDEX "mant_certificados_deleted_at_fecha_vencimiento_idx" ON "mant_certificados"("deleted_at", "fecha_vencimiento");

-- CreateIndex
CREATE UNIQUE INDEX "mant_certificados_mantencion_correlativo_anio_key" ON "mant_certificados_mantencion"("correlativo", "anio");

-- CreateIndex
CREATE UNIQUE INDEX "mant_checklists_mantencion_correlativo_anio_key" ON "mant_checklists_mantencion"("correlativo", "anio");

-- CreateIndex
CREATE INDEX "mant_equipos_deleted_at_updated_at_idx" ON "mant_equipos"("deleted_at", "updated_at");

-- CreateIndex
CREATE INDEX "mant_mantenciones_deleted_at_fecha_inicio_idx" ON "mant_mantenciones"("deleted_at", "fecha_inicio");

-- CreateIndex
CREATE INDEX "mant_partes_diarios_deleted_at_fecha_idx" ON "mant_partes_diarios"("deleted_at", "fecha");

-- RLS: las 2 tablas de documentos (creadas en 20260616010000) quedaron sin
-- Row Level Security. Se alinean con las otras 5 tablas mant_* (authenticated).
ALTER TABLE "mant_checklists_mantencion" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "mant_certificados_mantencion" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "mant_checklists_mantencion_authenticated" ON "mant_checklists_mantencion"
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "mant_certificados_mantencion_authenticated" ON "mant_certificados_mantencion"
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
