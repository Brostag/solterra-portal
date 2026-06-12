"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Printer, Loader2 } from "lucide-react";

interface Props {
  pdfUrl: string;
  label?: string;
  size?: "sm" | "default" | "lg";
  className?: string;
}

export default function PrintPdfButton({ pdfUrl, label = "Imprimir", size = "sm", className }: Props) {
  const [opening, setOpening] = useState(false);

  function handleClick() {
    if (opening) return;
    setOpening(true);
    window.open(pdfUrl, "_blank");
    setTimeout(() => setOpening(false), 3000);
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
