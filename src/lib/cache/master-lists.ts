import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";

// ── Tags ─────────────────────────────────────────────────────────────────────

export const ACTIVE_CLIENTS_TAG   = "clients-active-list";
export const ACTIVE_PRODUCTS_TAG  = "products-active-list";
export const ACTIVE_SUPPLIERS_TAG = "suppliers-active-list";
export const CLIENT_COUNTS_TAG    = "client-counts";
export const PRODUCT_COUNTS_TAG   = "product-counts";
export const SUPPLIER_COUNTS_TAG  = "supplier-counts";

// ── Listas para selectores de formularios (sin filtros) ──────────────────────

// /facturas/nueva → selector de clientes
export const getActiveClientsForSelector = unstable_cache(
  () =>
    prisma.client.findMany({
      where: { activo: true },
      orderBy: { nombre: "asc" },
      select: { id: true, nombre: true, rut: true },
    }),
  ["active-clients-selector"],
  { revalidate: 120, tags: [ACTIVE_CLIENTS_TAG] }
);

// /facturas/nueva y /ordenes-compra/nueva → selector de productos.
// Convertimos Decimal a number para que la serialización del cache sea segura
// y el consumidor no necesite re-mapear.
export const getActiveProductsForSelector = unstable_cache(
  async () => {
    const rows = await prisma.product.findMany({
      where: { activo: true },
      orderBy: { nombre: "asc" },
      select: { id: true, nombre: true, precio_unitario: true },
    });
    return rows.map((p) => ({ ...p, precio_unitario: Number(p.precio_unitario) }));
  },
  ["active-products-selector"],
  { revalidate: 300, tags: [ACTIVE_PRODUCTS_TAG] }
);

// /ordenes-compra/nueva → selector de proveedores
export const getActiveSuppliersForSelector = unstable_cache(
  () =>
    prisma.supplier.findMany({
      where: { activo: true },
      orderBy: { nombre: "asc" },
      select: { id: true, nombre: true, rut: true },
    }),
  ["active-suppliers-selector"],
  { revalidate: 300, tags: [ACTIVE_SUPPLIERS_TAG] }
);

// ── Counts globales (header de páginas de lista) ─────────────────────────────

export const getClientCounts = unstable_cache(
  async () => {
    const [activos, inactivos] = await Promise.all([
      prisma.client.count({ where: { activo: true } }),
      prisma.client.count({ where: { activo: false } }),
    ]);
    return { activos, inactivos };
  },
  ["client-counts"],
  { revalidate: 60, tags: [CLIENT_COUNTS_TAG] }
);

export const getProductCounts = unstable_cache(
  async () => {
    const [activos, inactivos] = await Promise.all([
      prisma.product.count({ where: { activo: true } }),
      prisma.product.count({ where: { activo: false } }),
    ]);
    return { activos, inactivos };
  },
  ["product-counts"],
  { revalidate: 60, tags: [PRODUCT_COUNTS_TAG] }
);

export const getSupplierCounts = unstable_cache(
  async () => {
    const [activos, inactivos] = await Promise.all([
      prisma.supplier.count({ where: { activo: true } }),
      prisma.supplier.count({ where: { activo: false } }),
    ]);
    return { activos, inactivos };
  },
  ["supplier-counts"],
  { revalidate: 60, tags: [SUPPLIER_COUNTS_TAG] }
);
