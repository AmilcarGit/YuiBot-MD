// Lector mínimo de .env (sin dependencias): KEY=valor, comentarios con #, comillas opcionales.
// No pisa variables que ya existan en el entorno (lo que pongas al ejecutar manda sobre el archivo).
const fs = require('fs')
const path = require('path')

function leerEnv(texto) {
  const salida = {}
  for (const cruda of String(texto || '').split(/\r?\n/)) {
    const linea = cruda.trim()
    if (!linea || linea.startsWith('#')) continue
    const m = linea.match(/^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/)
    if (!m) continue
    let valor = m[2].trim()
    if ((valor.startsWith('"') && valor.endsWith('"')) || (valor.startsWith("'") && valor.endsWith("'"))) valor = valor.slice(1, -1)
    else valor = valor.replace(/\s+#.*$/, '') // comentario al final de la línea
    salida[m[1]] = valor
  }
  return salida
}

function cargarEnv(ruta = path.join(__dirname, '..', '.env'), destino = process.env) {
  let texto
  try { texto = fs.readFileSync(ruta, 'utf8') } catch { return {} }
  const valores = leerEnv(texto)
  for (const [k, v] of Object.entries(valores)) if (destino[k] === undefined) destino[k] = v
  return valores
}

module.exports = { leerEnv, cargarEnv }
