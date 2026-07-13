-- CreateTable
CREATE TABLE "mant_planes_mantencion" (
    "id" TEXT NOT NULL,
    "correlativo" INTEGER NOT NULL,
    "anio" INTEGER NOT NULL DEFAULT 0,
    "equipo_id" TEXT NOT NULL,
    "registro_id" TEXT,
    "responsable_id" TEXT NOT NULL,
    "plan" TEXT NOT NULL,
    "descripcion" TEXT NOT NULL,
    "fecha_planificada" DATE,
    "horometro_referencia" DECIMAL(10,2),
    "observaciones" TEXT,
    "estado" TEXT NOT NULL DEFAULT 'Planificado',
    "orden_trabajo_id" TEXT,
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "mant_planes_mantencion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "mant_planes_mantencion_equipo_id_idx" ON "mant_planes_mantencion"("equipo_id");

-- CreateIndex
CREATE INDEX "mant_planes_mantencion_estado_idx" ON "mant_planes_mantencion"("estado");

-- CreateIndex
CREATE INDEX "mant_planes_mantencion_deleted_at_created_at_idx" ON "mant_planes_mantencion"("deleted_at", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "mant_planes_mantencion_correlativo_anio_key" ON "mant_planes_mantencion"("correlativo", "anio");

-- AddForeignKey
ALTER TABLE "mant_planes_mantencion" ADD CONSTRAINT "mant_planes_mantencion_equipo_id_fkey" FOREIGN KEY ("equipo_id") REFERENCES "mant_equipos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mant_planes_mantencion" ADD CONSTRAINT "mant_planes_mantencion_registro_id_fkey" FOREIGN KEY ("registro_id") REFERENCES "mant_partes_diarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mant_planes_mantencion" ADD CONSTRAINT "mant_planes_mantencion_responsable_id_fkey" FOREIGN KEY ("responsable_id") REFERENCES "profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mant_planes_mantencion" ADD CONSTRAINT "mant_planes_mantencion_orden_trabajo_id_fkey" FOREIGN KEY ("orden_trabajo_id") REFERENCES "mant_mantenciones"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- RLS: alinear con las otras tablas mant_* (acceso para cualquier usuario
-- autenticado). Sin esto, la tabla nacería sin Row Level Security y quedaría
-- con política distinta al resto del módulo Mantención.
ALTER TABLE "mant_planes_mantencion" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "mant_planes_mantencion_authenticated" ON "mant_planes_mantencion"
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
