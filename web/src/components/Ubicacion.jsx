/**
 * Sección: UBICACIÓN / NUESTRAS OFICINAS
 * Mapa y botones de navegación
 */
const Ubicacion = () => {
  const handleGoogleMaps = () => {
    window.open(
      'https://maps.app.goo.gl/cGrni677vZDk5pp26',
      '_blank'
    )
  }

  const handleWaze = () => {
    window.open(
      'https://www.waze.com/en/live-map/directions/asli-logistica-y-comercio-exterior-ruta-5-sur?place=w.189269418.1892694183.25097777',
      '_blank'
    )
  }

  const handleAppleMaps = () => {
    window.open(
      'https://maps.apple.com/place?map=satellite&place-id=IEA0826463ACE71BC&address=Caletera+Ruta+5%2C+Curic%C3%B3%2C+Chile&coordinate=-34.9743702%2C-71.2034765&name=ASLI+-+Log%C3%ADstica+y+Comercio+Exterior&_provider=9902',
      '_blank'
    )
  }

  return (
    <section id="contacto" className="py-16 md:py-24 bg-asli-dark">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
            UBICACIÓN / NUESTRAS OFICINAS
          </h2>
          <p className="text-xl text-white/90">Visítanos o contáctanos directamente</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Información de contacto */}
          <div>
            <div className="mb-8">
              <h3 className="text-2xl font-bold text-white mb-4">Dirección</h3>
              <p className="text-gray-300 text-lg mb-2">
                Longitudinal Sur Km. 186
              </p>
              <p className="text-gray-300 text-lg">
                3340000 Curicó, Maule
              </p>
            </div>

            <div className="mb-8">
              <h3 className="text-2xl font-bold text-white mb-4">Contacto</h3>
              <p className="text-gray-300 text-lg">
                Mario Basaez
              </p>
              <a
                href="tel:+56968394225"
                className="text-asli-primary hover:text-asli-accent transition-colors duration-200 text-lg"
              >
                +56 9 6839 4225
              </a>
            </div>

            <div className="flex flex-col sm:flex-row gap-4">
              <button
                type="button"
                onClick={handleGoogleMaps}
                className="bg-asli-primary text-white px-6 py-3 rounded-md font-semibold hover:bg-opacity-90 transition-all duration-200"
              >
                GOOGLE MAPS
              </button>
              <button
                type="button"
                onClick={handleWaze}
                className="bg-asli-primary text-white px-6 py-3 rounded-md font-semibold hover:bg-opacity-90 transition-all duration-200"
              >
                WAZE
              </button>
              <button
                type="button"
                onClick={handleAppleMaps}
                className="bg-asli-primary text-white px-6 py-3 rounded-md font-semibold hover:bg-opacity-90 transition-all duration-200"
              >
                APPLE MAPS
              </button>
            </div>
          </div>

          {/* Mapa */}
          <div className="bg-asli-secondary/30 rounded-lg overflow-hidden">
            <iframe
              src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d4022.7608648636206!2d-71.20605142340338!3d-34.97436577716874!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x966457bfbad3103d%3A0x1a06a30ef08571a5!2sASLI%20-%20Log%C3%ADstica%20y%20Comercio%20Exterior!5e1!3m2!1ses-419!2scl!4v1768069231458!5m2!1ses-419!2scl"
              width="100%"
              height="100%"
              style={{ minHeight: '400px', border: 0 }}
              allowFullScreen=""
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              title="Ubicación ASLI - Logística y Comercio Exterior"
            ></iframe>
          </div>
        </div>
      </div>
    </section>
  )
}

export default Ubicacion

