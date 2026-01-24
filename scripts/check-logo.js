const fs = require('fs');
const path = require('path');

console.log('🔍 Verificando el logo de ASLI...\n');

const logoPath = path.join(__dirname, '..', 'public', 'LOGO ASLI SIN FONDO AZUL.png');

if (!fs.existsSync(logoPath)) {
    console.error('❌ No se encontró el logo en:', logoPath);
    process.exit(1);
}

const stats = fs.statSync(logoPath);

// Leer los primeros bytes para verificar el formato
const buffer = fs.readFileSync(logoPath);
const header = buffer.slice(0, 16).toString('hex').toUpperCase();

console.log('✅ Logo encontrado!');
console.log(`📁 Ubicación: ${logoPath}`);
console.log(`📏 Tamaño: ${(stats.size / 1024).toFixed(2)} KB`);
console.log(`📅 Modificado: ${stats.mtime.toISOString()}`);

// Verificar formato basado en el header
let format = 'Desconocido';
if (header.startsWith('89504E47')) {
    format = 'PNG';
} else if (header.startsWith('FFD8FF')) {
    format = 'JPEG';
} else if (header.startsWith('47494638')) {
    format = 'GIF';
}

console.log(`🎨 Formato detectado: ${format}`);

// Verificar si tiene transparencia (para PNG)
if (format === 'PNG') {
    // Buscar chunk IHDR
    const ihdrIndex = buffer.indexOf('IHDR');
    if (ihdrIndex !== -1) {
        const width = buffer.readUInt32BE(ihdrIndex + 4);
        const height = buffer.readUInt32BE(ihdrIndex + 8);
        const bitDepth = buffer.readUInt8(ihdrIndex + 12);
        const colorType = buffer.readUInt8(ihdrIndex + 13);

        console.log(`📐 Dimensiones: ${width}x${height}`);
        console.log(`🎯 Profundidad de bits: ${bitDepth}`);

        // Color type: 0=grayscale, 2=color, 3=indexed, 4=grayscale+alpha, 6=color+alpha
        const hasAlpha = colorType === 4 || colorType === 6;
        console.log(`🟦 Transparencia: ${hasAlpha ? 'SÍ' : 'NO'}`);
        console.log(`🎨 Tipo de color: ${colorType === 0 ? 'Escala de grises' : colorType === 2 ? 'Color' : colorType === 3 ? 'Indexado' : colorType === 4 ? 'Escala de grises + Alpha' : colorType === 6 ? 'Color + Alpha' : 'Desconocido'}`);
    }
}

console.log('\n🔧 Verificando íconos generados...');

// Verificar si los íconos existen y su tamaño
const iconSizes = ['mdpi', 'hdpi', 'xhdpi', 'xxhdpi', 'xxxhdpi'];
let iconsFound = 0;

iconSizes.forEach(size => {
    const iconPath = path.join(__dirname, '..', 'android', 'app', 'src', 'main', 'res', `mipmap-${size}`, 'ic_launcher.png');
    if (fs.existsSync(iconPath)) {
        const iconStats = fs.statSync(iconPath);
        console.log(`✅ ${size}: ${(iconStats.size / 1024).toFixed(2)} KB`);
        iconsFound++;
    } else {
        console.log(`❌ ${size}: No encontrado`);
    }
});

console.log(`\n📊 Resumen: ${iconsFound}/${iconSizes.length} íconos generados`);

if (iconsFound === 0) {
    console.log('\n⚠️  No se encontraron íconos. Ejecuta: npm run fix-icons');
} else if (iconsFound < iconSizes.length) {
    console.log('\n⚠️  Faltan algunos íconos. Ejecuta: npm run fix-icons');
} else {
    console.log('\n✅ Todos los íconos están presentes.');
}