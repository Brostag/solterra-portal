import Link from "next/link";

const services = [
  {
    title: "MOVIMIENTO DE TIERRA",
    description:
      "Ejecutamos proyectos de movimiento de tierra de diversas escalas, desde nivelación de terrenos hasta excavaciones complejas. Con equipos modernos y un equipo experimentado, garantizamos que cada proyecto se realice con precisión, seguridad y dentro de los plazos establecidos, cumpliendo con los más altos estándares de calidad.",
    image: "https://ext.same-assets.com/2134444905/2291124725.jpeg",
    imagePosition: "left",
  },
  {
    title: "ARRIENDO DE MAQUINARIA",
    description:
      "Ofrecemos un servicio de arriendo de maquinaria confiable y eficiente, que incluye una amplia gama de equipos para construcción, movimiento de tierra y otros proyectos industriales. Nuestra flota está compuesta por maquinaria de última generación, lista para satisfacer las necesidades de cada cliente, asegurando un rendimiento óptimo en cualquier tipo de terreno o condición.",
    image: "https://ext.same-assets.com/2134444905/2403586051.jpeg",
    imagePosition: "right",
  },
  {
    title: "CONSTRUCCIÓN",
    description:
      "Desarrollamos y gestionamos proyectos de construcción desde la etapa de planificación hasta la entrega final. Nos especializamos en obras de infraestructura tanto públicas como privadas, siempre enfocándonos en la durabilidad, funcionalidad y cumplimiento de normativas. Nuestro compromiso es construir con precisión y excelencia, aportando al crecimiento y desarrollo sostenible de la región.",
    image: "https://ext.same-assets.com/2134444905/1755248872.jpeg",
    imagePosition: "left",
  },
  {
    title: "INGENIERÍA",
    description:
      "Brindamos soluciones de ingeniería adaptadas a cada proyecto, desde estudios preliminares hasta la supervisión de la ejecución. Nuestro equipo de ingenieros trabaja en estrecha colaboración con nuestros clientes para diseñar y optimizar cada obra, asegurando que los proyectos no solo cumplan con sus objetivos técnicos, sino también con las expectativas de costo y tiempo.",
    image: "https://ext.same-assets.com/2134444905/3701056862.jpeg",
    imagePosition: "right",
  },
];

export default function Servicios() {
  return (
    <>
      {/* Hero Section */}
      <section className="relative h-[60vh] min-h-[500px] flex items-center overflow-hidden">
        <img
          src="https://ext.same-assets.com/2134444905/2277813565.jpeg"
          alt="Servicios Solterra"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-black/40" />

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-right w-full">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
            SERVICIOS
          </h1>
          <p className="text-xl text-white/90 mb-8">
            Calidad en cada proyecto
          </p>
          <Link
            href="/contacto"
            className="inline-block px-8 py-3 bg-[#253158]/80 text-white hover:bg-[#253158] transition-all font-medium"
          >
            Contactarnos
          </Link>
        </div>
      </section>

      {/* Intro Section */}
      <section className="py-20 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl md:text-4xl font-bold text-[#253158] mb-6">
            NUESTROS SERVICIOS
          </h2>
          <div className="w-16 h-1 bg-[#c6352e] mb-8" />
          <p className="text-gray-600 leading-relaxed">
            En Solterra, ofrecemos una amplia gama de servicios especializados en
            movimiento de tierra para obras públicas, privadas, minería y
            restauraciones paisajistas. Desde nivelación de terrenos y
            excavaciones profundas hasta la creación de rutas y renta de
            maquinaria, nuestro equipo altamente capacitado y nuestra flota de
            equipos modernos están preparados para abordar cualquier desafío. Nos
            comprometemos a entregar soluciones eficientes, seguras y de calidad
            en cada proyecto.
          </p>
        </div>
      </section>

      {/* Services List */}
      {services.map((service, index) => (
        <section
          key={service.title}
          className={`py-16 ${index % 2 === 0 ? "bg-white" : "bg-gray-50"}`}
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div
              className={`grid md:grid-cols-2 gap-12 items-center ${
                service.imagePosition === "right" ? "md:flex-row-reverse" : ""
              }`}
            >
              {service.imagePosition === "left" ? (
                <>
                  <div className="relative">
                    <img
                      src={service.image}
                      alt={service.title}
                      className="w-full h-80 object-cover"
                    />
                    <div className="absolute bottom-0 left-0 w-1/2 h-4 bg-[#253158]" />
                  </div>
                  <div>
                    <h3 className="text-2xl md:text-3xl font-bold text-[#253158] mb-6">
                      {service.title}
                    </h3>
                    <p className="text-gray-600 leading-relaxed">
                      {service.description}
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <div className="md:order-2">
                    <div className="relative">
                      <img
                        src={service.image}
                        alt={service.title}
                        className="w-full h-80 object-cover"
                      />
                      <div className="absolute bottom-0 right-0 w-1/2 h-4 bg-[#253158]" />
                    </div>
                  </div>
                  <div className="md:order-1 md:text-right">
                    <h3 className="text-2xl md:text-3xl font-bold text-[#253158] mb-6">
                      {service.title}
                    </h3>
                    <p className="text-gray-600 leading-relaxed">
                      {service.description}
                    </p>
                  </div>
                </>
              )}
            </div>
          </div>
        </section>
      ))}

      {/* CTA Section */}
      <section className="relative py-24 bg-[#253158]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-5xl font-bold text-white mb-4">
            JUNTOS LOGRAMOS MÁS
          </h2>
          <p className="text-lg text-white/80 mb-8 tracking-widest uppercase">
            CONTACTO@SOLTERRA.CL
          </p>
          <Link
            href="/experiencia"
            className="inline-block px-8 py-3 border border-white text-white hover:bg-white hover:text-[#253158] transition-all font-medium"
          >
            Nuestra Experiencia
          </Link>
        </div>
      </section>
    </>
  );
}
