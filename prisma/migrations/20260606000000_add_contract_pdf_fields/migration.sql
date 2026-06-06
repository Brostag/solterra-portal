-- AlterTable
ALTER TABLE "contract_equipments" ADD COLUMN     "horometro_inicial" TEXT,
ADD COLUMN     "mantenimiento_horas" TEXT,
ADD COLUMN     "tarifa_hora_extra" DECIMAL(12,2);

-- AlterTable
ALTER TABLE "contracts" ADD COLUMN     "ciudad_celebracion" TEXT,
ADD COLUMN     "correo_notificaciones" TEXT,
ADD COLUMN     "fecha_anexo" TIMESTAMP(3),
ADD COLUMN     "numero_anexo" TEXT,
ADD COLUMN     "numero_cotizacion" TEXT,
ADD COLUMN     "vigencia_contrato" TEXT;

