-- AlterTable
ALTER TABLE "mant_equipos" ADD COLUMN     "extintor_vencimiento" DATE,
ADD COLUMN     "permiso_circ_vencimiento" DATE,
ADD COLUMN     "rev_tecnica_vencimiento" DATE,
ADD COLUMN     "soap_vencimiento" DATE;

-- AlterTable
ALTER TABLE "mant_partes_diarios" ADD COLUMN     "area_uso" TEXT,
ADD COLUMN     "centro_costo" TEXT,
ADD COLUMN     "combustible_fraccion" TEXT,
ADD COLUMN     "componentes" JSONB,
ADD COLUMN     "fecha_salida" DATE,
ADD COLUMN     "firma_receptor_b64" TEXT,
ADD COLUMN     "fotos_entrada" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "fotos_salida" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "fotos_tablero" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "horometro" DECIMAL(10,2),
ADD COLUMN     "nombre_receptor" TEXT,
ADD COLUMN     "nombre_responsable" TEXT,
ADD COLUMN     "odometro" DECIMAL(10,2),
ADD COLUMN     "rut_receptor" TEXT,
ADD COLUMN     "rut_responsable" TEXT,
ADD COLUMN     "tipo_mantencion" TEXT;

-- CreateTable
CREATE TABLE "mant_checklists_mantencion" (
    "id" TEXT NOT NULL,
    "correlativo" INTEGER NOT NULL,
    "equipo_id" TEXT NOT NULL,
    "responsable_id" TEXT,
    "fecha" DATE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "tipo_mantencion" TEXT NOT NULL,
    "empresa" TEXT NOT NULL DEFAULT 'SOLTERRA',
    "patente_snapshot" TEXT,
    "km_snapshot" DECIMAL(10,2),
    "horometro_snapshot" DECIMAL(10,2),
    "proxima_mantencion" DECIMAL(10,2),
    "items" JSONB,
    "observaciones_generales" TEXT,
    "firma_encargado_b64" TEXT,
    "anulado_at" TIMESTAMP(3),
    "motivo_anulacion" TEXT,
    "anulado_por_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "mant_checklists_mantencion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mant_certificados_mantencion" (
    "id" TEXT NOT NULL,
    "correlativo" INTEGER NOT NULL,
    "equipo_id" TEXT NOT NULL,
    "responsable_id" TEXT,
    "gerente_id" TEXT,
    "fecha" DATE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ciudad" TEXT NOT NULL DEFAULT 'Calama',
    "tipo_equipo_snapshot" TEXT,
    "marca_snapshot" TEXT,
    "patente_snapshot" TEXT,
    "horometro_snapshot" DECIMAL(10,2),
    "odometro_snapshot" DECIMAL(10,2),
    "proxima_mantencion" DECIMAL(10,2),
    "firma_encargado_b64" TEXT,
    "firma_gerente_b64" TEXT,
    "anulado_at" TIMESTAMP(3),
    "motivo_anulacion" TEXT,
    "anulado_por_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "mant_certificados_mantencion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "mant_checklists_mantencion_equipo_id_idx" ON "mant_checklists_mantencion"("equipo_id");

-- CreateIndex
CREATE INDEX "mant_checklists_mantencion_fecha_idx" ON "mant_checklists_mantencion"("fecha");

-- CreateIndex
CREATE INDEX "mant_certificados_mantencion_equipo_id_idx" ON "mant_certificados_mantencion"("equipo_id");

-- CreateIndex
CREATE INDEX "mant_certificados_mantencion_fecha_idx" ON "mant_certificados_mantencion"("fecha");

-- AddForeignKey
ALTER TABLE "mant_checklists_mantencion" ADD CONSTRAINT "mant_checklists_mantencion_equipo_id_fkey" FOREIGN KEY ("equipo_id") REFERENCES "mant_equipos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mant_checklists_mantencion" ADD CONSTRAINT "mant_checklists_mantencion_responsable_id_fkey" FOREIGN KEY ("responsable_id") REFERENCES "profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mant_checklists_mantencion" ADD CONSTRAINT "mant_checklists_mantencion_anulado_por_id_fkey" FOREIGN KEY ("anulado_por_id") REFERENCES "profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mant_certificados_mantencion" ADD CONSTRAINT "mant_certificados_mantencion_equipo_id_fkey" FOREIGN KEY ("equipo_id") REFERENCES "mant_equipos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mant_certificados_mantencion" ADD CONSTRAINT "mant_certificados_mantencion_responsable_id_fkey" FOREIGN KEY ("responsable_id") REFERENCES "profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mant_certificados_mantencion" ADD CONSTRAINT "mant_certificados_mantencion_gerente_id_fkey" FOREIGN KEY ("gerente_id") REFERENCES "profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mant_certificados_mantencion" ADD CONSTRAINT "mant_certificados_mantencion_anulado_por_id_fkey" FOREIGN KEY ("anulado_por_id") REFERENCES "profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;
