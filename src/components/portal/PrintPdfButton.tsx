"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Printer, Loader2 } from "lucide-react";
import { openPdfForPrint } from "@/lib/pdf-print";

interface Props {
  pdfUrl: string;
  label?: string;
  size?: "sm" | "default" | "lg";
  className?: string;
}

export default function PrintPdfButton({ pdfUrl, label = "Imprimir", size = "sm", className }: Props) {
  const [opening, setOpening] = useState(false);

  async function handleClick() {
    if (opening) return;
    setOpening(true);
    const resultado = await openPdfForPrint(pdfUrl);
    setOpening(false);
    if (!resultado.ok) {
      window.alert(
        resultado.reason === "popup-blocked"
          ? "El navegador bloqueó la ventana emergente. Permite las ventanas emergentes para este sitio e intenta de nuevo."
          : "No se pudo abrir el PDF para imprimir. Intenta de nuevo.",
      );
    }
  }

  return (
    <Button
      variant="outline"
      size={size}
      className={cn("gap-2", className)}
      onClick={handleClick}
      disabled={opening}
    >
      {opening ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Printer className="h-4 w-4" />
      )}
      {opening ? "Abriendo PDF..." : label}
    </Button>
  );
}
