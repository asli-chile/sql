const fs = require('fs');
const path = require('path');

// Archivos a revisar
const filesToCheck = [
  'src/lib/port-coordinates.ts',
  'src/lib/country-coordinates.ts'
];

function findDuplicates(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  
  // Buscar todas las claves de objetos (líneas que empiezan con '  ' y tienen ':')
  const keys = [];
  const duplicates = [];
  const keyLines = new Map();
  
  lines.forEach((line, index) => {
    // Buscar patrones como: '  'KEY': value,
    const match = line.match(/^\s*['"]([^'"]+)['"]\s*:/);
    if (match) {
      const key = match[1];
      if (keys.includes(key)) {
        if (!duplicates.includes(key)) {
          duplicates.push(key);
        }
      } else {
        keys.push(key);
        keyLines.set(key, index + 1);
      }
    }
  });
  
  return {
    duplicates,
    keyLines,
    totalKeys: keys.length
  };
}

console.log('🔍 Buscando claves duplicadas en archivos...\n');

let hasErrors = false;

filesToCheck.forEach(filePath => {
  if (!fs.existsSync(filePath)) {
    console.log(`⚠️  Archivo no encontrado: ${filePath}`);
    return;
  }
  
  console.log(`\n📄 ${filePath}:`);
  const result = findDuplicates(filePath);
  
  if (result.duplicates.length > 0) {
    hasErrors = true;
    console.log(`  ❌ ERROR: ${result.duplicates.length} clave(s) duplicada(s) encontrada(s):`);
    result.duplicates.forEach(key => {
      const lines = [];
      const content = fs.readFileSync(filePath, 'utf8');
      const allLines = content.split('\n');
      allLines.forEach((line, index) => {
        const match = line.match(/^\s*['"]([^'"]+)['"]\s*:/);
        if (match && match[1] === key) {
          lines.push(index + 1);
        }
      });
      console.log(`    - "${key}" aparece en las líneas: ${lines.join(', ')}`);
    });
  } else {
    console.log(`  ✅ Sin duplicados (${result.totalKeys} claves únicas)`);
  }
});

console.log('\n' + '='.repeat(60));
if (hasErrors) {
  console.log('❌ Se encontraron errores de duplicados');
  process.exit(1);
} else {
  console.log('✅ No se encontraron duplicados');
  process.exit(0);
}

