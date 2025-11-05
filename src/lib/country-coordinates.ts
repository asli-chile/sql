/**
 * Coordenadas de países/regiones para el mapa
 * Formato: { país: [longitude, latitude] }
 */
export const COUNTRY_COORDINATES: Record<string, [number, number]> = {
  // Asia
  'CHINA': [104.1954, 35.8617],
  'CN': [104.1954, 35.8617],
  'KOREA': [127.7669, 35.9078],
  'SOUTH KOREA': [127.7669, 35.9078],
  'KR': [127.7669, 35.9078],
  'SINGAPORE': [103.8198, 1.2897],
  'SG': [103.8198, 1.2897],
  'HONG KONG': [114.1694, 22.3193],
  'HK': [114.1694, 22.3193],
  'THAILAND': [100.5018, 13.7563],
  'TH': [100.5018, 13.7563],
  'TAIWAN': [120.9605, 23.6978],
  'TW': [120.9605, 23.6978],
  'JAPAN': [138.2529, 36.2048],
  'JP': [138.2529, 36.2048],
  'VIETNAM': [108.2772, 14.0583],
  'VN': [108.2772, 14.0583],
  'INDONESIA': [113.9213, -0.7893],
  'ID': [113.9213, -0.7893],
  'PHILIPPINES': [121.7740, 12.8797],
  'PH': [121.7740, 12.8797],
  'INDIA': [78.9629, 20.5937],
  'IN': [78.9629, 20.5937],
  'UAE': [53.8478, 23.4241],
  'UNITED ARAB EMIRATES': [53.8478, 23.4241],
  'SAUDI ARABIA': [45.0792, 23.8859],
  'SA': [45.0792, 23.8859],
  'TURKEY': [35.2433, 38.9637],
  'TR': [35.2433, 38.9637],
  'JORDAN': [36.2384, 30.5852],
  'JO': [36.2384, 30.5852],
  'QATAR': [51.1839, 25.3548],
  'QA': [51.1839, 25.3548],
  'LEBANON': [35.8623, 33.8547],
  'LB': [35.8623, 33.8547],
  'LIBYA': [17.2283, 26.3351],
  'LY': [17.2283, 26.3351],
  'TUNISIA': [9.5375, 33.8869],
  'TN': [9.5375, 33.8869],
  'CYPRUS': [33.4299, 35.1264],
  'CY': [33.4299, 35.1264],
  'EGYPT': [30.8025, 26.8206],
  'EG': [30.8025, 26.8206],
  
  // Europa
  'SPAIN': [-3.7038, 40.4168],
  'ES': [-3.7038, 40.4168],
  'NETHERLANDS': [5.2913, 52.1326],
  'NL': [5.2913, 52.1326],
  'GERMANY': [10.4515, 51.1657],
  'DE': [10.4515, 51.1657],
  'BELGIUM': [4.4699, 50.5039],
  'BE': [4.4699, 50.5039],
  'ITALY': [12.5674, 41.8719],
  'IT': [12.5674, 41.8719],
  'FRANCE': [2.2137, 46.2276],
  'FR': [2.2137, 46.2276],
  'PORTUGAL': [-8.2245, 39.3999],
  'PT': [-8.2245, 39.3999],
  'UNITED KINGDOM': [-3.4360, 55.3781],
  'UK': [-3.4360, 55.3781],
  'GB': [-3.4360, 55.3781],
  'SWEDEN': [18.6435, 60.1282],
  'SE': [18.6435, 60.1282],
  'FINLAND': [25.7482, 61.9241],
  'FI': [25.7482, 61.9241],
  'NORWAY': [8.4689, 60.4720],
  'NO': [8.4689, 60.4720],
  'POLAND': [19.1451, 51.9194],
  'PL': [19.1451, 51.9194],
  'GREECE': [21.8243, 39.0742],
  'GR': [21.8243, 39.0742],
  'IRELAND': [-8.2439, 53.4129],
  'IE': [-8.2439, 53.4129],
  'LATVIA': [24.6032, 56.8796],
  'LV': [24.6032, 56.8796],
  'ESTONIA': [25.0136, 58.5953],
  'EE': [25.0136, 58.5953],
  
  // América del Norte
  'USA': [-95.7129, 37.0902],
  'UNITED STATES': [-95.7129, 37.0902],
  'US': [-95.7129, 37.0902],
  'CANADA': [-106.3468, 56.1304],
  'CA': [-106.3468, 56.1304],
  'MEXICO': [-102.5528, 23.6345],
  'MX': [-102.5528, 23.6345],
  'GUATEMALA': [-90.2308, 15.7835],
  'GT': [-90.2308, 15.7835],
  'HONDURAS': [-86.2419, 15.2000],
  'HN': [-86.2419, 15.2000],
  'EL SALVADOR': [-88.8965, 13.7942],
  'SV': [-88.8965, 13.7942],
  'NICARAGUA': [-85.2072, 12.2650],
  'NI': [-85.2072, 12.2650],
  'COSTA RICA': [-83.7534, 9.7489],
  'CR': [-83.7534, 9.7489],
  'PANAMA': [-80.7821, 8.5380],
  'PA': [-80.7821, 8.5380],
  'COLOMBIA': [-74.2973, 4.5709],
  'CO': [-74.2973, 4.5709],
  
  // América del Sur
  'CHILE': [-71.5429, -35.6751],
  'CL': [-71.5429, -35.6751],
  'ARGENTINA': [-63.6167, -38.4161],
  'AR': [-63.6167, -38.4161],
  'URUGUAY': [-55.7658, -32.5228],
  'UY': [-55.7658, -32.5228],
  'BRAZIL': [-51.9253, -14.2350],
  'BR': [-51.9253, -14.2350],
  'PERU': [-75.0152, -9.1900],
  'PE': [-75.0152, -9.1900],
  'ECUADOR': [-78.1834, -1.8312],
  'EC': [-78.1834, -1.8312],
  'VENEZUELA': [-66.5897, 6.4238],
  'VE': [-66.5897, 6.4238],
  
  // Oceanía
  'AUSTRALIA': [133.7751, -25.2744],
  'AU': [133.7751, -25.2744],
  'NEW ZEALAND': [174.8860, -40.9006],
  'NZ': [174.8860, -40.9006],
  
  // África
  'SOUTH AFRICA': [22.9375, -30.5595],
  'ZA': [22.9375, -30.5595],
};

/**
 * Obtiene el país de un puerto
 */
export function getCountryFromPort(portName: string): string | null {
  if (!portName) return null;
  
  const normalized = portName.trim().toUpperCase();
  
  // Mapeo directo de puertos conocidos a países
  const portToCountry: Record<string, string> = {
    // El Salvador
    'ACAJUTLA': 'EL SALVADOR',
    'PUERTO CALDERA': 'EL SALVADOR',
    'CALDERA': 'EL SALVADOR',
    
    // España
    'ALGECIRAS': 'SPAIN',
    'BARCELONA': 'SPAIN',
    'VALENCIA': 'SPAIN',
    'SINES': 'SPAIN',
    'VIGO': 'SPAIN',
    'TENERIFE': 'SPAIN',
    'MARIN': 'SPAIN',
    
    // Turquía
    'AMBARLI': 'TURKEY',
    'AMBARLI PORT ISTANBUL': 'TURKEY',
    'IZMIR': 'TURKEY',
    'IZMIT KORFEZI': 'TURKEY',
    'GEBZE': 'TURKEY',
    'MERSIN': 'TURKEY',
    
    // Panamá
    'BALBOA': 'PANAMA',
    'PUERTO LIMON': 'PANAMA',
    
    // Colombia
    'BARRANQUILLAS': 'COLOMBIA',
    'BARRANQUILLA': 'COLOMBIA',
    'BUENAVENTURA': 'COLOMBIA',
    'CARTAGENA': 'COLOMBIA',
    
    // China
    'CHENGDU': 'CHINA',
    'GUANGZHOU': 'CHINA',
    'NANSHA': 'CHINA',
    'NANSHA NEW PORT': 'CHINA',
    'SHANGHAI': 'CHINA',
    'SHENZHEN': 'CHINA',
    'HEFEI': 'CHINA',
    
    // Nicaragua
    'CORINTO': 'NICARAGUA',
    'MANAGUA': 'NICARAGUA',
    'MATAGALPA': 'NICARAGUA',
    
    // Irlanda
    'DUBLIN': 'IRELAND',
    
    // Francia
    'FOS SUR MER': 'FRANCE',
    
    // Canadá
    'HALTON HILLS': 'CANADA',
    'TORONTO': 'CANADA',
    'AUBURN': 'CANADA',
    'CADILLAC': 'CANADA',
    'CALUMET CITY': 'CANADA',
    'CORNWALL': 'CANADA',
    'GREENFIELD': 'CANADA',
    'HART': 'CANADA',
    'LAKE WALES': 'CANADA',
    'MANAWA': 'CANADA',
    'RANCHO DOMINGUEZ': 'CANADA',
    'STANFORD-LE-HOPE': 'CANADA',
    
    // Qatar
    'HAMAD': 'QATAR',
    'DOHA': 'QATAR',
    
    // Alemania
    'HAMBURGO': 'GERMANY',
    'HAMBURG': 'GERMANY',
    'BREMERHAVEN': 'GERMANY',
    
    // Suecia
    'HELSINGBORG': 'SWEDEN',
    'ESKILSTUNA': 'SWEDEN',
    
    // Finlandia
    'HELSINKI': 'FINLAND',
    
    // Costa Rica
    'HEREDIA': 'COSTA RICA',
    'PUERTO MOIN': 'COSTA RICA',
    'PUERTO QUETZAL': 'COSTA RICA',
    'CARTAGO': 'COSTA RICA',
    'SAN SALVADOR': 'COSTA RICA',
    
    // Hong Kong
    'HONG KONG': 'HONG KONG',
    
    // UAE
    'JEBEL ALI': 'UAE',
    'SHUWAIKH': 'UAE',
    
    // Arabia Saudita
    'JEDDAH': 'SAUDI ARABIA',
    'KING ABDULLAH': 'SAUDI ARABIA',
    'KING ABDULLAH PORT': 'SAUDI ARABIA',
    
    // Taiwán
    'KEELUNG': 'TAIWAN',
    'TAIPEI': 'TAIWAN',
    'KAOHSIUNG': 'TAIWAN',
    
    // Venezuela
    'LA GUAIRA': 'VENEZUELA',
    'PUERTO CABELLO': 'VENEZUELA',
    
    // Portugal
    'LISBOA': 'PORTUGAL',
    'LISBON': 'PORTUGAL',
    
    // Italia
    'LIVORNO': 'ITALY',
    'CIVITAVECCHIA': 'ITALY',
    'GENOA VADO LIGURE': 'ITALY',
    'SALERNO': 'ITALY',
    'LEGHORN': 'ITALY',
    
    // USA
    'LOS ANGELES': 'USA',
    'PHILADELPHIA': 'USA',
    'LONG BEACH': 'USA',
    'CHARLESTON': 'USA',
    'CHARLESTON NORTH': 'USA',
    'CHICAGO': 'USA',
    'HOUSTON': 'USA',
    'NEWARK': 'USA',
    'NORFOLK': 'USA',
    'PORT EVERGLADES': 'USA',
    'PORT HUENEME': 'USA',
    'SAVANNAH': 'USA',
    'SAN JUAN': 'USA',
    'MEMPHIS': 'USA',
    
    // Holanda
    'ROTTERDAM': 'NETHERLANDS',
    'MAASVLAKTE': 'NETHERLANDS',
    'VLISSINGEN': 'NETHERLANDS',
    'WILLEMSTAD': 'NETHERLANDS',
    
    // Brasil
    'SALVADOR, BAHIA': 'BRAZIL',
    'SALVADOR BAHIA': 'BRAZIL',
    'SALVADOR DE BAHIA': 'BRAZIL',
    'SALVADOR-BAHIA': 'BRAZIL',
    'SALVADOR DE BAHÍA': 'BRAZIL',
    'SALVADOR, BAHÍA': 'BRAZIL',
    'SUAPE': 'BRAZIL',
    
    // Honduras
    'SAN PEDRO SULA': 'HONDURAS',
    'PUERTO CORTES': 'HONDURAS',
    'TEGUCIGALPA': 'HONDURAS',
    
    // Guatemala
    'GUATEMALA CITY': 'GUATEMALA',
    'EL TEJAR': 'GUATEMALA',
    
    // Bélgica
    'ANTWERP': 'BELGIUM',
    
    // Jordania
    'AQABA': 'JORDAN',
    
    // Australia
    'ADELAIDE': 'AUSTRALIA',
    'BRISBANE': 'AUSTRALIA',
    'FREMANTLE': 'AUSTRALIA',
    'MELBOURNE': 'AUSTRALIA',
    'SYDNEY': 'AUSTRALIA',
    
    // Libia
    'AL KHOMS': 'LIBYA',
    'MISURATAH': 'LIBYA',
    
    // Turquía (más)
    'AMBARLI PORT ISTANBUL': 'TURKEY',
    
    // Tailandia
    'BANGKOK': 'THAILAND',
    'LAEM CHABANG': 'THAILAND',
    
    // Colombia (más)
    // 'CAUCEDO': 'COLOMBIA', // Duplicado - ver abajo
    
    // República Dominicana
    'CAUCEDO': 'DOMINICAN REPUBLIC',
    
    // USA (más)
    'AUBURN': 'USA',
    
    // Nueva Zelanda
    'AUCKLAND METROPORT': 'NEW ZEALAND',
    'LYTTELTON': 'NEW ZEALAND',
    'NAPIER': 'NEW ZEALAND',
    'TAURANGA': 'NEW ZEALAND',
    
    // Polonia
    'GDANSK': 'POLAND',
    
    // Grecia
    'PIRAEUS': 'GREECE',
    'THESSALONIKI': 'GREECE',
    
    // Reino Unido
    'FELIXSTOWE': 'UNITED KINGDOM',
    'SOUTHAMPTON': 'UNITED KINGDOM',
    'LONDON GATEWAY': 'UNITED KINGDOM',
    
    // Japón
    'KOBE': 'JAPAN',
    'NAGOYA': 'JAPAN',
    'YOKOHAMA': 'JAPAN',
    'HAKATA': 'JAPAN',
    
    // Vietnam
    'HO CHI MINH CITY': 'VIETNAM',
    
    // Indonesia
    'JAKARTA': 'INDONESIA',
    
    // Malasia
    'PORT KLANG': 'MALAYSIA',
    
    // Egipto - Comentado temporalmente
    // 'PORT SAID WEST': 'EGYPT',
    
    // Omán
    'SOHAR': 'OMAN',
    
    // Líbano
    'BEIRUT': 'LEBANON',
    'LEBANON': 'LEBANON',
    
    // Túnez
    'SFAX': 'TUNISIA',
    
    // Chipre
    'LIMASSOL': 'CYPRUS',
    
    // Noruega
    'KRISTIANSAND': 'NORWAY',
    'OSLO': 'NORWAY',
    
    // Letonia
    'RIGA': 'LATVIA',
    
    // Estonia
    'TALLINN': 'ESTONIA',
    
    // Sudáfrica
    'CAPE TOWN': 'SOUTH AFRICA',
    
    // Canadá (más)
    'MONTREAL': 'CANADA',
    
    // Perú
    'CALLAO': 'PERU',
    
    // Ecuador
    'GUAYAQUIL': 'ECUADOR',
    'GUAYAQUIL-POSORJA': 'ECUADOR',
    
    // México
    'MANZANILLO - MÉXICO': 'MEXICO',
    'MANZANILLO - MEXICO': 'MEXICO',
    'MANZANILLO-MEXICO': 'MEXICO',
    'MANZANILLO-MÉXICO': 'MEXICO',
    'MANZANILLO MEXICO': 'MEXICO',
    'MANZANILLO MÉXICO': 'MEXICO',
    'MANZANILLO': 'MEXICO', // Por defecto es México (Manzanillo Panamá tiene la especificación completa)
    'LAZARO CARDENAS': 'MEXICO',
    
    // Panamá (más)
    'MANZANILLO - PANAMÁ': 'PANAMA',
    'MANZANILLO - PANAMA': 'PANAMA',
    
    // Corea
    'BUSAN': 'KOREA',
    
    // Singapur
    'SINGAPORE': 'SINGAPORE',
    
    // China (más)
    'NINGBO': 'CHINA',
    'QINGDAO': 'CHINA',
    'TIANJIN': 'CHINA',
    'XINGANG': 'CHINA',
    'YANTIAN': 'CHINA',
    'SHEKOU': 'CHINA',
    'CHIWAN': 'CHINA',
    'ZHOUSHAN': 'CHINA',
    'YANGSHAN': 'CHINA',
  };
  
  // Buscar coincidencia exacta
  if (portToCountry[normalized]) {
    return portToCountry[normalized];
  }
  
  // Buscar coincidencia parcial (sin espacios extra, sin acentos)
  const normalizedClean = normalized
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[.,;:]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  
  for (const [port, country] of Object.entries(portToCountry)) {
    const portClean = port
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[.,;:]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
    
    if (normalizedClean.includes(portClean) || portClean.includes(normalizedClean)) {
      return country;
    }
  }
  
  // Buscar por código de país al final (ej: "BARCELONA, ES")
  const countryCodePatterns: Record<string, string> = {
    ' CN': 'CHINA',
    ', CN': 'CHINA',
    ' ES': 'SPAIN',
    ', ES': 'SPAIN',
    ' NL': 'NETHERLANDS',
    ', NL': 'NETHERLANDS',
    ' DE': 'GERMANY',
    ', DE': 'GERMANY',
    ' BE': 'BELGIUM',
    ', BE': 'BELGIUM',
    ' IT': 'ITALY',
    ', IT': 'ITALY',
    ' FR': 'FRANCE',
    ', FR': 'FRANCE',
    ' PT': 'PORTUGAL',
    ', PT': 'PORTUGAL',
    ' UK': 'UNITED KINGDOM',
    ', UK': 'UNITED KINGDOM',
    ' GB': 'UNITED KINGDOM',
    ', GB': 'UNITED KINGDOM',
    ' US': 'USA',
    ', US': 'USA',
    ' USA': 'USA',
    ', USA': 'USA',
    ' CL': 'CHILE',
    ', CL': 'CHILE',
    ' AR': 'ARGENTINA',
    ', AR': 'ARGENTINA',
    ' UY': 'URUGUAY',
    ', UY': 'URUGUAY',
    ' BR': 'BRAZIL',
    ', BR': 'BRAZIL',
    ' PE': 'PERU',
    ', PE': 'PERU',
    ' EC': 'ECUADOR',
    ', EC': 'ECUADOR',
    ' CO': 'COLOMBIA',
    ', CO': 'COLOMBIA',
    ' PA': 'PANAMA',
    ', PA': 'PANAMA',
    ' MX': 'MEXICO',
    ', MX': 'MEXICO',
    ' CA': 'CANADA',
    ', CA': 'CANADA',
    ' AU': 'AUSTRALIA',
    ', AU': 'AUSTRALIA',
    ' NZ': 'NEW ZEALAND',
    ', NZ': 'NEW ZEALAND',
    ' KR': 'KOREA',
    ', KR': 'KOREA',
    ' SG': 'SINGAPORE',
    ', SG': 'SINGAPORE',
    ' HK': 'HONG KONG',
    ', HK': 'HONG KONG',
    ' JP': 'JAPAN',
    ', JP': 'JAPAN',
    ' TW': 'TAIWAN',
    ', TW': 'TAIWAN',
    ' TH': 'THAILAND',
    ', TH': 'THAILAND',
    ' TR': 'TURKEY',
    ', TR': 'TURKEY',
    ' AE': 'UAE',
    ', AE': 'UAE',
    ' SA': 'SAUDI ARABIA',
    ', SA': 'SAUDI ARABIA',
  };
  
  for (const [pattern, country] of Object.entries(countryCodePatterns)) {
    if (normalized.includes(pattern)) {
      return country;
    }
  }
  
  // Si no se encuentra, devolver null para que se registre en consola
  console.debug(`⚠️ País no detectado para puerto: "${portName}"`);
  return null;
}

/**
 * Obtiene las coordenadas de un país
 */
export function getCountryCoordinates(country: string): [number, number] | null {
  if (!country) return null;
  
  const normalized = country.trim().toUpperCase();
  
  if (COUNTRY_COORDINATES[normalized]) {
    return COUNTRY_COORDINATES[normalized];
  }
  
  // Buscar coincidencia parcial
  for (const [key, coords] of Object.entries(COUNTRY_COORDINATES)) {
    if (normalized.includes(key) || key.includes(normalized)) {
      return coords;
    }
  }
  
  return null;
}
