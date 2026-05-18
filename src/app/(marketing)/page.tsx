import Link from "next/link";
import Image from "next/image";
import ClientLogos from "@/components/ClientLogos";
import CTASection from "@/components/CTASection";

export default function Home() {
  return (
    <>
      {/* Hero Section with Video Background */}
      <section className="relative h-[80vh] min-h-[600px] flex items-center overflow-hidden bg-[#1a2035]">
        {/* Video Background */}
        <video
          autoPlay
          loop
          muted
          playsInline
          preload="auto"
          className="absolute inset-0 w-full h-full object-cover"
        >
          <source
            src="https://ext.same-assets.com/2134444905/3237422497.mp4"
            type="video/mp4"
          />
        </video>

        {/* Overlay */}
        <div className="absolute inset-0 bg-black/30" />

        {/* Content */}
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-3xl md:text-5xl lg:text-6xl font-bold text-white mb-4 leading-tight max-w-3xl">
            SOLUCIONES EN MOVIMIENTO DE TIERRA, CONSTRUCCIÓN E INGENIERÍA
          </h1>
          <p className="text-lg md:text-xl text-white/90 mb-8">
            Bienvenido a solterra.cl
          </p>
          <Link
            href="/contacto"
            className="inline-block px-8 py-3 bg-white/20 backdrop-blur-sm border border-white/50 text-white hover:bg-white hover:text-[#253158] transition-all font-medium"
          >
            CONTACTARNOS
          </Link>
        </div>
      </section>

      {/* Welcome Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl">
            <p className="text-sm text-gray-500 uppercase tracking-wider mb-2">
              BIENVENIDOS A SOLTERRA.CL
            </p>
            <h2 className="text-3xl md:text-4xl font-bold text-[#253158] mb-6">
              Solterra Movimiento de Tierra, Maquinarias y Equipos
            </h2>
            <div className="w-16 h-1 bg-[#c6352e] mb-6" />
            <p className="text-gray-600 leading-relaxed mb-8">
              Es una empresa dedicada a ofrecer soluciones integrales en
              movimiento de tierra, arriendo de maquinaria, construcción e
              ingeniería en el norte de Chile. Con más de 15 años de experiencia
              en el rubro, nos destacamos por nuestro equipo unido y
              comprometido, siempre enfocado en entregar resultados de calidad
              para proyectos públicos, privados y mineros.
            </p>
            <div className="flex flex-wrap gap-4">
              <Link
                href="/quienes-somos"
                className="inline-block px-6 py-3 bg-[#253158] text-white hover:bg-[#1e305e] transition-all font-medium"
              >
                Más de nosotros
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Slogan Section */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <Image
            src="https://ext.same-assets.com/2134444905/2984985315.png"
            alt="Solterra Logo"
            width={200}
            height={80}
            className="h-20 w-auto mx-auto mb-8 opacity-30"
          />
          <h2 className="text-3xl md:text-4xl font-light text-gray-400">
            Transformamos el terreno, construimos el futuro
          </h2>
        </div>
      </section>

      {/* Client Logos */}
      <ClientLogos />

      {/* CTA Section */}
      <CTASection
        title="SOLTERRA"
        subtitle="Calle Juan Zaldívar sitio 20, Barrio Industrial Puerto Seco, Calama. Chile"
        buttonText="CONTÁCTANOS"
        buttonLink="/contacto"
      />
    </>
  );
}
