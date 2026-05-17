-- Sprint C1 — Índices B-tree mínimos para FK joins y ORDER BY principales
-- Aplicado vía prisma db push el 2026-05-17 (historial de migraciones tiene drift previo)
-- No contiene DROP, ALTER, cambios de tipos ni índices C2

-- CreateIndex
CREATE INDEX "invoices_client_id_idx" ON "invoices"("client_id");

-- CreateIndex
CREATE INDEX "invoices_created_at_idx" ON "invoices"("created_at");

-- CreateIndex
CREATE INDEX "invoice_items_invoice_id_idx" ON "invoice_items"("invoice_id");

-- CreateIndex
CREATE INDEX "purchase_orders_proveedor_id_idx" ON "purchase_orders"("proveedor_id");

-- CreateIndex
CREATE INDEX "purchase_orders_created_at_idx" ON "purchase_orders"("created_at");

-- CreateIndex
CREATE INDEX "purchase_order_items_orden_compra_id_idx" ON "purchase_order_items"("orden_compra_id");

-- CreateIndex
CREATE INDEX "documents_invoice_id_idx" ON "documents"("invoice_id");

-- CreateIndex
CREATE INDEX "documents_purchase_order_id_idx" ON "documents"("purchase_order_id");

-- CreateIndex
CREATE INDEX "documents_client_id_idx" ON "documents"("client_id");

-- CreateIndex
CREATE INDEX "documents_supplier_id_idx" ON "documents"("supplier_id");

-- CreateIndex
CREATE INDEX "documents_created_at_idx" ON "documents"("created_at");

-- CreateIndex
CREATE INDEX "audit_logs_user_id_idx" ON "audit_logs"("user_id");

-- CreateIndex
CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs"("created_at");
