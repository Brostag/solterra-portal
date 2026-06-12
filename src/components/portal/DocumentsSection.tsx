import { prisma } from "@/lib/prisma";
import { FileText } from "lucide-react";
import DocumentUploadForm from "./DocumentUploadForm";
import DocumentDownloadButton from "./DocumentDownloadButton";
import DocumentDeleteButton from "./DocumentDeleteButton";

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
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

interface Props {
  invoice_id?:        string;
  purchase_order_id?: string;
  client_id?:         string;
  supplier_id?:       string;
  sessionId:          string;
  sessionRol:         string;
}

export default async function DocumentsSection({
  invoice_id,
  purchase_order_id,
  client_id,
  supplier_id,
  sessionId,
  sessionRol,
}: Props) {
  const where: Record<string, string> = {};
  if (invoice_id)        where.invoice_id        = invoice_id;
  if (purchase_order_id) where.purchase_order_id = purchase_order_id;
  if (client_id)         where.client_id         = client_id;
  if (supplier_id)       where.supplier_id       = supplier_id;

  const documents = await prisma.document.findMany({
    where,
    orderBy: { created_at: "desc" },
    take: 50,
    include: { uploader: { select: { nombre: true } } },
  });

  const canUpload  = sessionRol !== "USUARIO";
  const canDelete  = sessionRol !== "USUARIO";

  return (
    <div className="bg-white rounded-lg shadow-sm p-6 space-y-4">
      <h2 className="font-semibold text-[#253158]">
        Documentos adjuntos{" "}
        <span className="text-gray-400 font-normal text-sm">({documents.length})</span>
      </h2>

      {canUpload && (
        <DocumentUploadForm
          invoice_id={invoice_id}
          purchase_order_id={purchase_order_id}
          client_id={client_id}
          supplier_id={supplier_id}
        />
      )}

      {documents.length === 0 ? (
        <div className="text-center py-8 text-gray-400">
          <FileText className="h-8 w-8 mx-auto mb-2 opacity-30" />
          <p className="text-sm">Sin documentos adjuntos</p>
        </div>
      ) : (
        <div className="divide-y rounded-md border border-gray-200 overflow-hidden">
          {documents.map((doc) => {
            const canDeleteThis =
              canDelete &&
              (sessionRol === "ADMINISTRADOR" || doc.uploaded_by === sessionId);

            return (
              <div
                key={doc.id}
                className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50"
              >
                <FileText className="h-5 w-5 text-gray-400 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">
                    {doc.nombre_archivo}
                  </p>
                  <p className="text-xs text-gray-400">
                    {TIPO_LABELS[doc.tipo_documento] ?? doc.tipo_documento} ·{" "}
                    {formatSize(doc.tamaño)} ·{" "}
                    {doc.uploader.nombre} ·{" "}
                    {new Date(doc.created_at).toLocaleDateString("es-CL")}
                  </p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <DocumentDownloadButton docId={doc.id} />
                  {canDeleteThis && (
                    <DocumentDeleteButton docId={doc.id} nombre={doc.nombre_archivo} />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
