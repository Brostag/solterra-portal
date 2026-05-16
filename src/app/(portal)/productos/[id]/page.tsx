import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { updateProduct, deactivateProduct } from "../actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import ProductoActions from "./ProductoActions";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function ProductoDetailPage({ params }: Props) {
  const { id } = await params;
  const product = await prisma.product.findUnique({ where: { id } });
  if (!product) notFound();

  const updateWithId = updateProduct.bind(null, id);

  return (
    <div className="max-w-xl space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/productos">
            <Button variant="ghost" size="sm"><ArrowLeft className="h-4 w-4" /></Button>
          </Link>
          <h1 className="text-2xl font-bold text-[#253158]">{product.nombre}</h1>
          <Badge className={product.activo ? "bg-green-100 text-green-700 hover:bg-green-100" : "bg-gray-100 text-gray-500"}>
            {product.activo ? "Activo" : "Inactivo"}
          </Badge>
        </div>
        {product.activo && <ProductoActions productId={id} deactivate={deactivateProduct} />}
      </div>

      <div className="bg-white rounded-lg border p-6">
        <form action={updateWithId} className="space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 space-y-2">
              <Label htmlFor="nombre">Nombre *</Label>
              <Input id="nombre" name="nombre" defaultValue={product.nombre} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="codigo_interno">Código Interno</Label>
              <Input id="codigo_interno" name="codigo_interno" defaultValue={product.codigo_interno ?? ""} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="precio_unitario">Precio Unitario (CLP) *</Label>
              <Input id="precio_unitario" name="precio_unitario" type="number" min="0" step="1" defaultValue={String(product.precio_unitario)} required />
            </div>
            <div className="col-span-2 space-y-2">
              <Label htmlFor="descripcion">Descripción</Label>
              <Textarea id="descripcion" name="descripcion" rows={3} defaultValue={product.descripcion ?? ""} />
            </div>
          </div>
          <Button type="submit" className="bg-[#253158] hover:bg-[#1e305e] text-white">
            Guardar Cambios
          </Button>
        </form>
      </div>
    </div>
  );
}
