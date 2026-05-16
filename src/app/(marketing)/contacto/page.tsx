"use client";

import { useState } from "react";

export default function Contacto() {
  const [formData, setFormData] = useState({
    nombre: "",
    email: "",
    telefono: "",
    asunto: "",
    mensaje: "",
    captcha: "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Form submission logic would go here
    alert("Mensaje enviado correctamente");
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  return (
    <>
      {/* Hero Section */}
      <section className="relative h-[40vh] min-h-[300px] flex items-center overflow-hidden">
        <div className="absolute inset-0 bg-[#253158]" />

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center w-full">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
            CONTACTO
          </h1>
          <p className="text-xl text-white/90">
            Calle Juan Zaldívar sitio 20, Barrio Industrial Puerto Seco, Calama.
            Chile
          </p>
        </div>
      </section>

      {/* Contact Form Section */}
      <section className="py-20 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl md:text-4xl font-bold text-[#253158] text-center mb-4">
            FORMULARIO DE CONTACTO
          </h2>
          <div className="w-16 h-1 bg-[#c6352e] mx-auto mb-8" />
          <p className="text-gray-600 text-center mb-12">
            Estamos aquí para ayudarte a hacer realidad tus proyectos. Si tienes
            alguna consulta, necesitas una cotización o deseas más información
            sobre nuestros servicios, no dudes en contactarnos. A continuación,
            encontrarás un formulario de contacto donde podrás enviarnos tus
            requerimientos. Nuestro equipo se pondrá en contacto contigo lo antes
            posible para brindarte la mejor solución a tus necesidades.
          </p>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <input
                type="text"
                name="nombre"
                placeholder="Nombre"
                value={formData.nombre}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 focus:border-[#253158] focus:outline-none transition-colors"
                required
              />
              <input
                type="email"
                name="email"
                placeholder="Email"
                value={formData.email}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 focus:border-[#253158] focus:outline-none transition-colors"
                required
              />
            </div>
            <div className="grid md:grid-cols-2 gap-6">
              <input
                type="tel"
                name="telefono"
                placeholder="Telefono"
                value={formData.telefono}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 focus:border-[#253158] focus:outline-none transition-colors"
              />
              <input
                type="text"
                name="asunto"
                placeholder="Asunto"
                value={formData.asunto}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 focus:border-[#253158] focus:outline-none transition-colors"
              />
            </div>
            <textarea
              name="mensaje"
              placeholder="Mensaje"
              value={formData.mensaje}
              onChange={handleChange}
              rows={6}
              className="w-full px-4 py-3 border border-gray-300 focus:border-[#253158] focus:outline-none transition-colors resize-none"
              required
            />
            <div className="flex items-center justify-end gap-4">
              <span className="text-gray-600">12 + 2 =</span>
              <input
                type="text"
                name="captcha"
                value={formData.captcha}
                onChange={handleChange}
                className="w-20 px-4 py-3 border border-gray-300 focus:border-[#253158] focus:outline-none transition-colors"
                required
              />
              <button
                type="submit"
                className="px-8 py-3 bg-[#253158] text-white hover:bg-[#1e305e] transition-all font-medium"
              >
                Enviar
              </button>
            </div>
          </form>
        </div>
      </section>

      {/* Map Section */}
      <section className="h-[400px] bg-gray-200">
        <iframe
          src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3672.8882881817573!2d-68.88338379999999!3d-22.443903!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x96a9444fb0000001%3A0x1!2zMjLCsDI2JzM4LjEiUyA2OMKwNTInNTIuMyJX!5e0!3m2!1ses!2scl!4v1234567890"
          width="100%"
          height="100%"
          style={{ border: 0 }}
          allowFullScreen
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          title="Ubicación Solterra"
        />
      </section>
    </>
  );
}
