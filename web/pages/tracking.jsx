import Head from 'next/head'
import Header from '../src/components/Header'
import Footer from '../src/components/Footer'
import Tracking from '../src/components/Tracking'

const TrackingPage = () => {
  return (
    <>
      <Head>
        <title>Tracking de Cargas - ASLI - Asesorías y Servicios Logísticos Integrales</title>
        <meta
          name="description"
          content="Consulta el estado de tus cargas en tiempo real. Accede al seguimiento oficial de tu carga directamente con la naviera."
        />
        <link
          rel="icon"
          type="image/png"
          href="/img/logoblanco.png"
        />
        <link
          rel="apple-touch-icon"
          href="/img/logoblanco.png"
        />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </Head>
      <div className="min-h-screen flex flex-col bg-asli-dark">
        <Header />
        <main className="flex-grow">
          {/* Hero Section */}
          <section className="py-20 md:py-32 bg-asli-dark">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8">
              <div className="text-center max-w-4xl mx-auto">
                <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6">
                  TRACKING DE CARGAS
                </h1>
                <p className="text-xl md:text-2xl text-white/90 leading-relaxed">
                  Consulta el estado de tus cargas en tiempo real
                </p>
              </div>
            </div>
          </section>

          {/* Tracking Section */}
          <Tracking />

          {/* CTA Section */}
          <section className="py-16 md:py-24 bg-asli-secondary/30">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8">
              <div className="max-w-3xl mx-auto text-center">
                <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
                  ¿Necesitas ayuda con el seguimiento de tu carga?
                </h2>
                <p className="text-xl text-white/90 mb-8">
                  Contáctanos y te ayudaremos con cualquier consulta sobre el estado de tu envío
                </p>
                <a
                  href="https://mail.google.com/mail/?view=cm&to=informaciones@asli.cl&su=Consulta sobre tracking"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block bg-asli-primary text-white px-8 py-4 rounded-md hover:bg-opacity-90 transition-all duration-200 text-lg font-semibold"
                >
                  CONTACTAR
                </a>
              </div>
            </div>
          </section>
        </main>
        <Footer />
      </div>
    </>
  )
}

export default TrackingPage
