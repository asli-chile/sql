#!/usr/bin/env node

/**
 * Script para crear usuarios en Supabase (admin, ejecutivo, cliente)
 * 
 * Uso:
 *   node scripts/create-user.js admin email@asli.cl "Nombre Usuario" password
 *   node scripts/create-user.js ejecutivo email@asli.cl "Nombre Usuario" password "Cliente1,Cliente2"
 *   node scripts/create-user.js cliente email@cliente.com "Nombre Cliente" password "NOMBRE_CLIENTE"
 * 
 * O ejecutar sin argumentos para modo interactivo:
 *   node scripts/create-user.js
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const readline = require('readline');

// Colores para la consola
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// Crear cliente de Supabase con service role key
function getAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    log('❌ ERROR: Faltan variables de entorno', 'red');
    log('   Asegúrate de tener en .env.local:', 'yellow');
    log('   - NEXT_PUBLIC_SUPABASE_URL', 'yellow');
    log('   - SUPABASE_SERVICE_ROLE_KEY', 'yellow');
    process.exit(1);
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

// Obtener lista de clientes del catálogo
async function getClientesList() {
  const supabase = getAdminClient();
  const { data, error } = await supabase
    .from('catalogos')
    .select('valores')
    .eq('categoria', 'clientes')
    .single();

  if (error || !data || !data.valores) {
    log('⚠️  No se pudieron obtener los clientes del catálogo', 'yellow');
    // Lista de respaldo
    return [
      'AGRI. INDEPENDENCIA',
      'AGROSOL',
      'AISIEN',
      'ALMAFRUIT',
      'BARON EXPORT',
      'BLOSSOM',
      'COPEFRUT',
      'CRISTIAN MUÑOZ',
      'EXPORTADORA DEL SUR (XSUR)',
      'EXPORTADORA SAN ANDRES',
      'FAMILY GROWERS',
      'FENIX',
      'FRUIT ANDES SUR',
      'GF EXPORT',
      'HILLVILLA',
      'JOTRISA',
      'LA RESERVA',
      'RINOFRUIT',
      'SIBARIT',
      'TENO FRUIT',
      'THE GROWERS CLUB',
      'VIF',
    ];
  }

  return data.valores || [];
}

// Obtener lista de ejecutivos existentes
async function getEjecutivosList() {
  const supabase = getAdminClient();
  const { data, error } = await supabase
    .from('usuarios')
    .select('id, email, nombre, rol')
    .or('rol.eq.ejecutivo,email.like.%@asli.cl')
    .eq('activo', true)
    .order('nombre');

  if (error) {
    log('⚠️  No se pudieron obtener los ejecutivos', 'yellow');
    return [];
  }

  return data || [];
}

// Verificar si el usuario ya existe
async function checkUserExists(email) {
  const supabase = getAdminClient();
  const emailNorm = (email || '').toLowerCase().trim();
  
  // Verificar en Auth (listUsers puede estar paginado, pedir más)
  const { data: authUsers } = await supabase.auth.admin.listUsers({ perPage: 1000 });
  const authUser = authUsers?.users?.find(u => (u.email || '').toLowerCase() === emailNorm);
  const existsInAuth = !!authUser;
  
  // Verificar en tabla usuarios por email (búsqueda case-insensitive con ilike)
  const { data: usuarioByEmail, error: emailError } = await supabase
    .from('usuarios')
    .select('id, email, nombre, rol, auth_user_id, clientes_asignados, cliente_nombre')
    .ilike('email', emailNorm)
    .maybeSingle();
  
  // Si ilike no encontró, intentar eq por si el driver no soporta ilike en este contexto
  let usuarioByEmailFinal = usuarioByEmail;
  if (!usuarioByEmailFinal && !emailError) {
    const { data: fallback } = await supabase
      .from('usuarios')
      .select('id, email, nombre, rol, auth_user_id, clientes_asignados, cliente_nombre')
      .eq('email', emailNorm)
      .maybeSingle();
    usuarioByEmailFinal = fallback;
  }
  
  // Si existe en Auth, verificar también por auth_user_id
  let usuarioByAuthId = null;
  if (authUser) {
    const { data } = await supabase
      .from('usuarios')
      .select('id, email, nombre, rol, auth_user_id, clientes_asignados, cliente_nombre')
      .eq('auth_user_id', authUser.id)
      .maybeSingle();
    usuarioByAuthId = data;
  }
  
  // También verificar si hay usuarios en la tabla con ese email pero sin auth_user_id
  // (caso de usuarios huérfanos)
  if (!usuarioByEmailFinal && !usuarioByAuthId) {
    const { data: usuarioHuérfano } = await supabase
      .from('usuarios')
      .select('id, email, nombre, rol, auth_user_id, clientes_asignados, cliente_nombre')
      .ilike('email', emailNorm)
      .is('auth_user_id', null)
      .maybeSingle();
    if (usuarioHuérfano) {
      return {
        exists: true,
        inAuth: false,
        inUsuarios: true,
        usuario: usuarioHuérfano,
        authUser: null,
      };
    }
  }
  
  const existsInUsuarios = !!usuarioByEmailFinal || !!usuarioByAuthId;
  const usuario = usuarioByEmailFinal || usuarioByAuthId;
  
  return {
    exists: existsInAuth || existsInUsuarios,
    inAuth: existsInAuth,
    inUsuarios: existsInUsuarios,
    usuario: usuario,
    authUser: authUser,
  };
}

// Función para actualizar usuario existente
async function updateUser(usuarioId, rol, nombre, clientesAsignados = [], clienteNombre = null) {
  const supabase = getAdminClient();

  log(`\n📝 Actualizando usuario...`, 'cyan');
  log(`   ID: ${usuarioId}`, 'blue');
  log(`   Nombre: ${nombre}`, 'blue');
  log(`   Rol: ${rol}`, 'blue');

  if (rol === 'ejecutivo' && clientesAsignados.length > 0) {
    log(`   Clientes asignados: ${clientesAsignados.join(', ')}`, 'blue');
  }
  if (rol === 'cliente' && clienteNombre) {
    log(`   Cliente: ${clienteNombre}`, 'blue');
  }

  try {
    const updateData = {
      nombre: nombre,
      rol: rol,
      activo: true,
    };

    // Agregar campos según el rol
    if (rol === 'ejecutivo') {
      updateData.clientes_asignados = clientesAsignados;
      updateData.cliente_nombre = null;
    } else if (rol === 'cliente') {
      updateData.clientes_asignados = [];
      updateData.cliente_nombre = clienteNombre;
    } else if (rol === 'admin') {
      updateData.clientes_asignados = [];
      updateData.cliente_nombre = null;
    }

    const { data: usuarioActualizado, error: updateError } = await supabase
      .from('usuarios')
      .update(updateData)
      .eq('id', usuarioId)
      .select()
      .single();

    if (updateError) {
      log(`\n❌ Error al actualizar usuario: ${updateError.message}`, 'red');
      return { success: false, error: updateError.message };
    }

    log(`✅ Usuario actualizado exitosamente`, 'green');

    // Mostrar resumen
    log('\n' + '='.repeat(60), 'cyan');
    log('✅ USUARIO ACTUALIZADO EXITOSAMENTE', 'green');
    log('='.repeat(60), 'cyan');
    log(`ID: ${usuarioActualizado.id}`, 'blue');
    log(`Email: ${usuarioActualizado.email}`, 'blue');
    log(`Nombre: ${usuarioActualizado.nombre}`, 'blue');
    log(`Rol: ${usuarioActualizado.rol}`, 'blue');
    log(`Activo: ${usuarioActualizado.activo ? 'Sí' : 'No'}`, 'blue');

    if (rol === 'ejecutivo' && usuarioActualizado.clientes_asignados?.length > 0) {
      log(`Clientes asignados: ${usuarioActualizado.clientes_asignados.join(', ')}`, 'blue');
    }
    if (rol === 'cliente' && usuarioActualizado.cliente_nombre) {
      log(`Cliente: ${usuarioActualizado.cliente_nombre}`, 'blue');
    }

    log('='.repeat(60) + '\n', 'cyan');

    return { success: true, user: usuarioActualizado };
  } catch (error) {
    log(`\n❌ Error inesperado: ${error.message}`, 'red');
    return { success: false, error: error.message };
  }
}

// Función para crear usuario
async function createUser(rol, email, nombre, password, clientesAsignados = [], clienteNombre = null, shouldUpdate = false, existingUserId = null) {
  const supabase = getAdminClient();

  log(`\n📝 Creando usuario ${rol}...`, 'cyan');
  log(`   Email: ${email}`, 'blue');
  log(`   Nombre: ${nombre}`, 'blue');
  log(`   Rol: ${rol}`, 'blue');

  if (rol === 'ejecutivo' && clientesAsignados.length > 0) {
    log(`   Clientes asignados: ${clientesAsignados.join(', ')}`, 'blue');
  }
  if (rol === 'cliente' && clienteNombre) {
    log(`   Cliente: ${clienteNombre}`, 'blue');
  }

  try {
    // 1. Verificar si el usuario ya existe
    log('\n🔍 Verificando si el usuario ya existe...', 'cyan');
    const userCheck = await checkUserExists(email);
    
    if (userCheck.exists) {
      log(`\n❌ El usuario con email ${email} ya existe`, 'red');
      
      // Mostrar información detallada
      if (userCheck.inAuth) {
        log(`   ✅ Existe en Supabase Auth (ID: ${userCheck.authUser?.id})`, 'green');
      } else {
        log(`   ❌ NO existe en Supabase Auth`, 'red');
      }
      
      if (userCheck.inUsuarios) {
        log(`   ✅ Existe en tabla usuarios (ID: ${userCheck.usuario?.id})`, 'green');
        log(`   - Nombre actual: ${userCheck.usuario?.nombre}`, 'yellow');
        log(`   - Rol actual: ${userCheck.usuario?.rol}`, 'yellow');
        if (userCheck.usuario?.auth_user_id) {
          log(`   - Auth User ID: ${userCheck.usuario.auth_user_id}`, 'yellow');
          // Verificar si ese auth_user_id existe en Auth
          if (userCheck.inAuth && userCheck.usuario.auth_user_id !== userCheck.authUser?.id) {
            log(`   ⚠️  INCONSISTENCIA: El auth_user_id en usuarios (${userCheck.usuario.auth_user_id}) no coincide con Auth (${userCheck.authUser?.id})`, 'yellow');
          }
        } else {
          log(`   - Auth User ID: NULL (usuario huérfano - no vinculado a Auth)`, 'yellow');
        }
      } else {
        log(`   ❌ NO existe en tabla usuarios`, 'red');
      }
      
      // Casos especiales
      if (userCheck.inAuth && !userCheck.inUsuarios) {
        log('\n   ⚠️  Usuario huérfano: existe en Auth pero NO en tabla usuarios', 'yellow');
        log('   💡 Puedes eliminar el usuario de Auth y crearlo de nuevo, o crear el registro en usuarios manualmente', 'blue');
      } else if (!userCheck.inAuth && userCheck.inUsuarios) {
        log('\n   ⚠️  Usuario huérfano: existe en tabla usuarios pero NO en Auth', 'yellow');
        log('   💡 OPCIONES:', 'cyan');
        log('      1. Actualizar el usuario existente (cambiar rol, nombre, etc.)', 'blue');
        log('      2. Eliminar el registro de usuarios y crear de nuevo', 'blue');
        log('      3. Crear el usuario en Auth manualmente y vincularlo', 'blue');
      } else if (userCheck.inAuth && userCheck.inUsuarios) {
        log('\n   ✅ Usuario completo: existe en AMBOS lugares', 'green');
        if (userCheck.usuario?.auth_user_id === userCheck.authUser?.id) {
          log('   ✅ Los auth_user_id coinciden correctamente', 'green');
        }
        log('\n   💡 OPCIONES:', 'cyan');
        log('      1. Actualizar el usuario existente (cambiar rol, nombre, clientes, etc.)', 'blue');
        log('      2. Cancelar y usar otro email', 'blue');
      }
      
      // Si estamos en modo interactivo y el usuario existe, retornar información para preguntar
      return { 
        success: false, 
        error: 'Usuario ya existe', 
        exists: true,
        canUpdate: userCheck.inUsuarios,
        existingUser: userCheck.usuario
      };
    }

    // 2. Verificar si ya existe un usuario admin (para validar bootstrap)
    if (rol === 'admin') {
      const { count } = await supabase
        .from('usuarios')
        .select('*', { count: 'exact', head: true })
        .eq('rol', 'admin');

      if (count === 0) {
        log('\n⚠️  ADVERTENCIA: No hay usuarios admin existentes.', 'yellow');
        log('   Si es el primer usuario, está bien continuar.', 'yellow');
      }
    }

    // 3. Verificación adicional: buscar usuarios existentes con ese email (por si acaso)
    log('\n🔍 Verificación adicional: buscando usuarios existentes...', 'cyan');
    const emailNorm2 = (email || '').toLowerCase().trim();
    let { data: usuarioExistente } = await supabase
      .from('usuarios')
      .select('id, email, nombre, rol, auth_user_id')
      .ilike('email', emailNorm2)
      .maybeSingle();
    if (!usuarioExistente) {
      const res = await supabase
        .from('usuarios')
        .select('id, email, nombre, rol, auth_user_id')
        .eq('email', emailNorm2)
        .maybeSingle();
      usuarioExistente = res.data;
    }

    if (usuarioExistente) {
      log(`\n⚠️  DETECTADO: Usuario encontrado en tabla usuarios (no detectado en verificación inicial)`, 'yellow');
      log(`   - ID: ${usuarioExistente.id}`, 'yellow');
      log(`   - Email: ${usuarioExistente.email}`, 'yellow');
      log(`   - Nombre: ${usuarioExistente.nombre}`, 'yellow');
      log(`   - Rol actual: ${usuarioExistente.rol}`, 'yellow');
      if (usuarioExistente.auth_user_id) {
        log(`   - Auth User ID existente: ${usuarioExistente.auth_user_id}`, 'yellow');
        // Verificar si ese auth_user_id existe en Auth
        const { data: authUsers } = await supabase.auth.admin.listUsers();
        const authUserExistente = authUsers?.users?.find(u => u.id === usuarioExistente.auth_user_id);
        if (authUserExistente) {
          log(`   - ✅ Ese auth_user_id SÍ existe en Auth (email: ${authUserExistente.email})`, 'green');
          log(`\n❌ El usuario ya existe completamente. No se puede crear de nuevo.`, 'red');
          return { 
            success: false, 
            error: 'Usuario ya existe en ambos lugares',
            exists: true 
          };
        } else {
          log(`   - ❌ Ese auth_user_id NO existe en Auth (usuario huérfano)`, 'red');
          log(`\n💡 El usuario existe en usuarios pero el auth_user_id no es válido en Auth.`, 'cyan');
          log(`   Opciones:`, 'cyan');
          log(`   1. Actualizar el registro existente (cambiar rol, nombre, etc.)`, 'blue');
          log(`   2. Eliminar el registro y crear de nuevo`, 'blue');
          return { 
            success: false, 
            error: 'Usuario existe en usuarios con auth_user_id inválido',
            exists: true,
            usuarioExistente: usuarioExistente
          };
        }
      } else {
        log(`   - Auth User ID: NULL (usuario sin vincular a Auth)`, 'yellow');
        log(`\n💡 El usuario existe en usuarios pero no está vinculado a Auth.`, 'cyan');
        log(`   Opciones:`, 'cyan');
        log(`   1. Actualizar el registro existente y crear en Auth`, 'blue');
        log(`   2. Eliminar el registro y crear de nuevo`, 'blue');
        return { 
          success: false, 
          error: 'Usuario existe en usuarios sin auth_user_id',
          exists: true,
          usuarioExistente: usuarioExistente
        };
      }
    }

    // 4. Crear usuario en Supabase Auth
    log('\n🔐 Creando usuario en Supabase Auth...', 'cyan');
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: email.toLowerCase().trim(),
      password: password,
      email_confirm: true,
      user_metadata: {
        full_name: nombre,
      },
    });

    if (authError || !authData?.user) {
      log(`\n❌ Error al crear usuario en Auth: ${authError?.message || 'No se recibió el usuario'}`, 'red');
      
      // Verificar el estado real después del error
      log('\n🔍 Verificando estado actual del usuario...', 'cyan');
      const estadoActual = await checkUserExists(email);
      
      if (estadoActual.inUsuarios && !estadoActual.inAuth) {
        log('\n⚠️  SITUACIÓN DETECTADA: El usuario existe en tabla usuarios pero NO en Auth', 'yellow');
        log(`   - ID en usuarios: ${estadoActual.usuario?.id}`, 'yellow');
        log(`   - Email: ${estadoActual.usuario?.email}`, 'yellow');
        log(`   - Nombre: ${estadoActual.usuario?.nombre}`, 'yellow');
        log(`   - Rol: ${estadoActual.usuario?.rol}`, 'yellow');
        if (estadoActual.usuario?.auth_user_id) {
          log(`   - Auth User ID: ${estadoActual.usuario.auth_user_id}`, 'yellow');
          log(`   - ⚠️  Pero ese ID NO existe en Auth`, 'yellow');
        } else {
          log('   - Auth User ID: NULL (usuario huérfano en usuarios)', 'yellow');
        }
        log('\n💡 OPCIONES:', 'cyan');
        log('   1. Eliminar el registro de usuarios y crear de nuevo', 'blue');
        log('   2. Crear el usuario en Auth manualmente y vincularlo', 'blue');
      }
      
      return { success: false, error: authError?.message || 'Error desconocido al crear en Auth' };
    }

    log(`✅ Usuario creado en Auth (ID: ${authData.user.id})`, 'green');

    // 4.5. Verificar si el auth_user_id ya existe en usuarios
    // Si existe: ACTUALIZAR la fila existente (rol, nombre, clientes) en lugar de insertar
    log('\n🔍 Verificando si el auth_user_id ya existe en usuarios...', 'cyan');
    const { data: existingUsuario } = await supabase
      .from('usuarios')
      .select('id, email, nombre, rol, auth_user_id')
      .eq('auth_user_id', authData.user.id)
      .maybeSingle();

    if (existingUsuario) {
      log(`\n🔄 El usuario ya existe en usuarios. Actualizando rol, nombre y clientes...`, 'cyan');
      
      const updateData = {
        nombre: nombre,
        rol: rol,
        activo: true,
      };
      if (rol === 'ejecutivo') {
        updateData.clientes_asignados = clientesAsignados;
        updateData.cliente_nombre = null;
      } else if (rol === 'cliente') {
        updateData.clientes_asignados = [];
        updateData.cliente_nombre = clienteNombre;
      } else {
        updateData.clientes_asignados = [];
        updateData.cliente_nombre = null;
      }

      const { data: usuarioActualizado, error: updateError } = await supabase
        .from('usuarios')
        .update(updateData)
        .eq('id', existingUsuario.id)
        .select()
        .single();

      if (updateError) {
        log(`\n❌ Error al actualizar: ${updateError.message}`, 'red');
        log('🧹 Eliminando usuario de Auth...', 'cyan');
        await supabase.auth.admin.deleteUser(authData.user.id);
        return { success: false, error: updateError.message };
      }

      log(`✅ Usuario actualizado en tabla usuarios (ID: ${usuarioActualizado.id})`, 'green');
      log('\n' + '='.repeat(60), 'cyan');
      log('✅ USUARIO CONFIGURADO EXITOSAMENTE (Auth + usuarios actualizado)', 'green');
      log('='.repeat(60), 'cyan');
      log(`Email: ${usuarioActualizado.email}`, 'blue');
      log(`Nombre: ${usuarioActualizado.nombre}`, 'blue');
      log(`Rol: ${usuarioActualizado.rol}`, 'blue');
      if (rol === 'ejecutivo' && usuarioActualizado.clientes_asignados?.length > 0) {
        log(`Clientes: ${usuarioActualizado.clientes_asignados.join(', ')}`, 'blue');
      }
      if (rol === 'cliente' && usuarioActualizado.cliente_nombre) {
        log(`Cliente: ${usuarioActualizado.cliente_nombre}`, 'blue');
      }
      log('='.repeat(60) + '\n', 'cyan');
      return { success: true, user: usuarioActualizado };
    }

    // 5. Crear registro en tabla usuarios (solo si no existía)
    log('\n💾 Creando registro en tabla usuarios...', 'cyan');
    const usuarioData = {
      auth_user_id: authData.user.id,
      email: email.toLowerCase().trim(),
      nombre: nombre,
      rol: rol,
      activo: true,
    };

    // Agregar campos según el rol
    if (rol === 'ejecutivo') {
      usuarioData.clientes_asignados = clientesAsignados;
      usuarioData.cliente_nombre = null;
    } else if (rol === 'cliente') {
      usuarioData.clientes_asignados = [];
      usuarioData.cliente_nombre = clienteNombre;
    } else if (rol === 'admin') {
      usuarioData.clientes_asignados = [];
      usuarioData.cliente_nombre = null;
    }

    const { data: usuarioInsert, error: usuarioError } = await supabase
      .from('usuarios')
      .insert(usuarioData)
      .select()
      .single();

    if (usuarioError) {
      log(`\n❌ Error al crear registro en usuarios: ${usuarioError.message}`, 'red');
      
      // Verificar el estado real después del error
      log('\n🔍 Verificando estado actual del usuario...', 'cyan');
      const estadoActual = await checkUserExists(email);
      
      if (estadoActual.inUsuarios && estadoActual.inAuth) {
        log('\n⚠️  SITUACIÓN DETECTADA: El usuario existe en AMBOS lugares', 'yellow');
        log(`   - Auth User ID: ${estadoActual.authUser?.id}`, 'yellow');
        log(`   - Usuario ID: ${estadoActual.usuario?.id}`, 'yellow');
        log(`   - Email: ${estadoActual.usuario?.email}`, 'yellow');
        log(`   - Nombre: ${estadoActual.usuario?.nombre}`, 'yellow');
        log(`   - Rol: ${estadoActual.usuario?.rol}`, 'yellow');
        if (estadoActual.usuario?.auth_user_id !== estadoActual.authUser?.id) {
          log('   ⚠️  Los auth_user_id no coinciden - posible inconsistencia', 'yellow');
        }
      } else if (estadoActual.inUsuarios && !estadoActual.inAuth) {
        log('\n⚠️  SITUACIÓN DETECTADA: El usuario existe en usuarios pero NO en Auth', 'yellow');
        log(`   - Usuario ID: ${estadoActual.usuario?.id}`, 'yellow');
        log(`   - Email: ${estadoActual.usuario?.email}`, 'yellow');
        log(`   - Nombre: ${estadoActual.usuario?.nombre}`, 'yellow');
        log(`   - Rol: ${estadoActual.usuario?.rol}`, 'yellow');
        if (estadoActual.usuario?.auth_user_id) {
          log(`   - Auth User ID en usuarios: ${estadoActual.usuario.auth_user_id}`, 'yellow');
          log('   - Pero ese usuario NO existe en Auth', 'yellow');
        } else {
          log('   - Auth User ID: NULL (usuario huérfano)', 'yellow');
        }
      } else if (!estadoActual.inUsuarios && estadoActual.inAuth) {
        log('\n⚠️  SITUACIÓN DETECTADA: El usuario existe en Auth pero NO en usuarios', 'yellow');
        log(`   - Auth User ID: ${estadoActual.authUser?.id}`, 'yellow');
        log(`   - Email: ${estadoActual.authUser?.email}`, 'yellow');
      }
      
      // Intentar eliminar el usuario de Auth si se creó
      log('\n🧹 Intentando limpiar usuario de Auth...', 'cyan');
      const { error: deleteError } = await supabase.auth.admin.deleteUser(authData.user.id);
      if (deleteError) {
        log(`   ⚠️  Error al eliminar de Auth: ${deleteError.message}`, 'yellow');
        log('   💡 Puede que el usuario ya no exista en Auth o haya otro problema', 'blue');
      } else {
        log('   ✅ Usuario eliminado de Auth', 'green');
      }
      
      return { success: false, error: usuarioError.message };
    }

    log(`✅ Usuario creado exitosamente en tabla usuarios (ID: ${usuarioInsert.id})`, 'green');

    // 6. Mostrar resumen
    log('\n' + '='.repeat(60), 'cyan');
    log('✅ USUARIO CREADO EXITOSAMENTE', 'green');
    log('='.repeat(60), 'cyan');
    log(`ID: ${usuarioInsert.id}`, 'blue');
    log(`Email: ${usuarioInsert.email}`, 'blue');
    log(`Nombre: ${usuarioInsert.nombre}`, 'blue');
    log(`Rol: ${usuarioInsert.rol}`, 'blue');
    log(`Activo: ${usuarioInsert.activo ? 'Sí' : 'No'}`, 'blue');

    if (rol === 'ejecutivo' && usuarioInsert.clientes_asignados?.length > 0) {
      log(`Clientes asignados: ${usuarioInsert.clientes_asignados.join(', ')}`, 'blue');
    }
    if (rol === 'cliente' && usuarioInsert.cliente_nombre) {
      log(`Cliente: ${usuarioInsert.cliente_nombre}`, 'blue');
    }

    log('='.repeat(60) + '\n', 'cyan');

    return { success: true, user: usuarioInsert };
  } catch (error) {
    log(`\n❌ Error inesperado: ${error.message}`, 'red');
    return { success: false, error: error.message };
  }
}

// Función para modo interactivo
function createInteractiveInterface() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const question = (query) => new Promise((resolve) => rl.question(query, resolve));

  return { question, close: () => rl.close() };
}

// Mostrar lista de clientes numerados
async function mostrarClientesList() {
  const clientes = await getClientesList();
  log('\n📋 LISTA DE CLIENTES DISPONIBLES:', 'yellow');
  log('─'.repeat(60), 'cyan');
  clientes.forEach((cliente, index) => {
    log(`  ${(index + 1).toString().padStart(2)}. ${cliente}`, 'blue');
  });
  log('─'.repeat(60), 'cyan');
  return clientes;
}

// Mostrar lista de ejecutivos existentes
async function mostrarEjecutivosList() {
  const ejecutivos = await getEjecutivosList();
  if (ejecutivos.length === 0) {
    log('\n📋 No hay ejecutivos existentes', 'yellow');
    return [];
  }
  log('\n👥 EJECUTIVOS EXISTENTES:', 'yellow');
  log('─'.repeat(60), 'cyan');
  ejecutivos.forEach((ejecutivo, index) => {
    log(`  ${(index + 1).toString().padStart(2)}. ${ejecutivo.nombre} (${ejecutivo.email}) - ${ejecutivo.rol}`, 'blue');
  });
  log('─'.repeat(60), 'cyan');
  return ejecutivos;
}

// Procesar selección de clientes por números
function procesarSeleccionClientes(input, clientesList) {
  if (!input || !input.trim()) {
    return [];
  }

  // Si el input contiene comas, asumir que son números
  if (input.includes(',')) {
    const numeros = input
      .split(',')
      .map(n => parseInt(n.trim()))
      .filter(n => !isNaN(n) && n > 0 && n <= clientesList.length);
    
    return numeros.map(n => clientesList[n - 1]).filter(Boolean);
  }

  // Si es un solo número
  const numero = parseInt(input.trim());
  if (!isNaN(numero) && numero > 0 && numero <= clientesList.length) {
    return [clientesList[numero - 1]];
  }

  // Si no es número, asumir que es texto (nombres separados por comas)
  return input
    .split(',')
    .map(c => c.trim())
    .filter(c => c.length > 0);
}

// Modo interactivo mejorado
async function interactiveMode() {
  log('\n' + '='.repeat(60), 'cyan');
  log('🔧 CREAR USUARIO - MODO INTERACTIVO', 'bright');
  log('='.repeat(60) + '\n', 'cyan');

  const rl = createInteractiveInterface();
  const { question } = rl;

  try {
    let continuar = true;
    while (continuar) {
      // Mostrar ejecutivos existentes
      await mostrarEjecutivosList();

      // Seleccionar rol
      log('\nSelecciona el tipo de usuario:', 'yellow');
      log('  1. admin - Administrador (acceso total)', 'blue');
      log('  2. ejecutivo - Ejecutivo (acceso a clientes asignados)', 'blue');
      log('  3. cliente - Cliente (acceso solo a su cliente)', 'blue');
      const rolOption = await question('\nOpción (1-3): ');

      let rol;
      switch (rolOption.trim()) {
        case '1':
          rol = 'admin';
          break;
        case '2':
          rol = 'ejecutivo';
          break;
        case '3':
          rol = 'cliente';
          break;
        default:
          log('❌ Opción inválida. Intenta de nuevo.', 'red');
          const reintentar = await question('\n¿Reintentar? (s/n): ');
          if (reintentar.toLowerCase() !== 's') {
            continuar = false;
          }
          continue;
      }

      // Email
      let email = await question('\n📧 Email: ');
      email = email.trim();
      if (!email || !email.includes('@')) {
        log('❌ Email inválido', 'red');
        const reintentar = await question('¿Reintentar? (s/n): ');
        if (reintentar.toLowerCase() !== 's') {
          continuar = false;
        }
        continue;
      }

      // Verificar si el usuario ya existe
      const userCheck = await checkUserExists(email);
      if (userCheck.exists && userCheck.inUsuarios) {
        log(`\n⚠️  El usuario con email ${email} ya existe`, 'yellow');
        log(`   - Nombre actual: ${userCheck.usuario?.nombre}`, 'blue');
        log(`   - Rol actual: ${userCheck.usuario?.rol}`, 'blue');
        if (userCheck.usuario?.auth_user_id) {
          log(`   - Auth User ID: ${userCheck.usuario.auth_user_id}`, 'blue');
        }
        log('\n💡 ¿Qué deseas hacer?', 'cyan');
        log('   1. Actualizar el usuario existente (cambiar rol, nombre, clientes, etc.)', 'blue');
        log('   2. Usar otro email para crear un nuevo usuario', 'blue');
        log('   3. Cancelar', 'blue');
        const opcion = await question('\nOpción (1-3): ');
        
        if (opcion.trim() === '1') {
          // Modo actualización - no necesita password
          log('\n📝 MODO ACTUALIZACIÓN', 'cyan');
          log('   (No se requiere contraseña para actualizar)', 'blue');
          
          // Nombre
          const nombreUpdate = await question('\n👤 Nombre completo (deja vacío para mantener actual): ');
          const nombreFinal = nombreUpdate.trim() || userCheck.usuario?.nombre || '';
          
          let clientesAsignadosUpdate = [];
          let clienteNombreUpdate = null;

          if (rol === 'ejecutivo') {
            // Mostrar lista de clientes
            const clientesList = await mostrarClientesList();
            log('\n📋 Selecciona los clientes asignados:', 'yellow');
            log('   - Puedes ingresar números separados por comas (ej: 1,3,5)', 'blue');
            log('   - O escribir los nombres exactos separados por comas', 'blue');
            log('   - Deja vacío para mantener los clientes actuales', 'blue');
            const clientesInput = await question('\nClientes: ');
            if (clientesInput && clientesInput.trim()) {
              clientesAsignadosUpdate = procesarSeleccionClientes(clientesInput, clientesList);
            } else {
              // Mantener clientes actuales si existen
              clientesAsignadosUpdate = userCheck.usuario?.clientes_asignados || [];
            }
          } else if (rol === 'cliente') {
            // Mostrar lista de clientes
            const clientesList = await mostrarClientesList();
            log('\n📋 Selecciona el cliente:', 'yellow');
            log('   - Ingresa el número del cliente (ej: 10)', 'blue');
            log('   - O escribe el nombre exacto del cliente', 'blue');
            log('   - Deja vacío para mantener el cliente actual', 'blue');
            const clienteInput = await question('\nCliente: ');
            
            if (clienteInput && clienteInput.trim()) {
              const seleccionados = procesarSeleccionClientes(clienteInput, clientesList);
              if (seleccionados.length > 0) {
                clienteNombreUpdate = seleccionados[0];
              }
            } else {
              clienteNombreUpdate = userCheck.usuario?.cliente_nombre || null;
            }
          }

          // Confirmar actualización
          log('\n' + '─'.repeat(60), 'cyan');
          log('📋 RESUMEN DE ACTUALIZACIÓN:', 'yellow');
          log(`   Email: ${email}`, 'blue');
          log(`   Nombre: ${nombreFinal}`, 'blue');
          log(`   Rol: ${rol}`, 'blue');
          if (rol === 'ejecutivo' && clientesAsignadosUpdate.length > 0) {
            log(`   Clientes: ${clientesAsignadosUpdate.join(', ')}`, 'blue');
          }
          if (rol === 'cliente' && clienteNombreUpdate) {
            log(`   Cliente: ${clienteNombreUpdate}`, 'blue');
          }
          log('─'.repeat(60), 'cyan');
          
          const confirmar = await question('\n¿Actualizar usuario con estos datos? (s/n): ');
          if (confirmar.toLowerCase() === 's') {
            const resultado = await updateUser(
              userCheck.usuario.id,
              rol,
              nombreFinal,
              clientesAsignadosUpdate,
              clienteNombreUpdate
            );
            
            if (resultado.success) {
              const otro = await question('\n¿Actualizar otro usuario? (s/n): ');
              if (otro.toLowerCase() !== 's') {
                continuar = false;
              }
            } else {
              const reintentar = await question('\n¿Reintentar? (s/n): ');
              if (reintentar.toLowerCase() !== 's') {
                continuar = false;
              }
            }
          } else {
            log('❌ Actualización cancelada', 'yellow');
            const otro = await question('\n¿Hacer otra operación? (s/n): ');
            if (otro.toLowerCase() !== 's') {
              continuar = false;
            }
          }
          continue;
        } else if (opcion.trim() === '2') {
          // Continuar con otro email
          continue;
        } else {
          // Cancelar
          continuar = false;
          continue;
        }
      } else if (userCheck.exists && !userCheck.inUsuarios) {
        // Existe en Auth pero no en usuarios - caso especial
        log(`\n⚠️  El usuario existe en Auth pero no en tabla usuarios`, 'yellow');
        log('   Continuando con la creación del registro en usuarios...', 'blue');
        // Continuar con el flujo normal de creación
      }

      // Nombre
      const nombre = await question('👤 Nombre completo: ');
      if (!nombre || nombre.trim().length < 2) {
        log('❌ Nombre inválido', 'red');
        const reintentar = await question('¿Reintentar? (s/n): ');
        if (reintentar.toLowerCase() !== 's') {
          continuar = false;
        }
        continue;
      }

      // Password
      let password = await question('🔐 Contraseña: ');
      if (!password || password.length < 6) {
        log('❌ La contraseña debe tener al menos 6 caracteres', 'red');
        const reintentar = await question('¿Reintentar? (s/n): ');
        if (reintentar.toLowerCase() !== 's') {
          continuar = false;
        }
        continue;
      }

      let clientesAsignados = [];
      let clienteNombre = null;

      if (rol === 'ejecutivo') {
        // Mostrar lista de clientes
        const clientesList = await mostrarClientesList();
        log('\n📋 Selecciona los clientes asignados:', 'yellow');
        log('   - Puedes ingresar números separados por comas (ej: 1,3,5)', 'blue');
        log('   - O escribir los nombres exactos separados por comas', 'blue');
        log('   - Deja vacío si no quieres asignar clientes ahora', 'blue');
        const clientesInput = await question('\nClientes: ');
        clientesAsignados = procesarSeleccionClientes(clientesInput, clientesList);
        
        if (clientesAsignados.length > 0) {
          log(`\n✅ Clientes seleccionados: ${clientesAsignados.join(', ')}`, 'green');
        } else {
          log('\n⚠️  No se asignaron clientes. El ejecutivo no verá ningún registro.', 'yellow');
        }
      } else if (rol === 'cliente') {
        // Mostrar lista de clientes
        const clientesList = await mostrarClientesList();
        log('\n📋 Selecciona el cliente:', 'yellow');
        log('   - Ingresa el número del cliente (ej: 10)', 'blue');
        log('   - O escribe el nombre exacto del cliente', 'blue');
        const clienteInput = await question('\nCliente: ');
        
        const seleccionados = procesarSeleccionClientes(clienteInput, clientesList);
        if (seleccionados.length > 0) {
          clienteNombre = seleccionados[0];
          log(`\n✅ Cliente seleccionado: ${clienteNombre}`, 'green');
        } else {
          log('❌ Cliente inválido', 'red');
          const reintentar = await question('¿Reintentar? (s/n): ');
          if (reintentar.toLowerCase() !== 's') {
            continuar = false;
          }
          continue;
        }
      }

      // Confirmar creación
      log('\n' + '─'.repeat(60), 'cyan');
      log('📋 RESUMEN:', 'yellow');
      log(`   Rol: ${rol}`, 'blue');
      log(`   Email: ${email}`, 'blue');
      log(`   Nombre: ${nombre.trim()}`, 'blue');
      if (rol === 'ejecutivo' && clientesAsignados.length > 0) {
        log(`   Clientes: ${clientesAsignados.join(', ')}`, 'blue');
      }
      if (rol === 'cliente' && clienteNombre) {
        log(`   Cliente: ${clienteNombre}`, 'blue');
      }
      log('─'.repeat(60), 'cyan');
      
      const confirmar = await question('\n¿Crear usuario con estos datos? (s/n): ');
      if (confirmar.toLowerCase() !== 's') {
        log('❌ Creación cancelada', 'yellow');
        const otro = await question('\n¿Crear otro usuario? (s/n): ');
        if (otro.toLowerCase() !== 's') {
          continuar = false;
        }
        continue;
      }

      // Crear usuario
      const resultado = await createUser(rol, email, nombre.trim(), password, clientesAsignados, clienteNombre);
      
      if (resultado.success) {
        const otro = await question('\n¿Crear otro usuario? (s/n): ');
        if (otro.toLowerCase() !== 's') {
          continuar = false;
        }
      } else {
        if (resultado.exists) {
          // Usuario ya existe, permitir reintentar
          const reintentar = await question('\n¿Intentar con otro email? (s/n): ');
          if (reintentar.toLowerCase() !== 's') {
            continuar = false;
          }
        } else {
          // Otro error
          const reintentar = await question('\n¿Reintentar? (s/n): ');
          if (reintentar.toLowerCase() !== 's') {
            continuar = false;
          }
        }
      }
    }

    rl.close();
  } catch (error) {
    log(`\n❌ Error: ${error.message}`, 'red');
    rl.close();
    process.exit(1);
  }
}

// Modo con argumentos
async function argumentMode() {
  const args = process.argv.slice(2);

  if (args.length < 4) {
    log('❌ Faltan argumentos', 'red');
    log('\nUso:', 'yellow');
    log('  node scripts/create-user.js <rol> <email> <nombre> <password> [clientes]', 'blue');
    log('\nEjemplos:', 'yellow');
    log('  # Crear admin:', 'blue');
    log('  node scripts/create-user.js admin rodrigo.caceres@asli.cl "Rodrigo Caceres" password123', 'cyan');
    log('\n  # Crear ejecutivo:', 'blue');
    log('  node scripts/create-user.js ejecutivo hans.vasquez@asli.cl "Hans Vasquez" password123 "EXPORTADORA DEL SUR (XSUR),EXPORTADORA SAN ANDRES"', 'cyan');
    log('\n  # Crear cliente:', 'blue');
    log('  node scripts/create-user.js cliente contacto@cliente.com "Contacto Cliente" password123 "EXPORTADORA SAN ANDRES"', 'cyan');
    log('\n  # Modo interactivo:', 'blue');
    log('  node scripts/create-user.js', 'cyan');
    process.exit(1);
  }

  const [rol, email, nombre, password, clientesInput] = args;

  if (!['admin', 'ejecutivo', 'cliente'].includes(rol)) {
    log(`❌ Rol inválido: ${rol}`, 'red');
    log('   Roles válidos: admin, ejecutivo, cliente', 'yellow');
    process.exit(1);
  }

  let clientesAsignados = [];
  let clienteNombre = null;

  if (rol === 'ejecutivo') {
    if (clientesInput) {
      clientesAsignados = clientesInput
        .split(',')
        .map((c) => c.trim())
        .filter((c) => c.length > 0);
    }
  } else if (rol === 'cliente') {
    if (clientesInput) {
      clienteNombre = clientesInput.trim();
    } else {
      log('❌ Para usuarios cliente, debes especificar el nombre del cliente', 'red');
      process.exit(1);
    }
  }

  await createUser(rol, email, nombre, password, clientesAsignados, clienteNombre);
}

// Ejecutar
(async () => {
  try {
    if (process.argv.length === 2) {
      // Modo interactivo
      await interactiveMode();
    } else {
      // Modo con argumentos
      await argumentMode();
    }
    process.exit(0);
  } catch (error) {
    log(`\n❌ Error: ${error.message}`, 'red');
    process.exit(1);
  }
})();
