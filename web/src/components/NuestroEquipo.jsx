/**
 * Sección: NUESTRO EQUIPO
 * Grid con fotos y nombres del equipo
 */
const NuestroEquipo = () => {
  // Estructura del equipo - Orden de 3 en 3
  const nivelSuperior = [
    {
      nombre: 'Mario Basaez',
      cargo: 'Fundador y Gerente General',
      imagen: 'https://asli.cl/img/mariobasaez.png',
    },
    {
      nombre: 'Hans Vasquez',
      cargo: 'Subgerente de Operaciones',
      imagen: 'https://asli.cl/img/hansv.png',
    },
    {
      nombre: 'Poliana Cisterna',
      cargo: 'Subgerente Comercial',
      imagen: 'https://asli.cl/img/poli.jpg',
    },
  ]

  const nivelMedio = [
    {
      nombre: 'Rocio Villareal',
      cargo: 'Subgerente de Seguridad Alimentaria',
      imagen: 'https://asli.cl/img/rocio.png',
    },
    {
      nombre: 'Ricardo Lazo',
      cargo: 'Subgerente Comercio Exterior',
      imagen: 'https://asli.cl/img/ricardolazo.png',
    },
    {
      nombre: 'Nina Scotti',
      cargo: 'Ejecutiva Comercial e Importaciones',
      imagen: 'https://asli.cl/img/nina.png',
    },
  ]

  const nivelInferior = [
    {
      nombre: 'Alex Cárdenas',
      cargo: 'Coordinador de Transportes',
      imagen: 'https://asli.cl/img/alex.png',
    },
    {
      nombre: 'Stefania Cordova',
      cargo: 'Subgerente de Administración y Finanzas',
      imagen: 'https://asli.cl/img/stefanie.png',
    },
    {
      nombre: 'Rodrigo Cáceres',
      cargo: 'Customer Services',
      imagen: 'https://asli.cl/img/rodrigo.png',
    },
  ]

  const MiembroCard = ({ miembro }) => (
    <div className="text-center group">
      <div className="mb-4 relative inline-block">
        <img
          src={miembro.imagen}
          alt={miembro.nombre}
          className="w-32 h-32 rounded-full mx-auto object-cover border-4 border-asli-primary transition-all duration-300 ease-in-out transform group-hover:scale-110 group-hover:shadow-[0_0_20px_rgba(0,122,123,0.6)] group-hover:shadow-asli-primary"
        />
      </div>
      <h3 className="text-lg font-semibold text-white mb-1">
        {miembro.nombre}
      </h3>
      <p className="text-sm text-gray-300">{miembro.cargo}</p>
    </div>
  )

  return (
    <section id="equipo" className="py-16 md:py-24 bg-asli-dark">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
            NUESTRO EQUIPO
          </h2>
          <p className="text-xl text-white/90">
            Profesionales comprometidos con tu éxito
          </p>
        </div>

        {/* Estructura piramidal */}
        <div className="flex flex-col items-center gap-8 lg:gap-12">
          {/* Nivel Superior - 3 personas */}
          <div className="flex flex-wrap justify-center gap-6 lg:gap-12">
            {nivelSuperior.map((miembro, index) => (
              <MiembroCard key={index} miembro={miembro} />
            ))}
          </div>

          {/* Nivel Medio - 3 personas */}
          <div className="flex flex-wrap justify-center gap-6 lg:gap-8">
            {nivelMedio.map((miembro, index) => (
              <MiembroCard key={index} miembro={miembro} />
            ))}
          </div>

          {/* Nivel Inferior - 3 personas */}
          <div className="flex flex-wrap justify-center gap-6 lg:gap-8">
            {nivelInferior.map((miembro, index) => (
              <MiembroCard key={index} miembro={miembro} />
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

export default NuestroEquipo

