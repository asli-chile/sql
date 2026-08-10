/**
 * Sección: SOMOS PARTE DE
 * Aliados estratégicos y partners
 */
const SomosParteDe = () => {
  // Logos de partners y alianzas estratégicas
  const partners = [
    {
      id: 1,
      nombre: 'Agronexo',
      logo: '/img/agronexo.png',
    },
    {
      id: 2,
      nombre: 'Fedefruta',
      logo: '/img/fedefruta.png',
    },
    {
      id: 3,
      nombre: 'Maulealimenta',
      logo: '/img/maulealimenta.png',
    },
    {
      id: 4,
      nombre: 'ProChile',
      logo: '/img/prochile2.png',
    },
  ]

  return (
    <section id="socios" className="py-16 md:py-24 bg-asli-dark">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
            SOMOS PARTE DE
          </h2>
          <p className="text-xl text-white/90 max-w-3xl mx-auto">
            Respaldados por alianzas estratégicas con líderes de la industria
            logística global
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 lg:gap-8 max-w-4xl mx-auto">
          {partners.map((partner) => (
            <div
              key={partner.id}
              className="bg-white/5 rounded-lg p-6 flex items-center justify-center hover:bg-white/10 transition-all duration-200"
            >
              <img
                src={partner.logo}
                alt={partner.nombre}
                className="max-w-full h-16 object-contain"
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

export default SomosParteDe

