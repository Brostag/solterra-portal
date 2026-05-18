import { prisma } from "@/lib/prisma";
import { getPortalSessionFast } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import {
  Table, TableBody, TableCell, TableHead,
  TableHeader, TableRow,
} from "@/components/ui/table";
import { FileText } from "lucide-react";
import Link from "next/link";
import DocumentUploadForm from "@/components/portal/DocumentUploadForm";
import DocumentDownloadButton from "@/components/portal/DocumentDownloadButton";
import DocumentDeleteButton from "@/components/portal/DocumentDeleteButton";

const TIPO_LABELS: Record<string, string> = {
  CONTRATO:          "Contrato",
  COTIZACION:        "Cotización",
  FACTURA_PROVEEDOR: "Factura Proveedor",
  GUIA_DESPACHO:     "Guía de Despacho",
  ORDEN_COMPRA:      "Orden de Compra",
  CERTIFICADO:       "Certificado",
  OTRO:              "Otro",
};

const TIPO_COLORS: Record<string, string> = {
  CONTRATO:          "bg-purple-50 text-purple-600 border border-purple-200",
  COTIZACION:        "bg-blue-50 text-blue-600 border border-blue-200",
  FACTURA_PROVEEDOR: "bg-amber-50 text-amber-600 border border-amber-200",
  GUIA_DESPACHO:     "bg-sky-50 text-sky-600 border border-sky-200",
  ORDEN_COMPRA:      "bg-indigo-50 text-indigo-600 border border-indigo-200",
  CERTIFICADO:       "bg-green-50 text-green-600 border border-green-200",
  OTRO:              "bg-gray-50 text-gray-500 border border-gray-200",
};

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

interface Props {
  searchParams: Promise<{ tipo?: string; entidad?: string }>;
}

export default async function DocumentosPage({ searchParams }: Props) {
  const { tipo, entidad } = await searchParams;

  const where: Record<string, unknown> = {};
  if (tipo) where.tipo_documento = tipo;
  if (entidad === "facturas")    where.invoice_id        = { not: null };
  if (entidad === "oc")          where.purchase_order_id = { not: null };
  if (entidad === "clientes")    where.client_id         = { not: null };
  if (entidad === "proveedores") where.supplier_id       = { not: null };

  const [session, documents] = await Promise.all([
    getPortalSessionFast(),
    prisma.document.findMany({
      where,
      orderBy: { created_at: "desc" },
      take: 200,
      include: {
        client:         { select: { nombre: true } },
        invoice:        { select: { numero_factura: true } },
        purchase_order: { select: { numero: true } },
        supplier:       { select: { nombre: true } },
        uploader:       { select: { nombre: true } },
      },
    }),
  ]);
  if (!session) redirect("/login");

  const canUpload = session.rol !== "USUARIO";
  const canDelete = session.rol !== "USUARIO";

  const tipos = Object.keys(TIPO_LABELS);
  const entidades = [
    { value: "facturas",    label: "Facturas" },
    { value: "oc",          label: "Órdenes de Compra" },
    { value: "clientes",    label: "Clientes" },
    { value: "proveedores", label: "Proveedores" },
  ];

  const chipBase = "px-3.5 py-1.5 rounded-full text-xs font-medium cursor-pointer transition-colors border";
  const chipActive = "bg-[#253158] text-white border-[#253158]";
  const chipInactive = "bg-white text-gray-600 border-gray-200 hover:bg-gray-50";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#253158]">Documentos</h1>
          <p className="text-gray-500 text-sm mt-1">
            {documents.length} archivo{documents.length !== 1 ? "s" : ""}
          </p>
        </div>
      </div>

      {/* Upload */}
      {canUpload && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-gray-700">Subir documento</p>
          <DocumentUploadForm />
        </div>
      )}

      {/* Filtros por tipo */}
      <div className="space-y-3">
        <div className="flex flex-wrap gap-1.5 items-center">
          <Link href={`/documentos${entidad ? `?entidad=${entidad}` : ""}`}>
            <span className={`${chipBase} ${!tipo ? chipActive : chipInactive}`}>Todos los tipos</span>
          </Link>
          {tipos.map((t) => (
            <Link key={t} href={`/documentos?tipo=${t}${entidad ? `&entidad=${entidad}` : ""}`}>
              <span className={`${chipBase} ${tipo === t ? chipActive : chipInactive}`}>
                {TIPO_LABELS[t]}
              </span>
            </Link>
          ))}
        </div>

        <div className="flex flex-wrap gap-1.5 items-center">
          <Link href={`/documentos${tipo ? `?tipo=${tipo}` : ""}`}>
            <span className={`${chipBase} ${!entidad ? chipActive : chipInactive}`}>Todas las entidades</span>
          </Link>
          {entidades.map((e) => (
            <Link key={e.value} href={`/documentos?entidad=${e.value}${tipo ? `&tipo=${tipo}` : ""}`}>
              <span className={`${chipBase} ${entidad === e.value ? chipActive : chipInactive}`}>
                {e.label}
              </span>
            </Link>
          ))}
        </div>
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50 hover:bg-gray-50 border-b border-gray-200">
              <TableHead className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Archivo</TableHead>
              <TableHead className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Tipo</TableHead>
              <TableHead className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Asociado a</TableHead>
              <TableHead className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Tamaño</TableHead>
              <TableHead className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Subido por</TableHead>
              <TableHead className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Fecha</TableHead>
              <TableHead className="w-20" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {documents.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-gray-400 py-12">
                  <FileText className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  <p>No hay documentos registrados</p>
                </TableCell>
              </TableRow>
            ) : (
              documents.map((doc) => {
                const asociado = doc.invoice
                  ? { label: `Factura #${doc.invoice.numero_factura}`, href: `/facturas/${doc.invoice_id}` }
                  : doc.purchase_order
                  ? { label: `OC ${doc.purchase_order.numero}`, href: `/ordenes-compra/${doc.purchase_order_id}` }
                  : doc.client
                  ? { label: doc.client.nombre, href: `/clientes/${doc.client_id}` }
                  : doc.supplier
                  ? { label: doc.supplier.nombre, href: `/proveedores/${doc.supplier_id}` }
                  : null;

                const canDeleteThis =
                  canDelete &&
                  (session.rol === "ADMINISTRADOR" || doc.uploaded_by === session.id);

                return (
                  <TableRow key={doc.id} className="hover:bg-gray-50 border-b border-gray-100 last:border-0">
                    <TableCell className="px-5 py-4 font-medium text-gray-800 text-sm max-w-[200px]">
                      <span className="truncate block" title={doc.nombre_archivo}>
                        {doc.nombre_archivo}
                      </span>
                    </TableCell>
                    <TableCell className="px-5 py-4">
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-md ${TIPO_COLORS[doc.tipo_documento] ?? "bg-gray-50 text-gray-500 border border-gray-200"}`}>
                        {TIPO_LABELS[doc.tipo_documento] ?? doc.tipo_documento}
                      </span>
                    </TableCell>
                    <TableCell className="px-5 py-4 text-sm">
                      {asociado ? (
                        <Link href={asociado.href} className="text-[#253158] hover:underline font-medium">
                          {asociado.label}
                        </Link>
                      ) : (
                        <span className="text-gray-300">—</span>
                      )}
                    </TableCell>
                    <TableCell className="px-5 py-4 text-gray-400 text-sm">{formatSize(doc.tamaño)}</TableCell>
                    <TableCell className="px-5 py-4 text-gray-500 text-sm">{doc.uploader.nombre}</TableCell>
                    <TableCell className="px-5 py-4 text-gray-400 text-sm">
                      {new Date(doc.created_at).toLocaleDateString("es-CL")}
                    </TableCell>
                    <TableCell className="px-3 py-4">
                      <div className="flex items-center justify-end gap-1">
                        <DocumentDownloadButton docId={doc.id} />
                        {canDeleteThis && (
                          <DocumentDeleteButton docId={doc.id} nombre={doc.nombre_archivo} />
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
