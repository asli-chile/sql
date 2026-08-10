/**
 * Sección: NUESTROS SERVICIOS
 * Grid 3x3 con 9 servicios, fondo oscuro
 */
const Servicios = () => {
  const servicios = [
    {
      id: 1,
      titulo: 'Asesoría En Exportaciones',
      descripcion:
        'Gestión completa del proceso de exportación, desde la documentación hasta la coordinación con navieras y aduanas.',
    },
    {
      id: 2,
      titulo: 'Asesoría En Importaciones',
      descripcion:
        'Facilitamos la importación de tus productos, manejando trámites aduaneros y coordinación logística.',
    },
    {
      id: 3,
      titulo: 'Asesoría Documental',
      descripcion:
        'Asesoría especializada en documentación aduanera, certificados, permisos y toda la tramitación necesaria.',
    },
    {
      id: 4,
      titulo: 'Transporte Marítimo',
      descripcion:
        'Coordinación con las principales navieras del mundo para el transporte seguro de tu carga.',
    },
    {
      id: 5,
      titulo: 'Transporte Aéreo',
      descripcion:
        'Soluciones de transporte aéreo para cargas urgentes o de alto valor.',
    },
    {
      id: 6,
      titulo: 'Transporte Terrestre',
      descripcion:
        'Red de transporte terrestre confiable para mover tu carga desde y hacia puertos y aeropuertos.',
    },
    {
      id: 7,
      titulo: 'Gestión de Contenedores',
      descripcion:
        'Administración eficiente de contenedores, optimizando espacio y costos.',
    },
    {
      id: 8,
      titulo: 'Servicios Aduaneros',
      descripcion:
        'Tramitación aduanera completa, cumplimiento normativo y agilización de procesos.',
    },
    {
      id: 9,
      titulo: 'Asesoría Logística Integral',
      descripcion:
        'Soluciones logísticas completas y personalizadas para cada necesidad de tu empresa.',
    },
  ]

  return (
    <section id="servicios" className="py-16 md:py-24 bg-asli-dark">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
            NUESTROS SERVICIOS
          </h2>
          <p className="text-xl text-white/90">
            Soluciones logísticas integrales y especializadas
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
          {servicios.map((servicio) => {
            // Definir imágenes de fondo para todos los servicios
            const imagenesFondo = {
              1: '/img/expo.webp', // Exportaciones
              2: '/img/impo.webp', // Importaciones
              3: '/img/docs.webp', // Documental
              4: '/img/maritimo.webp', // Marítimo
              5: '/img/aereo.webp', // Aéreo
              6: '/img/camion.webp', // Terrestre
              7: '/img/container.webp', // Contenedores
              8: '/img/aduana.webp', // Aduanas
              9: '/img/logistica.webp', // Logística Integral
            }
            const tieneImagenFondo = imagenesFondo[servicio.id]

            return (
              <div
                key={servicio.id}
                className={`group rounded-lg p-4 sm:p-6 transition-all duration-300 ease-in-out relative overflow-hidden w-full transform hover:scale-105 ${
                  tieneImagenFondo
                    ? 'bg-cover bg-center bg-no-repeat'
                    : 'bg-asli-secondary/50 hover:bg-asli-secondary/70'
                }`}
                style={{
                  minHeight: '240px',
                  height: 'auto',
                  ...(tieneImagenFondo && {
                    backgroundImage: `url(${imagenesFondo[servicio.id]})`,
                    minHeight: '240px',
                  }),
                }}
              >
                {/* Overlay oscuro para mejorar legibilidad cuando hay imagen de fondo */}
                {tieneImagenFondo && (
                  <div className="absolute inset-0 bg-asli-dark/70 group-hover:bg-asli-dark/85 rounded-lg transition-all duration-300"></div>
                )}
                <div className="mb-4 relative z-10">
                  <div className={`w-16 h-16 rounded-lg flex items-center justify-center mb-4 ${
                    tieneImagenFondo ? 'bg-asli-primary/30' : 'bg-asli-primary/20'
                  }`}>
                    <svg
                      className="w-8 h-8 text-asli-primary"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                  </div>
                </div>
                <h3 className={`text-xl font-semibold mb-3 relative z-10 ${
                  tieneImagenFondo ? 'text-white drop-shadow-lg' : 'text-white'
                }`}>
                  {servicio.titulo}
                </h3>
                <p className={`leading-relaxed relative z-10 ${
                  tieneImagenFondo ? 'text-white drop-shadow-md' : 'text-gray-300'
                }`}>
                  {servicio.descripcion}
                </p>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}

export default Servicios
