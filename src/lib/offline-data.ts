// Modo offline temporal para la aplicación
export const offlineMode = {
  registros: [
    {
      id: 'offline-1',
      ref_asli: 'A0001',
      ejecutivo: 'Ejecutivo Demo',
      shipper: 'Cliente Demo',
      naviera: 'Naviera Demo',
      nave_inicial: 'Nave Demo',
      especie: 'Especie Demo',
      estado: 'PENDIENTE',
      tipo_ingreso: 'NORMAL',
      pol: 'POL Demo',
      pod: 'POD Demo',
      deposito: 'Depósito Demo',
      flete: 'PREPAID',
      comentario: 'Registro de demostración',
      ingresado: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
  ],
  catalogos: [
    {
      categoria: 'ejecutivos',
      valores: ['Ejecutivo Demo', 'Ejecutivo 2', 'Ejecutivo 3']
    },
    {
      categoria: 'clientes',
      valores: ['Cliente Demo', 'Cliente 2', 'Cliente 3']
    },
    {
      categoria: 'navieras',
      valores: ['Naviera Demo', 'Naviera 2', 'Naviera 3']
    },
    {
      categoria: 'especies',
      valores: ['Especie Demo', 'Especie 2', 'Especie 3']
    },
    {
      categoria: 'pols',
      valores: ['POL Demo', 'POL 2', 'POL 3']
    },
    {
      categoria: 'destinos',
      valores: ['POD Demo', 'POD 2', 'POD 3']
    },
    {
      categoria: 'depositos',
      valores: ['Depósito Demo', 'Depósito 2', 'Depósito 3']
    },
    {
      categoria: 'naves',
      valores: ['Nave Demo', 'Nave 2', 'Nave 3']
    }
  ]
};
