const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs } = require('firebase/firestore');
const { createClient } = require('@supabase/supabase-js');

// Configuración de Firebase (usar las credenciales existentes)
const firebaseConfig = {
  apiKey: "AIzaSyCSgJpjlnuEYMp28rpg3kQSAocMJVZICzE",
  authDomain: "asli-by-rc.firebaseapp.com",
  projectId: "asli-by-rc",
  storageBucket: "asli-by-rc.firebasestorage.app",
  messagingSenderId: "97873856307",
  appId: "1:97873856307:web:7a735a2260ca948f8be046"
};

// Configuración de Supabase (usar las credenciales reales)
const supabaseUrl = 'https://knbnwbrjzkknarnkyriv.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtuYm53YnJqemtrbmFybmt5cml2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE0ODQzOTYsImV4cCI6MjA3NzA2MDM5Nn0.l7pwhkJSinVQLAsDVFvefP8V5gn_v8rN2U6FG03qVqs';

// Inicializar Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Inicializar Supabase
const supabase = createClient(supabaseUrl, supabaseKey);

// Función para convertir datos de Firebase a Supabase
const convertFirebaseToSupabase = (firebaseData) => {
  return {
    ref_asli: firebaseData.refAsli || '',
    ejecutivo: firebaseData.ejecutivo || '',
    shipper: firebaseData.shipper || '',
    booking: firebaseData.booking || '',
    cant_cont: firebaseData.cantCont === '-' || firebaseData.cantCont === '' ? null : parseInt(firebaseData.cantCont) || null,
    contenedor: firebaseData.contenedor || '',
    naviera: firebaseData.naviera || '',
    nave_inicial: firebaseData.naveInicial || '',
    especie: firebaseData.especie || '',
    temperatura: firebaseData.temperatura === '-' || firebaseData.temperatura === '' ? null : parseInt(firebaseData.temperatura) || null,
    cbm: firebaseData.cbm === '-' || firebaseData.cbm === '' ? null : parseInt(firebaseData.cbm) || null,
    ct: firebaseData.ct || '',
    co2: firebaseData.co2 === '-' || firebaseData.co2 === '' ? null : parseInt(firebaseData.co2) || null,
    o2: firebaseData.o2 === '-' || firebaseData.o2 === '' ? null : parseInt(firebaseData.o2) || null,
    pol: firebaseData.pol || '',
    pod: firebaseData.pod || '',
    deposito: firebaseData.deposito || '',
    etd: firebaseData.etd?.toDate?.()?.toISOString() || null,
    eta: firebaseData.eta?.toDate?.()?.toISOString() || null,
    tt: firebaseData.tt === '-' || firebaseData.tt === '' ? null : parseInt(firebaseData.tt) || null,
    flete: firebaseData.flete || '',
    estado: firebaseData.estado || 'PENDIENTE',
    roleada_desde: firebaseData.roleadaDesde || '',
    ingreso_stacking: firebaseData.ingresoStacking?.toDate?.()?.toISOString() || null,
    tipo_ingreso: firebaseData.tipoIngreso || 'NORMAL',
    numero_bl: firebaseData.numeroBl || '',
    estado_bl: firebaseData.estadoBl || '',
    contrato: firebaseData.contrato || '',
    semana_ingreso: firebaseData.semanaIngreso === '-' || firebaseData.semanaIngreso === '' ? null : parseInt(firebaseData.semanaIngreso) || null,
    mes_ingreso: firebaseData.mesIngreso === '-' || firebaseData.mesIngreso === '' ? null : parseInt(firebaseData.mesIngreso) || null,
    semana_zarpe: firebaseData.semanaZarpe === '-' || firebaseData.semanaZarpe === '' ? null : parseInt(firebaseData.semanaZarpe) || null,
    mes_zarpe: firebaseData.mesZarpe === '-' || firebaseData.mesZarpe === '' ? null : parseInt(firebaseData.mesZarpe) || null,
    semana_arribo: firebaseData.semanaArribo === '-' || firebaseData.semanaArribo === '' ? null : parseInt(firebaseData.semanaArribo) || null,
    mes_arribo: firebaseData.mesArribo === '-' || firebaseData.mesArribo === '' ? null : parseInt(firebaseData.mesArribo) || null,
    facturacion: firebaseData.facturacion || '',
    booking_pdf: firebaseData.bookingPdf || '',
    comentario: firebaseData.comentario || '',
    observacion: firebaseData.observacion || '',
    row_original: firebaseData.rowOriginal === '-' || firebaseData.rowOriginal === '' ? null : parseInt(firebaseData.rowOriginal) || null,
    created_at: firebaseData.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
    updated_at: firebaseData.updatedAt?.toDate?.()?.toISOString() || new Date().toISOString(),
    created_by: firebaseData.createdBy,
    updated_by: firebaseData.updatedBy,
    deleted_at: firebaseData.deletedAt?.toDate?.()?.toISOString() || null,
    deleted_by: firebaseData.deletedBy,
  };
};

// Función para migrar registros
const migrateRegistros = async () => {
  try {
    console.log('🔄 Iniciando migración de registros...');
    
    const registrosRef = collection(db, 'registros');
    const snapshot = await getDocs(registrosRef);
    
    console.log(`📦 Encontrados ${snapshot.size} registros en Firebase`);
    
    const registros = [];
    snapshot.forEach(doc => {
      registros.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    // Convertir a formato de Supabase
    const supabaseData = registros.map(convertFirebaseToSupabase);
    
    // Insertar en lotes de 1000
    const batchSize = 1000;
    for (let i = 0; i < supabaseData.length; i += batchSize) {
      const batch = supabaseData.slice(i, i + batchSize);
      
      const { data, error } = await supabase
        .from('registros')
        .insert(batch);
      
      if (error) {
        console.error(`Error insertando lote ${Math.floor(i/batchSize) + 1}:`, error);
        throw error;
      }
      
      console.log(`✅ Lote ${Math.floor(i/batchSize) + 1} migrado (${batch.length} registros)`);
    }
    
    console.log(`🎉 Migración de registros completada: ${supabaseData.length} registros`);
  } catch (error) {
    console.error('Error migrando registros:', error);
    throw error;
  }
};

// Función para migrar catálogos
const migrateCatalogos = async () => {
  try {
    console.log('🔄 Iniciando migración de catálogos...');
    
    const catalogosRef = collection(db, 'catalogos');
    const snapshot = await getDocs(catalogosRef);
    
    console.log(`📦 Encontrados ${snapshot.size} catálogos en Firebase`);
    
    const catalogos = [];
    snapshot.forEach(doc => {
      catalogos.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    // Convertir a formato de Supabase
    const supabaseData = catalogos.map(cat => ({
      categoria: cat.categoria,
      valores: cat.valores || [],
      mapping: cat.mapping || null,
    }));
    
    const { data, error } = await supabase
      .from('catalogos')
      .upsert(supabaseData, { onConflict: 'categoria' });
    
    if (error) {
      console.error('Error insertando catálogos:', error);
      throw error;
    }
    
    console.log(`🎉 Migración de catálogos completada: ${supabaseData.length} catálogos`);
  } catch (error) {
    console.error('Error migrando catálogos:', error);
    throw error;
  }
};

// Función principal de migración
const migrate = async () => {
  try {
    console.log('🚀 Iniciando migración completa de Firebase a Supabase...');
    
    // Verificar conexión a Supabase
    const { data, error } = await supabase.from('registros').select('count').limit(1);
    if (error) {
      console.error('Error conectando a Supabase:', error);
      return;
    }
    
    console.log('✅ Conexión a Supabase establecida');
    
    // Migrar catálogos primero
    await migrateCatalogos();
    
    // Migrar registros
    await migrateRegistros();
    
    console.log('🎉 ¡Migración completada exitosamente!');
    console.log('📝 Próximos pasos:');
    console.log('1. Actualiza las variables de entorno en .env.local');
    console.log('2. Ejecuta npm run dev para probar la aplicación');
    console.log('3. Verifica que todos los datos se muestren correctamente');
    
  } catch (error) {
    console.error('❌ Error durante la migración:', error);
    process.exit(1);
  }
};

// Ejecutar migración
migrate();
