/**
 * Sección: ASESORÍA Y COORDINACIÓN INTEGRAL EN COMERCIO INTERNACIONAL
 * Especialización en fruta fresca y congelada
 */
const AsesoriaComercioInternacional = () => {
  const caracteristicas = [
    {
      titulo: 'Asesoría Integral en todo momento',
      icono: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    {
      titulo: 'Coordinación con Proveedores',
      icono: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      ),
    },
    {
      titulo: 'Guía en Certificación OEA',
      icono: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
        </svg>
      ),
    },
    {
      titulo: 'Cumplimiento de Normativas',
      icono: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
      ),
    },
  ]

  return (
    <section className="py-16 md:py-24 bg-asli-dark">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-4">
            ASESORÍA Y COORDINACIÓN INTEGRAL EN COMERCIO INTERNACIONAL
          </h2>
          <p className="text-xl text-white/90 max-w-3xl mx-auto">
            Te acompañamos en cada etapa del proceso: packaging, logística,
            documentación y certificaciones.
          </p>
        </div>

        {/* Texto y características - Centrado */}
        <div className="max-w-4xl mx-auto text-center space-y-8">
          <div className="space-y-6">
            <div className="relative mb-6">
              <h3 className="text-2xl md:text-3xl font-bold text-white">
                Asesoría y Coordinación en Importación y Exportación
              </h3>
              <div className="w-24 h-1 bg-asli-primary rounded-full mx-auto mt-3"></div>
            </div>
            <p className="text-gray-300 mb-8 leading-relaxed text-lg max-w-3xl mx-auto">
              Especializados en logística de fruta fresca y congelada,
              ofrecemos un acompañamiento completo desde el origen hasta el
              destino. Nuestro equipo experto gestiona todos los aspectos de tu
              operación internacional, asegurando el cumplimiento de normativas,
              certificaciones y estándares de calidad.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl mx-auto">
              {caracteristicas.map((caracteristica, index) => (
                <div
                  key={index}
                  className="group flex items-start space-x-3 bg-asli-secondary/30 p-4 rounded-lg hover:bg-asli-secondary/50 transition-all duration-300 ease-in-out transform hover:scale-105 hover:shadow-lg hover:shadow-asli-primary/30 border border-transparent hover:border-asli-primary/30"
                >
                  <div className="text-asli-accent flex-shrink-0 mt-1 transition-transform duration-300 group-hover:scale-110 group-hover:text-asli-primary">
                    {caracteristica.icono}
                  </div>
                  <p className="text-white text-sm font-medium group-hover:text-asli-light">
                    {caracteristica.titulo}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

export default AsesoriaComercioInternacional

