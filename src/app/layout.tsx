import type { Metadata } from "next";
import "./globals.css";
import { Geist } from "next/font/google";
import { cn } from "@/lib/utils";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});

export const metadata: Metadata = {
  title: "SOLTERRA | MOVIMIENTO DE TIERRA, MAQUINARIAS Y EQUIPOS",
  description:
    "Solterra Movimiento de Tierra, Maquinarias y Equipos es una empresa dedicada a ofrecer soluciones integrales en movimiento de tierra, arriendo de maquinaria, construcción e ingeniería en el norte de Chile.",
  icons: {
    icon: "https://ext.same-assets.com/2134444905/1270600439.jpeg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es" className={cn("font-sans", geist.variable)}>
      <body className="antialiased">{children}</body>
    </html>
  );
}
