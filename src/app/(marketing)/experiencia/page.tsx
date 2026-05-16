"use client";

import Link from "next/link";
import { useState } from "react";

const galleryImages = [
  "https://ext.same-assets.com/2134444905/1615229160.jpeg",
  "https://ext.same-assets.com/2134444905/3609671246.jpeg",
  "https://ext.same-assets.com/2134444905/99751348.jpeg",
  "https://ext.same-assets.com/2134444905/2486251241.jpeg",
  "https://ext.same-assets.com/2134444905/408345324.jpeg",
  "https://ext.same-assets.com/2134444905/3061068086.jpeg",
  "https://ext.same-assets.com/2134444905/668324783.jpeg",
  "https://ext.same-assets.com/2134444905/2481069082.jpeg",
];

export default function Experiencia() {
  const [currentPage, setCurrentPage] = useState(1);
  const imagesPerPage = 8;
  const totalPages = 4;

  return (
    <>
      {/* Hero Section */}
      <section className="relative h-[60vh] min-h-[500px] flex items-center overflow-hidden">
        <img
          src="https://ext.same-assets.com/2134444905/1627953398.jpeg"
          alt="Experiencia Solterra"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-black/40" />

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
            EXPERIENCIA
          </h1>
          <p className="text-xl text-white/90 mb-8">
            Innovación y eficiencia en terreno
          </p>
          <Link
            href="/contacto"
            className="inline-block px-8 py-3 bg-[#253158] text-white hover:bg-[#1e305e] transition-all font-medium"
          >
            CONTÁCTANOS
          </Link>
        </div>
      </section>

      {/* Gallery Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl md:text-4xl font-bold text-[#253158] text-center mb-4">
            NUESTRA EXPERIENCIA
          </h2>
          <div className="w-16 h-1 bg-[#c6352e] mx-auto mb-8" />
          <p className="text-gray-600 text-center max-w-4xl mx-auto mb-12">
            Solterra Movimiento de Tierra, Maquinarias y Equipos es una empresa
            dedicada a ofrecer soluciones integrales en movimiento de tierra,
            arriendo de maquinaria, construcción e ingeniería en el norte de
            Chile. Con más de 15 años de experiencia en el rubro, nos destacamos
            por nuestro equipo unido y comprometido, siempre enfocado en entregar
            resultados de calidad para proyectos públicos, privados y mineros. A
            continuación, podrán ver imágenes de algunas de nuestras experiencias
            destacadas en estos sectores.
          </p>

          {/* Gallery Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {galleryImages.map((image, index) => (
              <div
                key={index}
                className="relative aspect-square overflow-hidden group cursor-pointer"
              >
                <img
                  src={image}
                  alt={`Experiencia ${index + 1}`}
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all" />
              </div>
            ))}
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-center gap-2">
            {[1, 2, 3, 4].map((page) => (
              <button
                key={page}
                type="button"
                onClick={() => setCurrentPage(page)}
                className={`w-10 h-10 flex items-center justify-center font-medium transition-all ${
                  currentPage === page
                    ? "bg-[#253158] text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {page}
              </button>
            ))}
            <button
              type="button"
              onClick={() =>
                setCurrentPage((prev) => Math.min(prev + 1, totalPages))
              }
              className="px-4 h-10 flex items-center justify-center font-medium bg-gray-100 text-gray-600 hover:bg-gray-200 transition-all"
            >
              Siguiente
            </button>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative py-24 bg-gray-400">
        <div className="absolute inset-0 bg-gradient-to-b from-gray-300 to-gray-500" />
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-5xl font-bold text-white mb-4">
            FUERZA QUE TRANSFORMA
          </h2>
          <p className="text-lg text-white/80 mb-8 tracking-widest uppercase">
            MAQUINARIA Y EXPERIENCIA AL SERVICIO DEL PROGRESO
          </p>
          <a
            href="https://wa.link/g8e4af"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-8 py-3 border border-white text-white hover:bg-white hover:text-[#253158] transition-all font-medium"
          >
            ENVIANOS UN MENSAJE
            <svg
              className="w-5 h-5"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
            </svg>
          </a>
        </div>
      </section>
    </>
  );
}
