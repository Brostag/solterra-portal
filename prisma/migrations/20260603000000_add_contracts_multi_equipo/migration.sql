-- CreateEnum
CREATE TYPE "EstadoContrato" AS ENUM ('BORRADOR', 'VIGENTE', 'FINALIZADO', 'ANULADO');

-- CreateEnum
CREATE TYPE "TipoFotoEquipo" AS ENUM ('FRONTAL', 'LATERAL_DERECHO', 'LATERAL_IZQUIERDO', 'TRASERA', 'CABINA', 'HOROMETRO', 'RODADO', 'DANIOS', 'OTRO');

-- AlterTable
ALTER TABLE "documents" ADD COLUMN     "contract_id" TEXT;

-- CreateTable
CREATE TABLE "contracts" (
    "id" TEXT NOT NULL,
    "numero_contrato" TEXT NOT NULL,
    "fecha_emision" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "client_id" TEXT NOT NULL,
    "representante_cliente" TEXT,
    "rut_representante" TEXT,
    "cliente_snapshot_at" TIMESTAMP(3),
    "cliente_nombre_snapshot" TEXT,
    "cliente_rut_snapshot" TEXT,
    "cliente_direccion_snapshot" TEXT,
    "cliente_email_snapshot" TEXT,
    "cliente_telefono_snapshot" TEXT,
    "fecha_inicio" TIMESTAMP(3) NOT NULL,
    "fecha_termino" TIMESTAMP(3),
    "duracion_meses" INTEGER,
    "lugar_operacion" TEXT,
    "moneda" "Moneda" NOT NULL DEFAULT 'CLP',
    "forma_pago" TEXT,
    "estado" "EstadoContrato" NOT NULL DEFAULT 'BORRADOR',
    "motivo_anulacion" TEXT,
    "observaciones" TEXT,
    "user_id" TEXT NOT NULL,
    "pdf_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contracts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contract_equipments" (
    "id" TEXT NOT NULL,
    "contract_id" TEXT NOT NULL,
    "orden" INTEGER NOT NULL,
    "descripcion" TEXT NOT NULL,
    "marca" TEXT,
    "modelo" TEXT,
    "patente" TEXT,
    "anio" INTEGER,
    "chasis" TEXT,
    "motor" TEXT,
    "color" TEXT,
    "valor_hora" DECIMAL(12,2) NOT NULL,
    "horas_minimas_diarias" INTEGER,
    "horas_minimas_mensuales" INTEGER,
    "valor_mensual_estimado" DECIMAL(14,2),
    "observaciones" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contract_equipments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contract_equipment_photos" (
    "id" TEXT NOT NULL,
    "contract_equipment_id" TEXT NOT NULL,
    "tipo" "TipoFotoEquipo" NOT NULL,
    "storage_path" TEXT NOT NULL,
    "nombre_original" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "tamano" INTEGER NOT NULL,
    "observacion" TEXT,
    "uploaded_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "contract_equipment_photos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "contracts_numero_contrato_key" ON "contracts"("numero_contrato");

-- CreateIndex
CREATE INDEX "contracts_client_id_idx" ON "contracts"("client_id");

-- CreateIndex
CREATE INDEX "contracts_estado_idx" ON "contracts"("estado");

-- CreateIndex
CREATE INDEX "contracts_created_at_idx" ON "contracts"("created_at");

-- CreateIndex
CREATE INDEX "contract_equipments_contract_id_idx" ON "contract_equipments"("contract_id");

-- CreateIndex
CREATE INDEX "contract_equipment_photos_contract_equipment_id_idx" ON "contract_equipment_photos"("contract_equipment_id");

-- CreateIndex
CREATE INDEX "contract_equipment_photos_tipo_idx" ON "contract_equipment_photos"("tipo");

-- CreateIndex
CREATE INDEX "documents_contract_id_idx" ON "documents"("contract_id");

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_contract_id_fkey" FOREIGN KEY ("contract_id") REFERENCES "contracts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contract_equipments" ADD CONSTRAINT "contract_equipments_contract_id_fkey" FOREIGN KEY ("contract_id") REFERENCES "contracts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contract_equipment_photos" ADD CONSTRAINT "contract_equipment_photos_contract_equipment_id_fkey" FOREIGN KEY ("contract_equipment_id") REFERENCES "contract_equipments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contract_equipment_photos" ADD CONSTRAINT "contract_equipment_photos_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

