-- AlterTable
ALTER TABLE "clients" ADD COLUMN     "company_id" TEXT;

-- AlterTable
ALTER TABLE "suppliers" ADD COLUMN     "company_id" TEXT;

-- CreateTable
CREATE TABLE "companies" (
    "id" TEXT NOT NULL,
    "nombre_razon_social" TEXT NOT NULL,
    "rut" TEXT,
    "giro" TEXT,
    "email" TEXT,
    "telefono" TEXT,
    "direccion" TEXT,
    "comuna" TEXT,
    "ciudad" TEXT,
    "region" TEXT,
    "pais" TEXT DEFAULT 'Chile',
    "observaciones" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "es_cliente" BOOLEAN NOT NULL DEFAULT false,
    "es_proveedor" BOOLEAN NOT NULL DEFAULT false,
    "es_arrendataria" BOOLEAN NOT NULL DEFAULT false,
    "es_otro" BOOLEAN NOT NULL DEFAULT false,
    "representante_legal" TEXT,
    "rut_representante" TEXT,
    "cargo_representante" TEXT,
    "email_representante" TEXT,
    "telefono_representante" TEXT,
    "contacto_nombre" TEXT,
    "contacto_cargo" TEXT,
    "contacto_email" TEXT,
    "contacto_telefono" TEXT,
    "condicion_pago" TEXT,
    "correo_notificaciones" TEXT,
    "banco" TEXT,
    "tipo_cuenta" TEXT,
    "numero_cuenta" TEXT,
    "titular_cuenta" TEXT,
    "rut_titular_cuenta" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "companies_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "clients_company_id_idx" ON "clients"("company_id");

-- CreateIndex
CREATE INDEX "suppliers_company_id_idx" ON "suppliers"("company_id");

-- AddForeignKey
ALTER TABLE "clients" ADD CONSTRAINT "clients_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "suppliers" ADD CONSTRAINT "suppliers_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

