const fs = require('fs');
const path = require('path');

console.log('🔄 CAMBIANDO A GRADLE 8.4 (VERSIÓN MÁS ESTABLE)...\n');

const wrapperPropsPath = path.join(__dirname, '..', 'android', 'gradle', 'wrapper', 'gradle-wrapper.properties');

// Cambiar a Gradle 8.4 que es más estable
const newContent = `distributionBase=GRADLE_USER_HOME
distributionPath=wrapper/dists
distributionUrl=https\\://services.gradle.org/distributions/gradle-8.4-bin.zip
networkTimeout=300000
validateDistributionUrl=true
zipStoreBase=GRADLE_USER_HOME
zipStorePath=wrapper/dists`;

fs.writeFileSync(wrapperPropsPath, newContent);

console.log('✅ Gradle cambiado a versión 8.4 (más estable)');

console.log('\n🎯 AHORA REPITE LOS PASOS:');
console.log('1. File > Invalidate Caches / Restart');
console.log('2. Espera descarga de Gradle 8.4');
console.log('3. Build > Build APK(s)');

console.log('\n💡 Gradle 8.4 es más probado que 8.5');
console.log('   Debería funcionar mejor con Java 21\n');

console.log('🚀 ¡Inténtalo ahora con Gradle 8.4!');