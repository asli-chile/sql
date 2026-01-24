const fs = require('fs');

console.log('🔍 VERIFICANDO CONFIGURACIÓN MÓVIL DE SUPABASE\n');

console.log('📋 VERIFICACIONES:\n');

// 1. Verificar que existe el archivo de configuración móvil
console.log('1️⃣ Archivo supabase-mobile.ts:');
const mobileConfigPath = 'src/lib/supabase-mobile.ts';
if (fs.existsSync(mobileConfigPath)) {
    console.log('   ✅ Existe');
    const content = fs.readFileSync(mobileConfigPath, 'utf8');
    if (content.includes('supabaseUrl') && content.includes('supabaseAnonKey')) {
        console.log('   ✅ Contiene configuración de Supabase');
    } else {
        console.log('   ❌ Configuración incompleta');
    }
} else {
    console.log('   ❌ NO existe');
}

console.log('');

// 2. Verificar que los componentes usan la configuración móvil
console.log('2️⃣ Componentes actualizados:');

const componentsToCheck = [
    { file: 'src/components/modals/EditModal.tsx', name: 'EditModal' },
    { file: 'src/components/users/UserSelector.tsx', name: 'UserSelector' }
];

componentsToCheck.forEach(({ file, name }) => {
    if (fs.existsSync(file)) {
        const content = fs.readFileSync(file, 'utf8');
        if (content.includes('@/lib/supabase-mobile')) {
            console.log(`   ✅ ${name}: usa configuración móvil`);
        } else if (content.includes('@/lib/supabase')) {
            console.log(`   ❌ ${name}: aún usa configuración antigua`);
        } else {
            console.log(`   ⚠️  ${name}: no importa supabase`);
        }
    } else {
        console.log(`   ❌ ${file}: archivo no encontrado`);
    }
});

console.log('');

// 3. Verificar si hay APK generado recientemente
console.log('3️⃣ APK generado:');

const apkPath = 'android/app/build/outputs/apk/debug/app-debug.apk';
const asliApkPath = 'ASLI-Mobile.apk';

if (fs.existsSync(apkPath)) {
    const stats = fs.statSync(apkPath);
    const modifiedTime = new Date(stats.mtime);
    console.log(`   ✅ APK existe: ${modifiedTime.toLocaleString()}`);

    // Verificar si el APK es reciente (últimas 24 horas)
    const oneDayAgo = new Date();
    oneDayAgo.setDate(oneDayAgo.getDate() - 1);
    if (modifiedTime > oneDayAgo) {
        console.log('   ✅ APK generado recientemente');
    } else {
        console.log('   ⚠️  APK es antiguo, considera regenerarlo');
    }
} else {
    console.log('   ❌ APK no encontrado');
}

if (fs.existsSync(asliApkPath)) {
    const stats = fs.statSync(asliApkPath);
    const modifiedTime = new Date(stats.mtime);
    console.log(`   ✅ APK copiado: ${modifiedTime.toLocaleString()}`);
} else {
    console.log('   ⚠️  APK no copiado a raíz del proyecto');
}

console.log('');
console.log('🎯 DIAGNÓSTICO:');

if (fs.existsSync(mobileConfigPath) &&
    componentsToCheck.every(({ file }) => {
        if (fs.existsSync(file)) {
            const content = fs.readFileSync(file, 'utf8');
            return content.includes('@/lib/supabase-mobile');
        }
        return false;
    })) {
    console.log('   ✅ Configuración móvil correcta');
} else {
    console.log('   ❌ Configuración móvil incompleta');
}

console.log('');
console.log('💡 SI SIGUE EL ERROR:');
console.log('   1. npm run rebuild-mobile (reconstruir app)');
console.log('   2. En Android Studio: Build > Build APK(s)');
console.log('   3. npm run copy-apk');
console.log('   4. Instalar nuevo APK y probar');
console.log('');
console.log('🚨 IMPORTANTE: Asegúrate de usar el APK MÁS RECIENTE');
console.log('   Los cambios solo aplican al APK generado después de nuestras modificaciones.');