export default function Loading() {
  return (
    <div className="flex items-center justify-center min-h-screen" style={{ backgroundColor: '#0a1628' }}>
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
        <p className="text-white font-fira" style={{ fontFamily: 'Fira Sans, sans-serif', fontStyle: 'italic', fontWeight: 'bold' }}>
          Cargando facturas...
        </p>
      </div>
    </div>
  );
}

