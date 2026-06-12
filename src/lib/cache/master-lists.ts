import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";

// ── Tags ─────────────────────────────────────────────────────────────────────

export const ACTIVE_CLIENTS_TAG   = "clients-active-list";
export const ACTIVE_PRODUCTS_TAG  = "products-active-list";
export const ACTIVE_SUPPLIERS_TAG = "suppliers-active-list";
export const CLIENT_COUNTS_TAG    = "client-counts";
export const PRODUCT_COUNTS_TAG   = "product-counts";
export const SUPPLIER_COUNTS_TAG  = "supplier-counts";

// Selectores basados en Company (Empresas = fuente oficial, FASE 3)
export const ACTIVE_COMPANY_CLIENTS_TAG   = "company-clients-active-list";
export const ACTIVE_COMPANY_SUPPLIERS_TAG = "company-suppliers-active-list";

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

// ── Selectores desde Company (Empresas = fuente oficial, FASE 3) ─────────────
// Reemplazan progresivamente a los de Client/Supplier en Cotizador, Contratos y
// OC. El id retornado es el de la COMPANY; el consumidor resuelve el
// Client/Supplier de compatibilidad al crear (compat-mapping).

// Cotizador y Contratos → empresas con rol cliente o arrendataria
export const getCompanyClientsForSelector = unstable_cache(
  () =>
    prisma.company.findMany({
      where: { activo: true, OR: [{ es_cliente: true }, { es_arrendataria: true }] },
      orderBy: { nombre_razon_social: "asc" },
      select: {
        id: true,
        nombre_razon_social: true,
        rut: true,
        email: true,
        telefono: true,
        direccion: true,
        comuna: true,
        ciudad: true,
        region: true,
        representante_legal: true,
        rut_representante: true,
        correo_notificaciones: true,
      },
    }),
  ["active-company-clients-selector"],
  { revalidate: 120, tags: [ACTIVE_COMPANY_CLIENTS_TAG] }
);

// OC → empresas con rol proveedor
export const getCompanySuppliersForSelector = unstable_cache(
  () =>
    prisma.company.findMany({
      where: { activo: true, es_proveedor: true },
      orderBy: { nombre_razon_social: "asc" },
      select: {
        id: true,
        nombre_razon_social: true,
        rut: true,
        email: true,
        telefono: true,
        direccion: true,
        ciudad: true,
        giro: true,
        contacto_nombre: true,
        banco: true,
        tipo_cuenta: true,
        numero_cuenta: true,
        titular_cuenta: true,
        rut_titular_cuenta: true,
      },
    }),
  ["active-company-suppliers-selector"],
  { revalidate: 300, tags: [ACTIVE_COMPANY_SUPPLIERS_TAG] }
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
