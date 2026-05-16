"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const navItems = [
  { href: "/", label: "Home" },
  { href: "/quienes-somos", label: "Quienes Somos" },
  { href: "/servicios", label: "Servicios" },
  { href: "/experiencia", label: "Experiencia" },
  { href: "/contacto", label: "Contacto" },
];

export default function Header() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-sm shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Logo */}
          <Link href="/" className="flex-shrink-0">
            <Image
              src="https://ext.same-assets.com/2134444905/2150008532.png"
              alt="Solterra Logo"
              width={150}
              height={50}
              className="h-12 w-auto"
              priority
            />
          </Link>

          {/* Desktop Navigation + Portal button */}
          <div className="hidden md:flex items-center space-x-8">
            <nav className="flex items-center space-x-8">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`text-sm font-medium transition-colors hover:text-[#c6352e] ${
                    pathname === item.href
                      ? "text-[#253158] font-semibold"
                      : "text-[#253158]"
                  }`}
                >
                  {item.label}
                </Link>
              ))}
            </nav>
            <Link
              href="/login"
              className="text-sm font-semibold px-4 py-2 rounded-md bg-[#253158] text-white hover:bg-[#1e2f4d] transition-colors"
            >
              Acceso Portal
            </Link>
          </div>

          {/* Mobile menu button */}
          <button
            type="button"
            className="md:hidden p-2 rounded-md text-[#253158]"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            <svg
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              {mobileMenuOpen ? (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              ) : (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              )}
            </svg>
          </button>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="md:hidden py-4 border-t">
            <nav className="flex flex-col space-y-4">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`text-sm font-medium transition-colors hover:text-[#c6352e] ${
                    pathname === item.href
                      ? "text-[#253158] font-semibold"
                      : "text-[#253158]"
                  }`}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {item.label}
                </Link>
              ))}
            </nav>
            <div className="mt-4 pt-4 border-t">
              <Link
                href="/login"
                className="block text-center text-sm font-semibold px-4 py-2.5 rounded-md bg-[#253158] text-white hover:bg-[#1e2f4d] transition-colors"
                onClick={() => setMobileMenuOpen(false)}
              >
                Acceso Portal
              </Link>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
