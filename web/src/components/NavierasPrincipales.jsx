/**
 * Sección: NAVIERAS Y AEROLÍNEAS
 * Logos de las principales navieras y aerolíneas con las que trabajan
 */
const NavierasPrincipales = () => {
  const navieras = [
    { nombre: 'Avianca', logo: 'https://asli.cl/img/avianca.png' },
    { nombre: 'CMA', logo: 'https://asli.cl/img/cma.png' },
    { nombre: 'LATAM', logo: 'https://asli.cl/img/latamcargo.png' },
    { nombre: 'ZIM', logo: 'https://asli.cl/img/zim.png' },
    { nombre: 'Maersk', logo: 'https://asli.cl/img/maersk.png' },
    { nombre: 'OOCL', logo: 'https://asli.cl/img/oocl.png' },
    { nombre: 'Iberia', logo: 'https://asli.cl/img/iberia.png' },
    { nombre: 'MSC', logo: 'https://asli.cl/img/msc.png' },
    { nombre: 'PIL', logo: 'https://asli.cl/img/pil.png' },
    { nombre: 'SkyLogo', logo: 'https://asli.cl/img/skylogo.png' },
    { nombre: 'COSCO', logo: 'https://asli.cl/img/cosco.png' },
    { nombre: 'Yangming', logo: 'https://asli.cl/img/yangming.png' },
    { nombre: 'ONE', logo: 'https://asli.cl/img/one.png' },
    { nombre: 'JetSmart', logo: 'https://asli.cl/img/jetsmart.png' },
    { nombre: 'Wan Hai', logo: 'https://asli.cl/img/wanhai.png' },
  ]

  return (
    <section className="py-16 md:py-24 bg-asli-dark">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
            NAVIERAS Y AEROLÍNEAS
          </h2>
          <p className="text-xl text-white/90">
            Colaboramos con las mejores navieras y aerolíneas del sector
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6 lg:gap-8 max-w-6xl mx-auto">
          {navieras.map((naviera, index) => (
            <div
              key={index}
              className="bg-white/20 backdrop-blur-md rounded-lg p-6 flex items-center justify-center hover:bg-white/30 transition-all duration-200 min-h-[120px] border border-white/20 shadow-lg hover:shadow-xl"
            >
              <img
                src={naviera.logo}
                alt={naviera.nombre}
                className="max-w-full max-h-16 w-auto h-auto object-contain"
                onError={(e) => {
                  e.target.style.display = 'none'
                  e.target.parentElement.innerHTML = `<div class="text-gray-400 text-xs text-center">${naviera.nombre}</div>`
                }}
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

export default NavierasPrincipales

