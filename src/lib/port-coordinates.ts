/**
 * Coordenadas de puertos comunes (puertos de contenedores reales)
 * Formato: { nombre: [longitude, latitude] }
 */
export const PORT_COORDINATES: Record<string, [number, number]> = {
  // Puertos de Chile
  'VALPARAISO': [-71.6297, -33.0472],
  'VAP': [-71.6297, -33.0472],
  'SAN ANTONIO': [-71.6178, -33.5944],
  'SAI': [-71.6178, -33.5944],
  'LIRQUEN': [-72.9767, -36.7083],
  'CORONEL': [-73.1517, -37.0167],
  'TALCAHUANO': [-73.1167, -36.7167],
  'QUINTERO': [-71.5333, -32.7833],
  'IQUIQUE': [-70.1531, -20.2208],
  'ANTOFAGASTA': [-70.4025, -23.6500],
  'ARICA': [-70.3197, -18.4783],
  'COQUIMBO': [-71.3425, -29.9528],
  
  // El Salvador
  'ACAJUTLA': [-89.8272, 13.5922],
  'PUERTO CALDERA': [-89.8272, 13.5922],
  'CALDERA': [-89.8272, 13.5922],
  
  // España
  'ALGECIRAS': [-5.4565, 36.1269],
  'BARCELONA': [2.1734, 41.3851],
  'VALENCIA': [-0.3774, 39.4699],
  'SINES': [-8.8688, 37.9562],
  'VIGO': [-8.7266, 42.2406],
  'TENERIFE': [-16.2518, 28.4636],
  'MARIN': [-8.7266, 42.2406],
  
  // Turquía
  'AMBARLI': [28.7767, 40.9756],
  'AMBARLI PORT ISTANBUL': [28.7767, 40.9756],
  'IZMIR': [27.1428, 38.4237],
  'IZMIT KORFEZI': [29.7333, 40.7667],
  'GEBZE': [29.4306, 40.8028],
  'MERSIN': [34.6415, 36.8004],
  
  // Panamá
  'BALBOA': [-79.5667, 8.9667],
  'PUERTO LIMON': [-79.5667, 8.9667],
  'MANZANILLO - PANAMÁ': [-79.5667, 8.9667],
  'MANZANILLO - PANAMA': [-79.5667, 8.9667],
  
  // Colombia
  'BARRANQUILLAS': [-74.7811, 10.9639],
  'BARRANQUILLA': [-74.7811, 10.9639],
  'BUENAVENTURA': [-77.0197, 3.8801],
  'CARTAGENA': [-75.5144, 10.3910],
  'CAUCEDO': [-69.9000, 18.5000], // República Dominicana
  'SALVADOR, BAHIA': [-38.5108, -12.9714], // Brasil
  'SALVADOR BAHIA': [-38.5108, -12.9714], // Brasil (sin coma)
  'SALVADOR DE BAHIA': [-38.5108, -12.9714], // Brasil (con "DE")
  'SALVADOR-BAHIA': [-38.5108, -12.9714], // Brasil (con guión)
  'SALVADOR DE BAHÍA': [-38.5108, -12.9714], // Brasil (con acento)
  'SALVADOR, BAHÍA': [-38.5108, -12.9714], // Brasil (con acento y coma)
  
  // China
  'CHENGDU': [104.0668, 30.5728],
  'GUANGZHOU': [113.2644, 23.1291],
  'NANSHA': [113.5800, 22.7600],
  'NANSHA NEW PORT': [113.5800, 22.7600],
  'SHANGHAI': [121.5000, 31.2000],
  'SHENZHEN': [114.2200, 22.4800],
  'HEFEI': [117.2838, 31.8612],
  'NINGBO': [121.8300, 29.9500],
  'QINGDAO': [120.3000, 36.0500],
  'TIANJIN': [117.8000, 38.9800],
  'XINGANG': [117.8000, 38.9800],
  'YANTIAN': [114.2200, 22.4800],
  'SHEKOU': [113.8800, 22.4800],
  'CHIWAN': [113.8800, 22.4800],
  'ZHOUSHAN': [121.8300, 29.9500],
  'YANGSHAN': [121.5000, 31.2000],
  
  // Nicaragua
  'CORINTO': [-87.1833, 12.4833],
  'PUERTO CORTES': [-87.9567, 15.8400], // Honduras
  
  // Irlanda
  'DUBLIN': [-6.2603, 53.3498],
  
  // Francia
  'FOS SUR MER': [5.1833, 43.4333],
  
  // Canadá
  'HALTON HILLS': [-79.9333, 43.6333],
  'TORONTO': [-79.3832, 43.6532],
  'AUBURN': [-79.8500, 43.9000],
  'CADILLAC': [-85.4000, 44.2500],
  'CALUMET CITY': [-87.5295, 41.6156],
  'CORNWALL': [-74.7264, 45.0181],
  'GREENFIELD': [-79.7667, 43.9000],
  'HART': [-79.7667, 43.9000],
  'LAKE WALES': [-81.5869, 27.9014],
  'MANAWA': [-88.9198, 44.4642],
  'RANCHO DOMINGUEZ': [-118.2167, 33.8667],
  'STANFORD-LE-HOPE': [0.4225, 51.5139], // UK
  'MONTREAL': [-73.5673, 45.5017],
  
  // Qatar
  'HAMAD': [51.5342, 25.2614],
  'DOHA': [51.5342, 25.2614],
  
  // Alemania
  'HAMBURGO': [9.9937, 53.5511],
  'HAMBURG': [9.9937, 53.5511],
  'BREMERHAVEN': [8.5783, 53.5439],
  
  // Suecia
  'HELSINGBORG': [12.6958, 56.0467],
  'ESKILSTUNA': [16.5144, 59.3711],
  
  // Finlandia
  'HELSINKI': [24.9384, 60.1699],
  
  // Costa Rica
  'HEREDIA': [-84.1167, 9.9985],
  'PUERTO MOIN': [-83.2667, 10.0167],
  'PUERTO QUETZAL': [-90.7333, 13.9333], // Guatemala
  'CARTAGO': [-83.9167, 9.8500],
  'SAN SALVADOR': [-89.2181, 13.6929], // El Salvador
  
  // Hong Kong
  'HONG KONG': [114.1694, 22.3193],
  
  // UAE
  'JEBEL ALI': [55.0273, 25.0262],
  'SHUWAIKH': [47.9731, 29.3375],
  
  // Arabia Saudita
  'JEDDAH': [39.1825, 21.4858],
  'KING ABDULLAH': [39.1667, 21.4833],
  'KING ABDULLAH PORT': [39.1667, 21.4833],
  
  // Taiwán
  'KEELUNG': [121.7478, 25.1276],
  'TAIPEI': [121.5654, 25.0330],
  'KAOHSIUNG': [120.3016, 22.6273],
  
  // Venezuela
  'LA GUAIRA': [-66.9344, 10.6011],
  'PUERTO CABELLO': [-68.0122, 10.4731],
  
  // Portugal
  'LISBOA': [-9.1393, 38.7223],
  'LISBON': [-9.1393, 38.7223],
  
  // Italia
  'LIVORNO': [10.3157, 43.5500],
  'CIVITAVECCHIA': [11.7967, 42.0911],
  'GENOA VADO LIGURE': [8.9463, 44.4056],
  'SALERNO': [14.7673, 40.6824],
  'LEGHORN': [10.3157, 43.5500],
  
  // USA - Costa Este
  'PHILADELPHIA': [-75.1652, 39.9526], // Puerto de Philadelphia (Delaware River)
  'NEW YORK': [-74.0060, 40.7128],
  'NEWARK': [-74.1724, 40.7357],
  'CHARLESTON': [-79.9348, 32.7765],
  'CHARLESTON NORTH': [-79.9348, 32.7765],
  'NORFOLK': [-76.2852, 36.8468],
  'SAVANNAH': [-81.0998, 32.0809],
  'PORT EVERGLADES': [-80.1373, 26.0967],
  'PORT HUENEME': [-119.2079, 34.1478],
  'SAN JUAN': [-66.1057, 18.4655], // Puerto Rico
  
  // USA - Costa Oeste
  'LOS ANGELES': [-118.2437, 34.0522],
  'LONG BEACH': [-118.1937, 33.7701],
  
  // USA - Interior
  'CHICAGO': [-87.6298, 41.8781],
  'HOUSTON': [-95.3698, 29.7604],
  'MEMPHIS': [-90.0490, 35.1495],
  
  // Holanda
  'ROTTERDAM': [4.4777, 51.9225],
  'MAASVLAKTE': [4.0300, 51.9500],
  'VLISSINGEN': [3.5736, 51.4428],
  'WILLEMSTAD': [-68.9384, 12.1026], // Curaçao
  
  // Brasil
  'SANTOS': [-46.3273, -23.9608],
  'SUAPE': [-34.9333, -8.4000],
  
  // Honduras
  'SAN PEDRO SULA': [-88.0333, 15.5000],
  'TEGUCIGALPA': [-87.2167, 14.1000],
  
  // Guatemala
  'GUATEMALA CITY': [-90.5132, 14.6349],
  'EL TEJAR': [-90.7833, 14.6500],
  
  // Bélgica
  'ANTWERP': [4.4028, 51.2194],
  
  // Jordania
  'AQABA': [35.0074, 29.5320],
  
  // Australia
  'ADELAIDE': [138.6007, -34.9285],
  'BRISBANE': [153.0251, -27.4698],
  'FREMANTLE': [115.7500, -32.0500],
  'MELBOURNE': [144.9631, -37.8136],
  'SYDNEY': [151.2093, -33.8688],
  
  // Libia
  'AL KHOMS': [14.2617, 32.6519],
  'MISURATAH': [15.0927, 32.3754],
  
  // Tailandia
  'BANGKOK': [100.5018, 13.7563],
  'LAEM CHABANG': [100.8833, 13.0833],
  
  // Nueva Zelanda
  'AUCKLAND METROPORT': [174.7633, -36.8485],
  'LYTTELTON': [172.7250, -43.6017],
  'NAPIER': [176.9086, -39.4928],
  'TAURANGA': [176.1652, -37.6878],
  
  // Polonia
  'GDANSK': [18.6464, 54.3520],
  
  // Grecia
  'PIRAEUS': [23.6467, 37.9420],
  'THESSALONIKI': [22.9444, 40.6401],
  
  // Reino Unido
  'FELIXSTOWE': [1.3139, 51.9607],
  'SOUTHAMPTON': [-1.4043, 50.9097],
  'LONDON GATEWAY': [0.4225, 51.5139],
  
  // Japón
  'KOBE': [135.1833, 34.6903],
  'NAGOYA': [136.9066, 35.1815],
  'YOKOHAMA': [139.6389, 35.4437],
  'HAKATA': [130.4181, 33.5904],
  
  // Vietnam
  'HO CHI MINH CITY': [106.6297, 10.8231],
  
  // Indonesia
  'JAKARTA': [106.8451, -6.2088],
  
  // Malasia
  'PORT KLANG': [101.3972, 3.0000],
  
  // Egipto - Comentado temporalmente (no es un destino común)
  // 'PORT SAID WEST': [32.2847, 31.2653],
  
  // Omán
  'SOHAR': [56.7439, 24.3644],
  
  // Líbano
  'BEIRUT': [35.5018, 33.8938],
  'LEBANON': [35.8623, 33.8547],
  
  // Túnez
  'SFAX': [10.7600, 34.7400],
  
  // Chipre
  'LIMASSOL': [33.0222, 34.6750],
  
  // Noruega
  'KRISTIANSAND': [8.0186, 58.1474],
  'OSLO': [10.7522, 59.9139],
  
  // Letonia
  'RIGA': [24.1052, 56.9496],
  
  // Estonia
  'TALLINN': [24.7536, 59.4370],
  
  // Sudáfrica
  'CAPE TOWN': [18.4241, -33.9249],
  
  // Perú
  'CALLAO': [-77.1189, -12.0566],
  'PISCO': [-76.2167, -13.7167],
  'PAITA': [-81.1000, -5.0833],
  
  // Panamá - Puertos adicionales
  'RODMAN': [-79.5667, 8.9667], // Cerca de Balboa
  'CRISTOBAL': [-79.9167, 9.3500],
  'CRISTÓBAL': [-79.9167, 9.3500],
  'COLON': [-79.9000, 9.3500],
  'COLÓN': [-79.9000, 9.3500],
  'COLON FREE ZONE': [-79.9000, 9.3500],
  'COLÓN FREE ZONE': [-79.9000, 9.3500],
  
  // Ecuador
  'GUAYAQUIL': [-79.9203, -2.1709],
  'GUAYAQUIL-POSORJA': [-80.0833, -2.7833],
  
  // México
  'MANZANILLO - MÉXICO': [-104.3156, 19.0519],
  'MANZANILLO - MEXICO': [-104.3156, 19.0519],
  'MANZANILLO-MEXICO': [-104.3156, 19.0519],
  'MANZANILLO-MÉXICO': [-104.3156, 19.0519],
  'MANZANILLO MEXICO': [-104.3156, 19.0519],
  'MANZANILLO MÉXICO': [-104.3156, 19.0519],
  'MANZANILLO': [-104.3156, 19.0519], // Por defecto es México (Manzanillo Panamá tiene la especificación completa)
  'LAZARO CARDENAS': [-102.1956, 17.9561],
  
  // Corea
  'BUSAN': [129.0756, 35.1796],
  
  // Singapur
  'SINGAPORE': [103.8198, 1.2897],
  
  // Variantes y códigos
  'SHANGHAI, CHINA': [121.5000, 31.2000],
  'SHANGHAI CN': [121.5000, 31.2000],
  'CNSHA': [121.5000, 31.2000],
  'SHENZHEN, CHINA': [114.2200, 22.4800],
  'SHENZHEN CN': [114.2200, 22.4800],
  'CNSZN': [114.2200, 22.4800],
  'NINGBO, CHINA': [121.8300, 29.9500],
  'NINGBO CN': [121.8300, 29.9500],
  'CNNGB': [121.8300, 29.9500],
  'QINGDAO, CHINA': [120.3000, 36.0500],
  'QINGDAO CN': [120.3000, 36.0500],
  'CNQIN': [120.3000, 36.0500],
  'TIANJIN, CHINA': [117.8000, 38.9800],
  'TIANJIN CN': [117.8000, 38.9800],
  'CNTXG': [117.8000, 38.9800],
  'XINGANG TIANJIN': [117.8000, 38.9800],
  'TIANJIN XINGANG': [117.8000, 38.9800],
  
  // Argentina
  'BUENOS AIRES': [-58.3816, -34.6037],
  'ROSARIO': [-60.6393, -32.9442],
  'BAHIA BLANCA': [-62.2654, -38.7183],
  'NECOCHEA': [-58.7397, -38.5545],
  'MAR DEL PLATA': [-57.5425, -38.0055],
  'QUEQUEN': [-58.7397, -38.5545],
  
  // Brasil - Puertos adicionales
  'RIO DE JANEIRO': [-43.1729, -22.9068],
  'RIO': [-43.1729, -22.9068],
  'PARANAGUA': [-48.5050, -25.5200],
  'PARANAGUÁ': [-48.5050, -25.5200],
  'ITAJAI': [-48.6614, -26.9103],
  'ITAJÁI': [-48.6614, -26.9103],
  'ITAPOA': [-48.6614, -26.9103],
  'ITAPOÁ': [-48.6614, -26.9103],
  'PECEM': [-38.3000, -3.7000],
  'PECÉM': [-38.3000, -3.7000],
  'VITORIA': [-40.3081, -20.3155],
  'VITÓRIA': [-40.3081, -20.3155],
  'NITEROI': [-43.1031, -22.8833],
  'NITERÓI': [-43.1031, -22.8833],
  'PORTO ALEGRE': [-51.2308, -30.0346],
  'SAO FRANCISCO DO SUL': [-48.6381, -26.2431],
  'SÃO FRANCISCO DO SUL': [-48.6381, -26.2431],
  'IMBITUBA': [-48.6667, -28.2333],
  'RIO GRANDE': [-52.1078, -32.0350],
  
  // México - Puertos adicionales
  'VERACRUZ': [-96.1340, 19.1738],
  'ALTAMIRA': [-97.9167, 22.3833],
  'ENSENADA': [-116.6167, 31.8667],
  'TAMPICO': [-97.8667, 22.2667],
  'PROGRESO': [-89.6667, 21.2833],
  'COATZACOALCOS': [-94.4167, 18.1500],
  'SALINA CRUZ': [-95.2000, 16.1667],
  'MAZATLAN': [-106.4167, 23.2500],
  'MAZATLÁN': [-106.4167, 23.2500],
  'TOPOLOBAMPO': [-109.0500, 25.6000],
  'GUAYMAS': [-110.9000, 27.9167],
  
  // USA - Puertos adicionales
  'MIAMI': [-80.1918, 25.7617],
  'BALTIMORE': [-76.6122, 39.2904],
  'BOSTON': [-71.0589, 42.3601],
  'JACKSONVILLE': [-81.6557, 30.3322],
  'MOBILE': [-88.0431, 30.6944],
  'NEW ORLEANS': [-90.0715, 29.9511],
  'GALVESTON': [-94.7974, 29.3013],
  'BEAUMONT': [-94.1016, 30.0802],
  'PORT ARTHUR': [-93.9297, 29.8849],
  'TACOMA': [-122.4443, 47.2529],
  'SEATTLE': [-122.3321, 47.6062],
  'OAKLAND': [-122.2711, 37.8044],
  'SAN FRANCISCO': [-122.4194, 37.7749],
  'SAN DIEGO': [-117.1611, 32.7157],
  'PORTLAND': [-122.6765, 45.5152],
  'WILMINGTON': [-77.9447, 34.2257], // North Carolina
  'MORELHEAD CITY': [-76.7167, 34.7167],
  'BROWNSVILLE': [-97.4975, 25.9018],
  'CORPUS CHRISTI': [-97.3964, 27.8006],
  
  // Canadá - Puertos adicionales
  'VANCOUVER': [-123.1216, 49.2827],
  'PRINCE RUPERT': [-130.3208, 54.3151],
  'HALIFAX': [-63.5752, 44.6488],
  'MONTREAL': [-73.5673, 45.5017],
  'QUEBEC': [-71.2072, 46.8139],
  'HAMILTON': [-79.8669, 43.2557],
  'THUNDER BAY': [-89.2477, 48.3809],
  'SAINT JOHN': [-66.0633, 45.2733], // New Brunswick
  
  // República Dominicana
  'SANTO DOMINGO': [-69.9312, 18.4861],
  'RIO HAINA': [-70.0000, 18.4167],
  'RIO HAÍNA': [-70.0000, 18.4167],
  'PUERTO PLATA': [-70.6947, 19.7933],
  
  // Jamaica
  'KINGSTON': [-76.7936, 18.0179],
  
  // Trinidad y Tobago
  'PORT OF SPAIN': [-61.5189, 10.6549],
  
  // Bahamas
  'NASSAU': [-77.3431, 25.0479],
  'FREEPORT': [-78.6958, 26.5333],
  
  // Cuba
  'HAVANA': [-82.3666, 23.1136],
  'LA HABANA': [-82.3666, 23.1136],
  'SANTIAGO DE CUBA': [-75.8153, 20.0247],
  
  // Costa Rica - Puertos adicionales
  'PUERTO LIMON': [-83.0333, 10.0000], // Costa Rica (diferente de Panamá)
  'PUERTO LIMÓN': [-83.0333, 10.0000],
  
  // Nicaragua - Puertos adicionales
  'PUERTO SANDINO': [-86.3500, 12.1833],
  'BLUEFIELDS': [-83.7667, 12.0167],
  
  // Belice
  'BELIZE CITY': [-88.1962, 17.5046],
  
  // Uruguay
  'MONTEVIDEO': [-56.1645, -34.9011],
  'NUEVA PALMIRA': [-58.0833, -33.8833],
  
  // Paraguay
  'ASUNCION': [-57.5759, -25.2637],
  'ASUNCIÓN': [-57.5759, -25.2637],
  
  // Bolivia
  'LA PAZ': [-68.1193, -16.5000],
  'SANTA CRUZ': [-63.1812, -17.8146],
  
  // Otros
  'PRUEBA': null as any, // Puerto de prueba (no coordenadas)
  'ZAMBRANO': [-63.6167, -38.4161], // Argentina (usar coordenadas de Buenos Aires como referencia)
};

/**
 * Obtiene las coordenadas de un puerto por su nombre
 * @param portName - Nombre del puerto (puede estar en mayúsculas o minúsculas)
 * @returns Coordenadas [longitude, latitude] o null si no se encuentra
 */
// Función auxiliar para normalizar texto (remover acentos)
function normalizeText(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .trim();
}

const IS_DEV = process.env.NODE_ENV !== 'production';

export function getPortCoordinates(portName: string): [number, number] | null {
  if (!portName) return null;
  
  // Normalizar el nombre del puerto (mayúsculas, sin espacios extra, sin acentos)
  let normalized = portName.trim().toUpperCase();
  // Remover acentos y caracteres especiales comunes
  normalized = normalized
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[.,;:]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  
  // Buscar coincidencia exacta (con y sin acentos)
  if (PORT_COORDINATES[normalized] && PORT_COORDINATES[normalized] !== null) {
    return PORT_COORDINATES[normalized] as [number, number];
  }
  
  // Buscar también con la clave original (puede tener acentos)
  const normalizedOriginal = portName.trim().toUpperCase()
    .replace(/[.,;:]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  if (PORT_COORDINATES[normalizedOriginal] && PORT_COORDINATES[normalizedOriginal] !== null) {
    return PORT_COORDINATES[normalizedOriginal] as [number, number];
  }
  
  // Buscar coincidencia parcial (por si el puerto tiene formato "PUERTO - PAIS" o "PUERTO, PAIS")
  // Primero intentar con el nombre completo
  // Priorizar búsquedas específicas antes de genéricas
  const sortedKeys = Object.keys(PORT_COORDINATES).sort((a, b) => {
    // Priorizar claves más específicas (más largas) primero
    if (a.includes(' - ') && !b.includes(' - ')) return -1;
    if (!a.includes(' - ') && b.includes(' - ')) return 1;
    return b.length - a.length;
  });
  
  for (const key of sortedKeys) {
    const coords = PORT_COORDINATES[key];
    if (coords === null) continue;
    
    // Normalizar la clave para comparar
    const keyNormalized = normalizeText(key);
    
    // Buscar si el nombre normalizado contiene la clave o viceversa
    if (normalized.includes(keyNormalized) || keyNormalized.includes(normalized)) {
      return coords as [number, number];
    }
    
    // También comparar con la clave original (con acentos)
    if (normalizedOriginal.includes(key) || key.includes(normalizedOriginal)) {
      return coords as [number, number];
    }
    
    // Buscar también sin espacios y sin guiones
    const normalizedNoSpaces = normalized.replace(/[\s-]+/g, '');
    const keyNoSpaces = keyNormalized.replace(/[\s-]+/g, '');
    if (normalizedNoSpaces.includes(keyNoSpaces) || keyNoSpaces.includes(normalizedNoSpaces)) {
      return coords as [number, number];
    }
    
    // Si el puerto contiene "MANZANILLO" y no contiene "PANAMA" o "PANAMÁ", es México
    const normalizedNoAccents = normalizeText(portName);
    if (normalizedNoAccents.includes('MANZANILLO') && !normalizedNoAccents.includes('PANAMA')) {
      const keyNoAccents = normalizeText(key);
      if (keyNoAccents.includes('MANZANILLO') && (keyNoAccents.includes('MEXICO') || key === 'MANZANILLO')) {
        return coords as [number, number];
      }
    }
    
    // Si el puerto contiene "SALVADOR" y "BAHIA" o "BAHÍA", es Salvador de Bahía, Brasil
    if (normalizedNoAccents.includes('SALVADOR') && (normalizedNoAccents.includes('BAHIA') || normalizedNoAccents.includes('BAHÍA'))) {
      const keyNoAccents = normalizeText(key);
      if (keyNoAccents.includes('SALVADOR') && (keyNoAccents.includes('BAHIA') || keyNoAccents.includes('BAHÍA'))) {
        return coords as [number, number];
      }
    }
  }
  
  // Si no se encuentra, intentar buscar por palabras clave comunes (solo variantes que no están en PORT_COORDINATES)
  const keywords: Record<string, [number, number]> = {
    // Estas claves ya están en PORT_COORDINATES, pero se mantienen aquí como fallback para búsquedas parciales
    // No hay duplicados reales porque este es un objeto diferente dentro de la función
  };
  
  for (const [keyword, coords] of Object.entries(keywords)) {
    if (normalized.includes(keyword)) {
      return coords;
    }
  }
  
  // Si no se encuentra, devolver null para que el componente pueda manejarlo
  return null;
}

/**
 * Obtiene coordenadas para múltiples puertos
 */
export function getMultiplePortCoordinates(portNames: string[]): Record<string, [number, number]> {
  const result: Record<string, [number, number]> = {};
  
  portNames.forEach(port => {
    const coords = getPortCoordinates(port);
    if (coords) {
      result[port] = coords;
    }
  });
  
  return result;
}
