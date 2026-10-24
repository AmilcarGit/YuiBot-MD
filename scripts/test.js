// npm test
// Ejecuta cada archivo de tests/*.test.js con el runner nativo de Node
// (node:test), UNO POR UNO. No se paralelizan a propósito: varias pruebas
// comparten la carpeta data/ y se pisarían entre sí.
// No necesita instalar dependencias (usa solo lo que trae Node).

const fs = require('fs')
const path = require('path')
const { spawnSync } = require('child_process')

const RAIZ = path.join(__dirname, '..')
const CARPETA_TESTS = path.join(RAIZ, 'tests')

const archivos = fs
  .readdirSync(CARPETA_TESTS)
  .filter((nombre) => nombre.endsWith('.test.js'))
  .sort()

if (!archivos.length) {
  console.error('❌ No se encontraron archivos tests/*.test.js')
  process.exit(1)
}

const fallidos = []

for (const archivo of archivos) {
  console.log(`\n━━━ ${archivo} ━━━`)
  const resultado = spawnSync(process.execPath, ['--test', path.join('tests', archivo)], {
    cwd: RAIZ,
    stdio: 'inherit',
  })
  if (resultado.status !== 0) fallidos.push(archivo)
}

console.log('\n' + '─'.repeat(50))
if (fallidos.length) {
  console.error(`❌ Fallaron ${fallidos.length} de ${archivos.length} archivo(s) de pruebas: ${fallidos.join(', ')}`)
  process.exit(1)
}
console.log(`✅ ${archivos.length} archivo(s) de pruebas OK`)
