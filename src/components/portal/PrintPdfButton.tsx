"use client";

import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";

interface Props {
  pdfUrl: string;
  label?: string;
}

export default function PrintPdfButton({ pdfUrl, label = "Imprimir" }: Props) {
  return (
    <Button
      variant="outline"
      size="sm"
      className="gap-2"
      onClick={() => window.open(pdfUrl, "_blank")}
    >
      <Printer className="h-4 w-4" />
      {label}
    </Button>
  );
}
