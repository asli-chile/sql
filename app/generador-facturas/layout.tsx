import { ReactNode } from 'react';

// El layout raíz ya incluye todos los providers necesarios
// Este layout solo sirve para agrupar el generador de forma independiente
export default function GeneradorFacturasLayout({
  children,
}: {
  children: ReactNode;
}) {
  return <>{children}</>;
}
