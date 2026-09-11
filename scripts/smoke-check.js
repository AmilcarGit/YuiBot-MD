//CÓDIGO ORIGINAL DE YUIBOT-MD
// npm run smoke
// Arranque "headless": carga todos los módulos de comandos (sin conectar
// a WhatsApp) y valida que:
//   1) cada módulo tenga { name, execute } válidos (igual que hace cargador.js)
//   2) ningún name/alias esté duplicado entre dos módulos distintos
//      (si pasa, el segundo pisa silenciosamente al primero al cargar)
// Pensado para correr después de portar/agregar comandos, antes de reiniciar
// el bot en producción.

const fs = require('fs')
const path = require('path')

const RAIZ = path.join(__dirname, '..')
const MODULOS_PATH = path.join(RAIZ, 'modulos')

function listarJsRecursivo(dir) {
  const resultado = []
  for (const entrada of fs.readdirSync(dir, { withFileTypes: true })) {
    const ruta = path.join(dir, entrada.name)
    if (entrada.isDirectory()) resultado.push(...listarJsRecursivo(ruta))
    else if (entrada.isFile() && entrada.name.endsWith('.js')) resultado.push(ruta)
  }
  return resultado
}

function main() {
  let huboError = false

  // 1) defaults.js y config/ia.json deben poder cargar sin explotar.
  try {
    require(path.join(RAIZ, 'defaults.js'))
    require(path.join(RAIZ, 'config', 'ia.json'))
  } catch (error) {
    console.error('❌ No se pudo cargar defaults.js / config/ia.json:', error.message)
    process.exitCode = 1
    return
  }

  const archivos = listarJsRecursivo(MODULOS_PATH)
  const registro = new Map() // clave (name/alias) -> archivo que la registró primero
  let modulosValidos = 0
  let modulosInvalidos = 0
  const colisiones = []

  for (const archivo of archivos) {
    const relativo = path.relative(RAIZ, archivo)

    let mod
    try {
      delete require.cache[require.resolve(archivo)]
      mod = require(archivo)
    } catch (error) {
      modulosInvalidos += 1
      huboError = true
      console.error(`❌ Error al requerir ${relativo}:`, error.message)
      continue
    }

    if (!mod?.name || typeof mod.execute !== 'function') {
      modulosInvalidos += 1
      huboError = true
      console.error(`❌ Módulo inválido en ${relativo}: falta "name" o "execute" no es función.`)
      continue
    }

    modulosValidos += 1

    const claves = [mod.name, ...(Array.isArray(mod.aliases) ? mod.aliases : [])]
      .map((valor) => String(valor || '').trim().toLowerCase())
      .filter(Boolean)

    for (const clave of claves) {
      if (registro.has(clave) && registro.get(clave) !== relativo) {
        colisiones.push({ clave, primero: registro.get(clave), segundo: relativo })
      } else {
        registro.set(clave, relativo)
      }
    }
  }

  console.log(`\n📦 Módulos revisados: ${archivos.length} | válidos: ${modulosValidos} | inválidos: ${modulosInvalidos}`)

  if (colisiones.length) {
    huboError = true
    console.error(`\n⚠️  ${colisiones.length} colisión(es) de nombre/alias detectada(s):`)
    for (const c of colisiones) {
      console.error(`   "${c.clave}" está en ${c.primero} y también en ${c.segundo} (el segundo pisa al primero al cargar).`)
    }
  } else {
    console.log('✅ Sin colisiones de nombre/alias entre comandos.')
  }

  if (huboError) {
    console.error('\n❌ Smoke test FALLÓ. Revisa los errores de arriba antes de desplegar.')
    process.exitCode = 1
  } else {
    console.log('\n✅ Smoke test OK. Todos los módulos cargan y no hay colisiones.')
  }
}

main()