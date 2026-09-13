//CÓDIGO ORIGINAL DE YUIBOT-MD
// npm run check
// Valida la sintaxis (node --check) de todos los .js del proyecto:
// main.js, subbot.js, lib/*, modulos/** — sin necesidad de conectar a WhatsApp.
// Pensado para correr antes de cada despliegue / después de portar comandos.

const { execFileSync } = require('child_process')
const fs = require('fs')
const path = require('path')

const RAIZ = path.join(__dirname, '..')
const CARPETAS = ['lib', 'modulos']
const ARCHIVOS_RAIZ = ['main.js', 'subbot.js', 'defaults.js', 'crear-comando.js']

function listarJsRecursivo(dir) {
  const resultado = []
  if (!fs.existsSync(dir)) return resultado

  for (const entrada of fs.readdirSync(dir, { withFileTypes: true })) {
    const ruta = path.join(dir, entrada.name)
    if (entrada.isDirectory()) {
      resultado.push(...listarJsRecursivo(ruta))
    } else if (entrada.isFile() && entrada.name.endsWith('.js')) {
      resultado.push(ruta)
    }
  }

  return resultado
}

function main() {
  const archivos = [
    ...ARCHIVOS_RAIZ.map((nombre) => path.join(RAIZ, nombre)).filter(fs.existsSync),
    ...CARPETAS.flatMap((carpeta) => listarJsRecursivo(path.join(RAIZ, carpeta))),
  ]

  let fallos = 0

  for (const archivo of archivos) {
    try {
      execFileSync(process.execPath, ['--check', archivo], { stdio: 'pipe' })
    } catch (error) {
      fallos += 1
      const relativo = path.relative(RAIZ, archivo)
      console.error(`❌ Error de sintaxis en ${relativo}:`)
      console.error(String(error.stderr || error.message).trim())
      console.error('')
    }
  }

  console.log(`\n🔎 Chequeo de sintaxis: ${archivos.length} archivo(s) revisado(s), ${fallos} con error(es).`)

  if (fallos > 0) {
    process.exitCode = 1
  }
}

main()