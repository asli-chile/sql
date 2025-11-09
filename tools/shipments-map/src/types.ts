export interface ShipmentRecord {
  pol?: string | null;
  pod?: string | null;
  deposito?: string | null;
  estado?: 'PENDIENTE' | 'CONFIRMADO' | 'CANCELADO' | string | null;
  etd?: string | Date | null;
  eta?: string | Date | null;
}

export type Coordinates = [number, number];

export type PortCoordinateResolver = (portName: string) => Coordinates | null | undefined;
export type CountryFromPortResolver = (portName: string) => string | null | undefined;
export type CountryCoordinateResolver = (countryName: string) => Coordinates | null | undefined;

