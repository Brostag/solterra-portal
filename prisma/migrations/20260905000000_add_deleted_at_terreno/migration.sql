-- AlterTable
ALTER TABLE "mant_certificados_mantencion" ADD COLUMN     "deleted_at" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "mant_checklists" ADD COLUMN     "deleted_at" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "mant_checklists_mantencion" ADD COLUMN     "deleted_at" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "mant_certificados_mantencion_deleted_at_idx" ON "mant_certificados_mantencion"("deleted_at");

-- CreateIndex
CREATE INDEX "mant_checklists_deleted_at_idx" ON "mant_checklists"("deleted_at");

-- CreateIndex
CREATE INDEX "mant_checklists_mantencion_deleted_at_idx" ON "mant_checklists_mantencion"("deleted_at");

