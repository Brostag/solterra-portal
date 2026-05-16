import Image from "next/image";
import Link from "next/link";

const footerLinks = [
  { href: "/", label: "Inicio" },
  { href: "/quienes-somos", label: "Quienes Somos" },
  { href: "/servicios", label: "Servicios" },
  { href: "/experiencia", label: "Experiencia" },
  { href: "/contacto", label: "Contacto" },
];

export default function Footer() {
  return (
    <footer className="bg-[#1e305e] text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Logo and description */}
          <div>
            <Image
              src="https://ext.same-assets.com/2134444905/2984985315.png"
              alt="Solterra Logo Blanco"
              width={200}
              height={80}
              className="h-20 w-auto mb-4"
            />
            <p className="text-sm text-gray-300 mb-4">
              Te invitamos a seguir nuestras redes de comunicación
            </p>
            <p className="text-sm italic text-white">
              Tu proyecto, nuestro compromiso con la calidad
            </p>
          </div>

          {/* Links */}
          <div>
            <h3 className="text-sm font-bold uppercase mb-4 tracking-wider">
              Enlaces Sitio Web
            </h3>
            <nav className="flex flex-col space-y-3">
              {footerLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="text-sm text-gray-300 hover:text-white transition-colors flex items-center gap-2"
                >
                  <span className="text-[#c6352e]">&#9654;</span>
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>

          {/* Contact Info */}
          <div>
            <h3 className="text-sm font-bold uppercase mb-4 tracking-wider">
              Contáctanos y conoce más sobre nosotros
            </h3>
            <div className="flex flex-col space-y-4">
              <div className="flex items-center gap-3">
                <svg
                  className="h-5 w-5 text-gray-300"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                  />
                </svg>
                <a
                  href="mailto:contacto@solterra.cl"
                  className="text-sm text-gray-300 hover:text-white"
                >
                  contacto@solterra.cl
                </a>
              </div>
              <div className="flex items-center gap-3">
                <svg
                  className="h-5 w-5 text-gray-300"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                  />
                </svg>
                <span className="text-sm text-gray-300">
                  +56 9 7649 2084 | 55 242 6259
                </span>
              </div>
              <div className="flex items-start gap-3">
                <svg
                  className="h-5 w-5 text-gray-300 mt-0.5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
                <span className="text-sm text-gray-300">
                  Calle Juan Zaldívar sitio 20, Barrio Industrial Puerto Seco,
                  Calama. Chile
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Copyright */}
        <div className="mt-12 pt-8 border-t border-gray-600">
          <p className="text-sm text-gray-400">
            Energizado por{" "}
            <a
              href="https://vialoop.cl"
              target="_blank"
              rel="noopener noreferrer"
              className="text-white hover:underline"
            >
              Agencia Digital Vialoop.cl
            </a>{" "}
            © Solterra 2024 | Todos los derechos reservados
          </p>
        </div>
      </div>
    </footer>
  );
}
