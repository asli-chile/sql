import { useState } from 'react'

/**
 * Sección: Tracking de cargas
 * Fondo #003F5A, UI para consulta de seguimiento
 */
const Tracking = () => {
  const [naviera, setNaviera] = useState('')

  const navieras = [
    { value: '', label: 'Seleccione una naviera' },
    { value: 'msc', label: 'MSC', url: 'https://www.msc.com/es/track-a-shipment' },
    { value: 'maersk', label: 'Maersk', url: 'https://www.maersk.com/tracking/' },
    { value: 'pil', label: 'PIL', url: 'https://www.pilship.com/digital-solutions/?tab=customer&id=track-trace&label=containerTandT&module=TrackTraceBL&refNo=' },
    { value: 'oocl', label: 'OOCL', url: 'https://www.oocl.com/eng/ourservices/eservices/cargotracking/Pages/cargotracking.aspx' },
    { value: 'cma', label: 'CMA CGM', url: 'https://www.cma-cgm.com/' },
    { value: 'evergreen', label: 'Evergreen', url: 'https://ct.shipmentlink.com/servlet/TDB1_CargoTracking.do' },
    { value: 'wanhai', label: 'Wan Hai', url: 'https://www.wanhai.com/views/cargo_track_v2/tracking_query.xhtml?file_num=65580&parent_id=64738&top_file_num=64735' },
    { value: 'one', label: 'ONE', url: 'https://ecomm.one-line.com/one-ecom/manage-shipment/cargo-tracking' },
    { value: 'hapag-lloyd', label: 'Hapag-Lloyd', url: 'https://www.hapag-lloyd.com/en/online-business/track/track-by-booking-solution.html' },
    { value: 'cosco', label: 'COSCO', url: 'https://elines.coscoshipping.com/ebusiness/cargoTracking/' },
    { value: 'yangming', label: 'Yang Ming', url: 'https://www.yangming.com/en/esolution/tracking/cargo_tracking' },
    { value: 'otra', label: 'Otra naviera' },
  ]

  const handleSubmit = (event) => {
    event.preventDefault()

    if (!naviera || naviera === '' || naviera === 'otra') {
      alert('Por favor, seleccione una naviera de la lista para acceder al tracking.')
      return
    }

    // Buscar la naviera seleccionada
    const navieraSeleccionada = navieras.find((nav) => nav.value === naviera)

    if (navieraSeleccionada && navieraSeleccionada.url) {
      // Abrir la página de tracking de la naviera en una nueva pestaña
      window.open(navieraSeleccionada.url, '_blank', 'noopener,noreferrer')
    } else {
      alert('Por favor, seleccione una naviera de la lista para acceder al tracking.')
    }
  }

  return (
    <section className="py-16 md:py-24 bg-asli-dark">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Tracking de cargas
            </h2>
            <p className="text-lg text-gray-200 max-w-2xl mx-auto">
              Ingresa los datos de tu carga y serás redirigido a la página oficial de tracking de la naviera seleccionada
            </p>
          </div>

          <form
            onSubmit={handleSubmit}
            className="bg-white rounded-lg shadow-xl p-6 md:p-8"
          >
            <div className="space-y-6">
              <div>
                <label
                  htmlFor="naviera"
                  className="block text-sm font-semibold text-gray-700 mb-2"
                >
                  Naviera
                </label>
                <select
                  id="naviera"
                  value={naviera}
                  onChange={(e) => setNaviera(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-asli-primary focus:border-transparent text-gray-900 bg-white"
                  required
                >
                  {navieras.map((nav) => (
                    <option key={nav.value} value={nav.value} className="text-gray-900">
                      {nav.label}
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="submit"
                className="w-full bg-asli-accent text-white px-6 py-3 rounded-md text-lg font-semibold hover:bg-opacity-90 transition-all duration-200 shadow-md hover:shadow-lg"
              >
                Ir a tracking de la naviera
              </button>
            </div>
          </form>
        </div>
      </div>
    </section>
  )
}

export default Tracking

