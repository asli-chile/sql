// scripts/extract-container-prefixes.js
// Script para extraer los prefijos únicos de contenedores del archivo de texto

const fs = require('fs');
const path = require('path');

// Leer el archivo de contenedores
const filePath = path.join(__dirname, '../public/sufijo contenedores.txt');
const content = fs.readFileSync(filePath, 'utf8');

// Dividir por líneas y procesar
const lines = content.split('\n');
const prefixes = new Set();

console.log('Procesando contenedores...');
console.log(`Total de líneas: ${lines.length}`);

lines.forEach((line, index) => {
  const trimmedLine = line.trim();
  
  // Saltar líneas vacías, headers y valores como "CANCELADO"
  if (!trimmedLine || 
      trimmedLine === 'CONTENEDOR' || 
      trimmedLine === 'CANCELADO' ||
      trimmedLine.startsWith('"') ||
      /^\d+\s*-\s*\d+\s*\d+$/.test(trimmedLine)) { // Saltar formatos como "057 - 1348 8064"
    return;
  }
  
  // Extraer prefijo de 4 letras
  const match = trimmedLine.match(/^([A-Z]{4})/);
  if (match) {
    const prefix = match[1];
    prefixes.add(prefix);
    console.log(`Línea ${index + 1}: ${trimmedLine} -> Prefijo: ${prefix}`);
  } else {
    console.log(`Línea ${index + 1}: ${trimmedLine} -> Sin prefijo válido`);
  }
});

// Convertir Set a Array y ordenar
const uniquePrefixes = Array.from(prefixes).sort();

console.log('\nRESULTADOS:');
console.log(`Total de prefijos unicos encontrados: ${uniquePrefixes.length}`);
console.log('\nLISTA DE PREFIJOS UNICOS:');
uniquePrefixes.forEach((prefix, index) => {
  console.log(`${index + 1}. ${prefix}`);
});

// Crear archivo SQL para insertar en la base de datos
const sqlContent = `-- scripts/insert-container-prefixes.sql
-- Script para insertar los prefijos de contenedores en la base de datos

-- Crear tabla si no existe
CREATE TABLE IF NOT EXISTS container_prefixes (
  id SERIAL PRIMARY KEY,
  prefix VARCHAR(4) NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Insertar prefijos únicos
INSERT INTO container_prefixes (prefix) VALUES
${uniquePrefixes.map(prefix => `('${prefix}')`).join(',\n')}
ON CONFLICT (prefix) DO NOTHING;

-- Verificar inserción
SELECT COUNT(*) as total_prefixes FROM container_prefixes;
SELECT * FROM container_prefixes ORDER BY prefix;
`;

// Guardar archivo SQL
const sqlFilePath = path.join(__dirname, 'insert-container-prefixes.sql');
fs.writeFileSync(sqlFilePath, sqlContent);

console.log(`\nArchivo SQL creado: ${sqlFilePath}`);

// Crear archivo JSON para uso en la aplicacion
const jsonContent = {
  prefixes: uniquePrefixes,
  total: uniquePrefixes.length,
  generated_at: new Date().toISOString(),
  description: "Lista de prefijos unicos de contenedores extraidos del archivo de datos"
};

const jsonFilePath = path.join(__dirname, '../src/data/container-prefixes.json');
fs.mkdirSync(path.dirname(jsonFilePath), { recursive: true });
fs.writeFileSync(jsonFilePath, JSON.stringify(jsonContent, null, 2));

console.log(`Archivo JSON creado: ${jsonFilePath}`);

console.log('\nProceso completado exitosamente!');
