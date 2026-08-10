/**
 * Sección: NUESTROS PRINCIPALES CLIENTES
 * Grid con logos de clientes
 */
const ClientesPrincipales = () => {
  // Logos de clientes principales
  const clientes = [
    {
      id: 1,
      nombre: 'Alma',
      logo: '/img/alma.png',
    },
    {
      id: 2,
      nombre: 'Cope',
      logo: '/img/cope.png',
    },
    {
      id: 3,
      nombre: 'Hillvilla',
      logo: '/img/hillvilla.png',
    },
    {
      id: 4,
      nombre: 'Xsur',
      logo: '/img/xsur.png',
    },
    {
      id: 5,
      nombre: 'Jotrisa',
      logo: '/img/jotrisa.png',
    },
    {
      id: 6,
      nombre: 'San Andrés',
      logo: '/img/san-andres.png',
    },
    {
      id: 7,
      nombre: 'Rino',
      logo: '/img/rino.png',
    },
  ]

  return (
    <section className="py-16 md:py-24 bg-asli-dark">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
            NUESTROS PRINCIPALES CLIENTES
          </h2>
          <p className="text-xl text-white/90">
            Colaboramos con las mejores empresas del sector
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 lg:gap-8 max-w-5xl mx-auto">
          {clientes.map((cliente) => (
            <div
              key={cliente.id}
              className="bg-white/5 rounded-lg p-6 flex items-center justify-center hover:bg-white/10 transition-all duration-200"
            >
              <img
                src={cliente.logo}
                alt={cliente.nombre}
                className="max-w-full h-16 object-contain"
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

export default ClientesPrincipales

