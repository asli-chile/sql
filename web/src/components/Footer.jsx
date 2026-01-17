/**
 * Footer
 * Fondo #11224E, información de contacto y slogan
 */
const Footer = () => {
  const handleEmailClick = () => {
    window.location.href = 'mailto:contacto@asli.cl'
  }

  const handleWhatsAppClick = () => {
    window.open('https://api.whatsapp.com/send/?phone=56968394225&text&type=phone_number&app_absent=0', '_blank')
  }

  const handleVisitanosClick = () => {
    document.getElementById('contacto')?.scrollIntoView({ behavior: 'smooth' })
  }

  const handleContactanosClick = () => {
    document.getElementById('contacto')?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <footer className="bg-asli-dark text-gray-200">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
          {/* Logo y slogan */}
          <div>
            <img
              src="https://asli.cl/img/logoblanco.png"
              alt="ASLI Logo"
              className="h-12 mb-3 object-contain"
            />
            <p className="text-white/80 text-sm uppercase tracking-wide mb-3">
              Logística y Comercio Exterior
            </p>
            <p className="text-asli-accent font-semibold italic text-lg">
              "NUESTRO LÍMITE ES TU DESTINO"
            </p>
          </div>

          {/* Enlaces Servicios */}
          <div>
            <h4 className="text-lg font-semibold text-white mb-4">Servicios</h4>
            <ul className="space-y-2">
              <li>
                <a
                  href="#servicios"
                  className="hover:text-asli-accent transition-colors duration-200"
                >
                  Transporte multimodal
                </a>
              </li>
              <li>
                <a
                  href="#servicios"
                  className="hover:text-asli-accent transition-colors duration-200"
                >
                  Logística frutícola
                </a>
              </li>
              <li>
                <a
                  href="#servicios"
                  className="hover:text-asli-accent transition-colors duration-200"
                >
                  Servicios Aduaneros
                </a>
              </li>
              <li>
                <a
                  href="#servicios"
                  className="hover:text-asli-accent transition-colors duration-200"
                >
                  Asesoría Logística
                </a>
              </li>
            </ul>
          </div>

          {/* Enlaces Empresa */}
          <div>
            <h4 className="text-lg font-semibold text-white mb-4">Empresa</h4>
            <ul className="space-y-2">
              <li>
                <a
                  href="#quienes-somos"
                  className="hover:text-asli-accent transition-colors duration-200"
                >
                  Quiénes Somos
                </a>
              </li>
              <li>
                <a
                  href="#equipo"
                  className="hover:text-asli-accent transition-colors duration-200"
                >
                  Nuestro Equipo
                </a>
              </li>
              <li>
                <a
                  href="#socios"
                  className="hover:text-asli-accent transition-colors duration-200"
                >
                  Socios
                </a>
              </li>
              <li>
                <a
                  href="#contacto"
                  className="hover:text-asli-accent transition-colors duration-200"
                >
                  Contacto
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-700 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-sm text-center md:text-left">
              &copy; {new Date().getFullYear()} ASLI - Asesorías y Servicios
              Logísticos Integrales Ltda. Todos los derechos reservados.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <button
                type="button"
                onClick={handleVisitanosClick}
                className="bg-transparent text-white border-2 border-asli-primary px-6 py-2 rounded-md font-semibold hover:bg-asli-primary transition-all duration-200"
              >
                Visítanos
              </button>
              <button
                type="button"
                onClick={handleContactanosClick}
                className="bg-asli-primary text-white px-6 py-2 rounded-md font-semibold hover:bg-opacity-90 transition-all duration-200"
              >
                CONTACTANOS AHORA
              </button>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}

export default Footer

