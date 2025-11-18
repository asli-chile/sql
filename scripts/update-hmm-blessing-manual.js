/**
 * Script para actualizar HMM BLESSING manualmente con los datos más recientes de DataDocked
 * 
 * Uso:
 *   node scripts/update-hmm-blessing-manual.js
 * 
 * Requiere:
 *   - Variable de entorno NEXT_PUBLIC_SUPABASE_URL
 *   - Variable de entorno NEXT_PUBLIC_SUPABASE_ANON_KEY
 *   - O configurar en el script directamente
 */

const dataDockedJson = {
  "detail": {
    "name": "HMM BLESSING",
    "mmsi": "440117000",
    "imo": "9742170",
    "country": "Korea",
    "shipType": "Cargo vessels",
    "callsign": "D7EW",
    "teu": "",
    "length": "330 m",
    "beam": "48 m",
    "eni": null,
    "image": "https://static.vesselfinder.net/ship-photo/9742170-538007906-08c0ad7e7dd8431c5f2a219c91dd6419/1?v1",
    "etaUtc": "Dec 07, 2025 04:00 UTC",
    "draught": "13.3 m. ( max 16.0)",
    "deadweight": "134869",
    "speed": "4.2",
    "atdUtc": "Nov 14, 2025 10:00 UTC",
    "latitude": "-35.65115",
    "longitude": "-103.16366",
    "course": "228.2",
    "destination": "CNHKG",
    "hull": "-",
    "builder": "HANJIN SUBIC SHIPYARD",
    "material": "-",
    "placeOfBuild": "OLONGAPO, Philippines",
    "positionReceived": "Nov 17, 2025 23:01 UTC",
    "ballastWater": "30818",
    "crudeOil": "0",
    "freshWater": "608",
    "gas": "0 m³",
    "grain": "0 m³",
    "bale": "0 m³",
    "unlocode_destination": "HKHKG",
    "unlocode_lastport": "CLVAP",
    "lastPort": "Valparaiso, Chile",
    "countryIso": "KP",
    "typeSpecific": "Container Ship",
    "navigationalStatus": "-",
    "grossTonnage": "114023",
    "yearOfBuilt": "2018",
    "currentDraught": "13.3 m",
    "distance": "8733.34 kn",
    "predictedEta": "Dec 8, 09:59",
    "time": "20 days",
    "engine": {
      "engineBuilder": "HYUNDAI HEAVY INDUSTRIES CO., LTD., ENGINE & MACHINERY DIVISION",
      "engineType": "8G95ME-C9.2",
      "enginePower(kW)": "42310",
      "fuelType": "-",
      "Propeller": "1"
    },
    "ports": [
      {
        "portName": "Valparaiso Chile",
        "portSign": "CLVAP",
        "arrived": "Nov 12, 09:37",
        "departed": "Nov 14, 10:00"
      },
      {
        "portName": "San Vicente Chile",
        "portSign": "CLSVE",
        "arrived": "Nov 10, 10:23",
        "departed": "Nov 11, 13:56"
      },
      {
        "portName": "Talcahuano Anch. Chile",
        "portSign": "CLTAL",
        "arrived": "Nov 9, 14:59",
        "departed": "Nov 10, 07:07"
      },
      {
        "portName": "Mejillones Chile",
        "portSign": "CLMJS",
        "arrived": "Nov 6, 00:05",
        "departed": "Nov 7, 02:02"
      },
      {
        "portName": "Iquique Chile",
        "portSign": "CLIQQ",
        "arrived": "Nov 3, 11:17",
        "departed": "Nov 5, 11:31"
      },
      {
        "portName": "Callao Peru",
        "portSign": "PECLL",
        "arrived": "Oct 29, 05:10",
        "departed": "Oct 30, 19:31"
      },
      {
        "portName": "Callao Anch. Peru",
        "portSign": "PECLL",
        "arrived": "Oct 28, 08:58",
        "departed": "Oct 29, 03:15"
      },
      {
        "portName": "Lazaro Cardenas Mexico",
        "portSign": "MXLZC",
        "arrived": "Oct 22, 16:54",
        "departed": "Oct 23, 04:10"
      },
      {
        "portName": "Manzanillo Mexico",
        "portSign": "MXZLO",
        "arrived": "Oct 20, 14:39",
        "departed": "Oct 22, 04:36"
      },
      {
        "portName": "Busan New Port Korea",
        "portSign": "KRBNP",
        "arrived": "Oct 2, 20:49",
        "departed": "Oct 4, 14:50"
      },
      {
        "portName": "Yangshan Deep-Water China",
        "portSign": "CNYSA",
        "arrived": "Sep 29, 18:13",
        "departed": "Oct 1, 07:25"
      },
      {
        "portName": "Keelung (Chilung) Taiwan",
        "portSign": "TWKEL",
        "arrived": "Sep 27, 22:26",
        "departed": "Sep 28, 16:27"
      },
      {
        "portName": "Yantian China",
        "portSign": "CNYTN",
        "arrived": "Sep 25, 12:54",
        "departed": "Sep 26, 14:39"
      },
      {
        "portName": "Hong Kong Hong Kong",
        "portSign": "HKHKG",
        "arrived": "Sep 20, 16:25",
        "departed": "Sep 21, 11:29"
      },
      {
        "portName": "San Vicente Chile",
        "portSign": "CLSVE",
        "arrived": "Aug 24, 01:14",
        "departed": "Aug 26, 11:41"
      }
    ],
    "management": {
      "registeredOwner": "HMM CO LTD",
      "registeredOwnerAddress": "108, Yeoui-daero, Yeongdeungpo-gu, Seoul, 07335, South Korea.",
      "registeredOwnerWebsite": "http://www.hmm21.com",
      "registeredOwnerEmail": "gys@hmm21.com",
      "manager": "HMM CO LTD",
      "ismAddress": "63, Jungang-daero, Jung-gu, Busan, South Korea.",
      "managerAddress": "108, Yeoui-daero, Yeongdeungpo-gu, Seoul, 07335, South Korea.",
      "managerWebsite": "http://www.hmm21.com",
      "managerEmail": "gys@hmm21.com",
      "ism": "HMM OCEAN SERVICE CO LTD",
      "ismWeb": "http://www.hos21.com",
      "ismWebsite": "http://www.hos21.com",
      "ismEmail": "vetting@hos21.com",
      "P&I": "Steamship Mutual Underwriting Association (Bermuda) (inception 2025-09-22)",
      "ClassificationSociety": "KOREAN REGISTER OF SHIPPING"
    },
    "updateTime": "Nov 17, 2025 23:20 UTC",
    "dataSource": "satellite"
  }
};

async function updateHmmBlessing() {
  // Reemplaza esto con tu URL de Vercel o local
  const apiUrl = process.env.API_URL || 'http://localhost:3000';
  const endpoint = `${apiUrl}/api/vessels/update-manual`;

  console.log('🚢 Actualizando HMM BLESSING con datos más recientes...');
  console.log('📍 Coordenadas:', dataDockedJson.detail.latitude, dataDockedJson.detail.longitude);
  console.log('⏰ Posición recibida:', dataDockedJson.detail.positionReceived);

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // NOTA: Para producción, necesitarás autenticación
        // 'Authorization': `Bearer ${process.env.AUTH_TOKEN}`
      },
      body: JSON.stringify({
        vessel_name: 'HMM BLESSING',
        data: dataDockedJson,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Error ${response.status}: ${JSON.stringify(errorData)}`);
    }

    const result = await response.json();
    
    console.log('\n✅ Actualización completada exitosamente!');
    console.log('📊 Resultado:', JSON.stringify(result, null, 2));
    console.log('\n📍 Nueva posición:');
    console.log(`   Lat: ${result.updated.lat}`);
    console.log(`   Lon: ${result.updated.lon}`);
    console.log(`   Fecha: ${result.updated.position_at}`);
    console.log(`   Imagen: ${result.updated.vessel_image ? '✅ Guardada' : '❌ No hay imagen'}`);
    
  } catch (error) {
    console.error('\n❌ Error actualizando HMM BLESSING:');
    console.error(error.message);
    process.exit(1);
  }
}

// Ejecutar si es llamado directamente
if (require.main === module) {
  updateHmmBlessing();
}

module.exports = { updateHmmBlessing, dataDockedJson };

