-- CreateTable
CREATE TABLE "feedback_reports" (
    "id" TEXT NOT NULL,
    "correlativo" INTEGER NOT NULL,
    "anio" INTEGER NOT NULL,
    "autor_id" TEXT NOT NULL,
    "tipo" TEXT NOT NULL DEFAULT 'Problema',
    "mensaje" TEXT NOT NULL,
    "ruta" TEXT,
    "modulo" TEXT,
    "user_agent" TEXT,
    "viewport" TEXT,
    "estado" TEXT NOT NULL DEFAULT 'Nuevo',
    "nota_interna" TEXT,
    "resuelto_at" TIMESTAMP(3),
    "resuelto_por_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "feedback_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "feedback_adjuntos" (
    "id" TEXT NOT NULL,
    "reporte_id" TEXT NOT NULL,
    "storage_path" TEXT NOT NULL,
    "mime" TEXT NOT NULL,
    "tamano" INTEGER NOT NULL,
    "es_captura" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "feedback_adjuntos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "feedback_reports_estado_idx" ON "feedback_reports"("estado");

-- CreateIndex
CREATE INDEX "feedback_reports_autor_id_idx" ON "feedback_reports"("autor_id");

-- CreateIndex
CREATE INDEX "feedback_reports_created_at_idx" ON "feedback_reports"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "feedback_reports_correlativo_anio_key" ON "feedback_reports"("correlativo", "anio");

-- CreateIndex
CREATE INDEX "feedback_adjuntos_reporte_id_idx" ON "feedback_adjuntos"("reporte_id");

-- AddForeignKey
ALTER TABLE "feedback_reports" ADD CONSTRAINT "feedback_reports_autor_id_fkey" FOREIGN KEY ("autor_id") REFERENCES "profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feedback_reports" ADD CONSTRAINT "feedback_reports_resuelto_por_id_fkey" FOREIGN KEY ("resuelto_por_id") REFERENCES "profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feedback_adjuntos" ADD CONSTRAINT "feedback_adjuntos_reporte_id_fkey" FOREIGN KEY ("reporte_id") REFERENCES "feedback_reports"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- RLS: deny-all deliberado.
-- Supabase expone el esquema public via PostgREST, asi que una tabla sin RLS es
-- accesible con la anon key desde el navegador. La app llega a estas tablas solo
-- por Prisma (conexion directa, owner de la tabla, no sujeta a RLS), asi que NO
-- se crea ninguna politica: nada de esto debe ser legible por la API publica.
-- Se diferencia a proposito de las tablas mant_*, que usan una politica
-- "FOR ALL TO authenticated": aca eso dejaria que cualquier usuario logueado
-- leyera los reportes de los demas.
ALTER TABLE "feedback_reports" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "feedback_adjuntos" ENABLE ROW LEVEL SECURITY;
