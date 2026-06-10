-- CreateEnum
CREATE TYPE "EstadoCotizacion" AS ENUM ('BORRADOR', 'EMITIDA', 'ANULADA');

-- CreateTable
CREATE TABLE "quotations" (
    "id" TEXT NOT NULL,
    "numero" TEXT NOT NULL,
    "company_id" TEXT,
    "cliente_nombre_snapshot" TEXT,
    "cliente_rut_snapshot" TEXT,
    "cliente_giro_snapshot" TEXT,
    "cliente_email_snapshot" TEXT,
    "cliente_telefono_snapshot" TEXT,
    "cliente_direccion_snapshot" TEXT,
    "fecha_emision" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "moneda" TEXT NOT NULL DEFAULT 'CLP',
    "iva_porcentaje" DECIMAL(5,2) NOT NULL,
    "descuento_porcentaje" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "gastos" JSONB NOT NULL DEFAULT '{}',
    "subtotal" DECIMAL(14,2) NOT NULL,
    "descuento_monto" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "neto" DECIMAL(14,2) NOT NULL,
    "iva_monto" DECIMAL(14,2) NOT NULL,
    "total" DECIMAL(14,2) NOT NULL,
    "estado" "EstadoCotizacion" NOT NULL DEFAULT 'BORRADOR',
    "observaciones" TEXT,
    "condiciones" TEXT,
    "user_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "quotations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quotation_items" (
    "id" TEXT NOT NULL,
    "quotation_id" TEXT NOT NULL,
    "orden" INTEGER NOT NULL,
    "descripcion" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "valor_hora" DECIMAL(12,2) NOT NULL,
    "horas_minimas_diarias" INTEGER NOT NULL DEFAULT 0,
    "cantidad_horas" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "cantidad_dias" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "subtotal" DECIMAL(14,2) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "quotation_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "quotations_numero_key" ON "quotations"("numero");

-- CreateIndex
CREATE INDEX "quotations_company_id_idx" ON "quotations"("company_id");

-- CreateIndex
CREATE INDEX "quotations_estado_idx" ON "quotations"("estado");

-- CreateIndex
CREATE INDEX "quotation_items_quotation_id_idx" ON "quotation_items"("quotation_id");

-- AddForeignKey
ALTER TABLE "quotation_items" ADD CONSTRAINT "quotation_items_quotation_id_fkey" FOREIGN KEY ("quotation_id") REFERENCES "quotations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
