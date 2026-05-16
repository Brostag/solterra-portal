import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth/session";
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

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

interface Props {
  searchParams: Promise<{ tipo?: string; entidad?: string }>;
}

export default async function DocumentosPage({ searchParams }: Props) {
  const session = await getSession();
  if (!session) redirect("/login");

  const { tipo, entidad } = await searchParams;

  const where: Record<string, unknown> = {};
  if (tipo) where.tipo_documento = tipo;
  if (entidad === "facturas")   where.invoice_id        = { not: null };
  if (entidad === "oc")         where.purchase_order_id = { not: null };
  if (entidad === "clientes")   where.client_id         = { not: null };
  if (entidad === "proveedores")where.supplier_id       = { not: null };

  const documents = await prisma.document.findMany({
    where,
    orderBy: { created_at: "desc" },
    include: {
      client:         { select: { nombre: true } },
      invoice:        { select: { numero_factura: true } },
      purchase_order: { select: { numero: true } },
      supplier:       { select: { nombre: true } },
      uploader:       { select: { nombre: true } },
    },
  });

  const canUpload  = session.rol !== "USUARIO";
  const canDelete  = session.rol !== "USUARIO";

  const tipos = Object.keys(TIPO_LABELS);
  const entidades = [
    { value: "facturas",    label: "Facturas" },
    { value: "oc",          label: "Órdenes de Compra" },
    { value: "clientes",    label: "Clientes" },
    { value: "proveedores", label: "Proveedores" },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#253158]">Documentos</h1>
          <p className="text-gray-500 text-sm mt-1">{documents.length} archivo{documents.length !== 1 ? "s" : ""}</p>
        </div>
      </div>

      {/* Upload global */}
      {canUpload && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-gray-700">Subir documento</p>
          <DocumentUploadForm />
        </div>
      )}

      {/* Filtros */}
      <div className="flex flex-wrap gap-2 text-sm">
        <Link
          href="/documentos"
          className={`px-3 py-1.5 rounded-full border ${!tipo && !entidad ? "bg-[#253158] text-white border-[#253158]" : "border-gray-300 text-gray-600 hover:border-[#253158]"}`}
        >
          Todos
        </Link>
        {tipos.map((t) => (
          <Link
            key={t}
            href={`/documentos?tipo=${t}${entidad ? `&entidad=${entidad}` : ""}`}
            className={`px-3 py-1.5 rounded-full border ${tipo === t ? "bg-[#253158] text-white border-[#253158]" : "border-gray-300 text-gray-600 hover:border-[#253158]"}`}
          >
            {TIPO_LABELS[t]}
          </Link>
        ))}
        <span className="border-l border-gray-200 mx-1" />
        {entidades.map((e) => (
          <Link
            key={e.value}
            href={`/documentos?entidad=${e.value}${tipo ? `&tipo=${tipo}` : ""}`}
            className={`px-3 py-1.5 rounded-full border ${entidad === e.value ? "bg-indigo-600 text-white border-indigo-600" : "border-gray-300 text-gray-600 hover:border-indigo-400"}`}
          >
            {e.label}
          </Link>
        ))}
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-lg border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Archivo</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Asociado a</TableHead>
              <TableHead>Tamaño</TableHead>
              <TableHead>Subido por</TableHead>
              <TableHead>Fecha</TableHead>
              <TableHead className="w-20 text-right" />
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
                  <TableRow key={doc.id}>
                    <TableCell className="font-medium max-w-[180px]">
                      <span className="truncate block" title={doc.nombre_archivo}>
                        {doc.nombre_archivo}
                      </span>
                    </TableCell>
                    <TableCell className="text-gray-500 text-sm">
                      {TIPO_LABELS[doc.tipo_documento] ?? doc.tipo_documento}
                    </TableCell>
                    <TableCell className="text-sm">
                      {asociado ? (
                        <Link href={asociado.href} className="text-[#253158] hover:underline">
                          {asociado.label}
                        </Link>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-gray-500 text-sm">{formatSize(doc.tamaño)}</TableCell>
                    <TableCell className="text-gray-500 text-sm">{doc.uploader.nombre}</TableCell>
                    <TableCell className="text-gray-500 text-sm">
                      {new Date(doc.created_at).toLocaleDateString("es-CL")}
                    </TableCell>
                    <TableCell>
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

