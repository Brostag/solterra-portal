import Link from "next/link";
import ClientLogos from "@/components/ClientLogos";

export default function QuienesSomos() {
  return (
    <>
      {/* Hero Section */}
      <section className="relative h-[60vh] min-h-[500px] flex items-center overflow-hidden">
        <img
          src="https://ext.same-assets.com/2134444905/4130310099.jpeg"
          alt="Equipo Solterra"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-black/30" />

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-20">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
            QUIENES SOMOS
          </h1>
          <p className="text-xl text-white/90 mb-8">
            Un equipo unido, construyendo con fuerza y dedicación.
          </p>
          <Link
            href="/servicios"
            className="inline-block px-8 py-3 bg-[#253158] text-white hover:bg-[#1e305e] transition-all font-medium"
          >
            NUESTROS SERVICIOS
          </Link>
        </div>
      </section>

      {/* Compromiso Section */}
      <section className="py-20 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl md:text-4xl font-bold text-[#253158] mb-6">
            NUESTRO COMPROMISO, TU PROYECTO
          </h2>
          <div className="w-16 h-1 bg-[#c6352e] mb-8" />
          <p className="text-gray-600 leading-relaxed">
            Solterra es una empresa especializada en ofrecer soluciones integrales
            en movimiento de tierra, arriendo de maquinaria, construcción e
            ingeniería en el norte de Chile. Con más de 15 años de experiencia,
            nuestro equipo, unido y comprometido, se distingue por entregar
            resultados de alta calidad en proyectos públicos, privados y mineros.
            Nos enorgullece trabajar con dedicación y precisión, garantizando la
            satisfacción de nuestros clientes en cada desafío que asumimos.
          </p>
        </div>
      </section>

      {/* Vision & Mision */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-12">
            {/* Vision */}
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-1 h-8 bg-[#c6352e]" />
                <h3 className="text-2xl font-bold text-[#253158]">Visión</h3>
              </div>
              <p className="text-gray-600 leading-relaxed">
                Nuestra visión es ser reconocidos como líderes en el sector,
                destacándonos por nuestra capacidad técnica, compromiso con la
                excelencia y respeto por el medio ambiente en cada proyecto que
                emprendemos.
              </p>
            </div>

            {/* Mision */}
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-1 h-8 bg-[#c6352e]" />
                <h3 className="text-2xl font-bold text-[#c6352e]">Misión</h3>
              </div>
              <p className="text-gray-600 leading-relaxed">
                Nuestra misión es ser un referente en la industria de la
                construcción, movimiento de tierra, y servicios de ingeniería en
                el norte de Chile. Buscamos proporcionar soluciones efectivas que
                superen las expectativas de nuestros clientes, siempre con un
                enfoque en la seguridad, calidad y sostenibilidad.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative py-24 bg-gray-400">
        <div className="absolute inset-0 bg-gradient-to-b from-gray-300 to-gray-500" />
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-5xl font-bold text-white mb-4">
            MOVIENDO TIERRA, CREANDO CAMINOS
          </h2>
          <p className="text-lg text-white/80 mb-8 tracking-widest uppercase">
            SOLTERRA BARRIO INDUSTRIAL CALAMA, CHILE
          </p>
          <Link
            href="/servicios"
            className="inline-block px-8 py-3 border border-white text-white hover:bg-white hover:text-[#253158] transition-all font-medium"
          >
            CONOCE NUESTROS SERVICIOS
          </Link>
        </div>
      </section>

      {/* Empresas Section */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl md:text-3xl font-bold text-[#253158] text-center mb-4">
            EMPRESAS QUE RESPALDAN NUESTRA TRAYECTORIA
          </h2>
          <div className="w-16 h-1 bg-[#c6352e] mx-auto mb-12" />
        </div>
      </section>

      <ClientLogos />
    </>
  );
}
