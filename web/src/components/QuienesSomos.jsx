/**
 * Sección: QUIÉNES SOMOS
 * Fondo oscuro, cards con información institucional
 */
const QuienesSomos = () => {
  return (
    <section id="quienes-somos" className="py-16 md:py-24 bg-asli-dark">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
            QUIÉNES SOMOS
          </h2>
          <p className="text-xl text-white/90 mb-8">
            Tu Mejor Opción en Logística Integral
          </p>
          <p className="text-lg text-gray-300 max-w-3xl mx-auto leading-relaxed">
            Somos una empresa especializada en servicios logísticos integrales,
            con un enfoque profesional y comprometido con la excelencia. Desde
            nuestra fundación en 2021, hemos construido una red sólida de
            alianzas estratégicas que nos permite ofrecer soluciones completas
            y eficientes para nuestros clientes.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 mt-12">
          {/* Card: Red de Alianzas */}
          <div className="bg-asli-secondary/50 rounded-lg p-6 text-center">
            <div className="mb-4">
              <svg
                className="w-16 h-16 mx-auto text-asli-primary"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-white mb-3">
              Red de Alianzas Estratégicas
            </h3>
            <p className="text-gray-300">
              Colaboramos con los mejores proveedores y socios estratégicos del
              sector logístico para garantizar servicios de calidad.
            </p>
          </div>

          {/* Card: Año de Fundación */}
          <div className="bg-asli-secondary/50 rounded-lg p-6 text-center">
            <div className="mb-4">
              <div className="text-6xl font-bold text-asli-primary">2021</div>
            </div>
            <h3 className="text-xl font-bold text-white mb-3">
              Año de Fundación
            </h3>
            <p className="text-gray-300">
              Fundada en Curicó, Región del Maule, con la visión de ser líderes
              en servicios logísticos integrales.
            </p>
          </div>

          {/* Card: Satisfacción */}
          <div className="bg-asli-secondary/50 rounded-lg p-6 text-center">
            <div className="mb-4">
              <div className="text-6xl font-bold text-asli-primary">100</div>
            </div>
            <h3 className="text-xl font-bold text-white mb-3">% Satisfacción</h3>
            <p className="text-gray-300">
              Comprometidos con la excelencia y la satisfacción total de
              nuestros clientes en cada operación.
            </p>
          </div>
        </div>

        {/* Imagen de edificio */}
        <div className="mt-12 flex justify-center">
          <div className="w-full md:w-2/3 lg:w-1/2 max-w-4xl">
            <div 
              className="bg-cover bg-center bg-no-repeat rounded-lg aspect-video"
              style={{
                backgroundImage: 'url(https://asli.cl/img/edificio.webp)',
              }}
            >
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

export default QuienesSomos

