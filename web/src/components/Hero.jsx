/**
 * Hero principal de la Home
 * Imagen de barco de fondo, texto sobre panel oscuro
 */
const Hero = () => {
  const handleAccederApp = () => {
    // Detectar si estamos en desarrollo local
    if (typeof window !== 'undefined') {
      const hostname = window.location.hostname
      const currentPort = window.location.port || '3000'
      const isLocal = hostname === 'localhost' || 
                      hostname === '127.0.0.1' || 
                      hostname === '' ||
                      hostname.startsWith('192.168.') || 
                      hostname.startsWith('10.') || 
                      hostname.startsWith('172.')
      
      if (isLocal) {
        // El ERP está en el puerto 3001 (la página principal está en 3000)
        const erpUrl = 'http://localhost:3001'
        console.log('🔄 Redirigiendo a la aplicación ERP:', erpUrl)
        // Usar replace para evitar que el botón "atrás" regrese a esta página
        window.location.replace(erpUrl)
      } else {
        // En producción, ir a la URL de Vercel
        window.location.href = 'https://registo-de-embarques-asli-toox.vercel.app'
      }
    }
  }

  const handleServiciosClick = () => {
    document.getElementById('servicios')?.scrollIntoView({ behavior: 'smooth' })
  }

  const handleContactoClick = () => {
    document.getElementById('contacto')?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <section
      id="inicio"
      className="relative min-h-[90vh] flex items-center justify-start bg-cover bg-center bg-no-repeat"
      style={{
        backgroundImage: `url('https://asli.cl/img/HERO.webp')`,
      }}
    >
      {/* Overlay oscuro semi-transparente - degradado vertical de abajo hacia arriba */}
      <div className="absolute inset-0 bg-gradient-to-t from-asli-dark via-asli-dark/70 to-transparent"></div>

      {/* Contenido */}
      <div className="relative z-10 container mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="max-w-2xl">
          {/* Logo con sombreado detrás de las letras */}
          <div className="mb-6 flex justify-center md:justify-start">
            <img
              src="https://asli.cl/img/logoblanco.png"
              alt="ASLI Logo"
              className="h-24 md:h-[120px] object-contain drop-shadow-[0_4px_8px_rgba(0,0,0,0.8)] drop-shadow-[0_2px_4px_rgba(0,0,0,0.6)]"
              style={{
                filter: 'drop-shadow(0 4px 12px rgba(0, 0, 0, 0.9)) drop-shadow(0 2px 6px rgba(0, 0, 0, 0.7))',
              }}
            />
          </div>
          <p className="text-center md:text-left text-white/80 text-sm md:text-base mb-4 uppercase tracking-wide">
            Logística y Comercio Exterior
          </p>
          {/* Panel oscuro con contenido */}
          <div className="bg-asli-dark/80 backdrop-blur-sm p-8 md:p-12 rounded-lg">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight">
              DEL ORIGEN AL DESTINO ASLI ESTÁ EN CADA PASO
            </h1>
            <p className="text-white text-lg mb-8 leading-relaxed">
              Asesorías y Servicios Logísticos Integrales Ltda.
              <br />
              Fundada en 2021 en Curicó, Región del Maule.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <button
                type="button"
                onClick={handleServiciosClick}
                className="bg-asli-primary text-white px-8 py-3 rounded-md text-lg font-semibold hover:bg-opacity-90 transition-all duration-200 shadow-md hover:shadow-lg"
                aria-label="Ver nuestros servicios"
              >
                NUESTROS SERVICIOS
              </button>
              <button
                type="button"
                onClick={handleContactoClick}
                className="bg-transparent text-white border-2 border-asli-primary px-8 py-3 rounded-md text-lg font-semibold hover:bg-asli-primary transition-all duration-200"
                aria-label="Contactarnos"
              >
                CONTACTANOS
              </button>
              <button
                type="button"
                onClick={handleAccederApp}
                className="bg-asli-accent text-white px-8 py-3 rounded-md text-lg font-semibold hover:bg-opacity-90 transition-all duration-200 shadow-md hover:shadow-lg text-center cursor-pointer"
                aria-label="Ir a la aplicación ERP"
              >
                ACCEDER A LA APP
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Chevron indicador */}
      <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 animate-bounce">
        <svg
          className="w-8 h-8 text-white"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 14l-7 7m0 0l-7-7m7 7V3"
          />
        </svg>
      </div>
    </section>
  )
}

export default Hero

