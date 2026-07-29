-- Encadena el ciclo de mantención: registro de ingreso/salida -> check list ->
-- orden de trabajo -> certificado. Migración ADITIVA y reversible.
--
-- Las 3 columnas son nullable y sin DEFAULT: en PostgreSQL eso es un cambio de
-- catálogo, no reescribe filas ni toma lock largo. Sin backfill: las filas
-- históricas quedan en NULL, que significa "documento suelto, anterior al
-- expediente". Los 3 FK se validan contra columnas 100% NULL, así que no pueden
-- fallar.
--
-- ON DELETE SET NULL en los tres (nunca CASCADE): borrar un documento de origen
-- jamás debe arrastrar los que se derivaron de él. Mismo criterio que
-- MantPlanMantencion (20260713040000_add_mant_planes_mantencion).
--
-- Rollback: DROP CONSTRAINT x3 + DROP INDEX x3 + DROP COLUMN x3.

-- AlterTable
ALTER TABLE "mant_certificados_mantencion" ADD COLUMN     "mantencion_id" TEXT;

-- AlterTable
ALTER TABLE "mant_checklists_mantencion" ADD COLUMN     "registro_id" TEXT;

-- AlterTable
ALTER TABLE "mant_mantenciones" ADD COLUMN     "checklist_id" TEXT;

-- CreateIndex
CREATE INDEX "mant_certificados_mantencion_mantencion_id_idx" ON "mant_certificados_mantencion"("mantencion_id");

-- CreateIndex
CREATE INDEX "mant_checklists_mantencion_registro_id_idx" ON "mant_checklists_mantencion"("registro_id");

-- CreateIndex
CREATE INDEX "mant_mantenciones_checklist_id_idx" ON "mant_mantenciones"("checklist_id");

-- AddForeignKey
ALTER TABLE "mant_mantenciones" ADD CONSTRAINT "mant_mantenciones_checklist_id_fkey" FOREIGN KEY ("checklist_id") REFERENCES "mant_checklists_mantencion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mant_checklists_mantencion" ADD CONSTRAINT "mant_checklists_mantencion_registro_id_fkey" FOREIGN KEY ("registro_id") REFERENCES "mant_partes_diarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mant_certificados_mantencion" ADD CONSTRAINT "mant_certificados_mantencion_mantencion_id_fkey" FOREIGN KEY ("mantencion_id") REFERENCES "mant_mantenciones"("id") ON DELETE SET NULL ON UPDATE CASCADE;
