const clientLogos = [
  { src: "https://ext.same-assets.com/2134444905/287274279.jpeg", alt: "ACSA Constructora" },
  { src: "https://ext.same-assets.com/2134444905/1837533631.jpeg", alt: "Valko Constructora" },
  { src: "https://ext.same-assets.com/2134444905/825764042.jpeg", alt: "OCYR" },
  { src: "https://ext.same-assets.com/2134444905/1055640610.jpeg", alt: "Ingevec" },
  { src: "https://ext.same-assets.com/2134444905/3157591697.jpeg", alt: "Codelco" },
  { src: "https://ext.same-assets.com/2134444905/1599580090.png", alt: "OCYR Logo" },
  { src: "https://ext.same-assets.com/2134444905/792966183.png", alt: "Codelco Logo" },
];

export default function ClientLogos() {
  return (
    <section className="py-16 bg-white overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-2xl md:text-3xl font-bold text-[#253158] text-center mb-4">
          Clientes que Avalan Nuestro Compromiso y Calidad
        </h2>
        <p className="text-gray-600 text-center mb-12 max-w-4xl mx-auto">
          A lo largo de nuestros más de 15 años de experiencia, hemos trabajado con una variedad de clientes en proyectos de gran envergadura. Su confianza y satisfacción son nuestro mejor aval, y nos enorgullece ser parte del éxito de cada uno de ellos.
        </p>

        {/* Logo carousel */}
        <div className="relative">
          <div className="flex animate-scroll">
            {[...clientLogos, ...clientLogos].map((logo, index) => (
              <div
                key={index}
                className="flex-shrink-0 mx-8 flex items-center justify-center"
              >
                <img
                  src={logo.src}
                  alt={logo.alt}
                  loading="lazy"
                  className="h-16 md:h-20 w-auto object-contain grayscale hover:grayscale-0 transition-all"
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
