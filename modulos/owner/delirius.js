// .delirius — prueba cualquier endpoint de la API de Delirius y muestra cómo responde (solo owners).
// Sirve para descubrir endpoints nuevos antes de convertirlos en comandos.
const delirius = require('../../lib/delirius')
const { caja } = require('../../lib/estilo')

const MAX_TEXTO = 3000

/** "q=hola mundo ; lang=es" → { q: 'hola mundo', lang: 'es' }. Si no hay "=", todo es el valor de `q`. */
function leerParametros(texto) {
  const t = String(texto || '').trim()
  if (!t) return {}
  if (!t.includes('=')) return { q: t }
  const salida = {}
  for (const trozo of t.split(';')) {
    const i = trozo.indexOf('=')
    if (i < 1) continue
    const k = trozo.slice(0, i).trim()
    if (/^[\w-]{1,30}$/.test(k)) salida[k] = trozo.slice(i + 1).trim()
  }
  return salida
}

/** Resumen de la forma de un JSON: tipos y claves, sin los valores largos. */
function forma(valor, profundidad = 0) {
  if (Array.isArray(valor)) return valor.length ? [`${valor.length} elemento(s)`, forma(valor[0], profundidad + 1)] : []
  if (valor && typeof valor === 'object') {
    if (profundidad >= 3) return '{…}'
    return Object.fromEntries(Object.entries(valor).slice(0, 25).map(([k, v]) => [k, forma(v, profundidad + 1)]))
  }
  if (typeof valor === 'string') return valor.length > 60 ? `string(${valor.length})` : valor
  return valor
}

module.exports = {
  name: 'delirius',
  aliases: ['apiprueba', 'endpoint'],
  description: 'Prueba un endpoint de Delirius: .delirius /search/lyrics q=monaco',
  category: 'owner',
  ownerOnly: true,

  leerParametros,
  forma,

  async execute(sock, msg, args, { config } = {}) {
    const jid = msg.key.remoteJid
    const P = config?.PREFIXES?.[0] || '.'
    const responder = (text) => sock.sendMessage(jid, { text }, { quoted: msg })
    const sub = String(args[0] || '').toLowerCase()
    if (sub === 'probar' || sub === 'fijar') {
      const clave = String(args[1] || '').toLowerCase()
      try {
        if (sub === 'probar') {
          const filas = await delirius.diagnosticar(clave, args.slice(2).join(' ') || undefined)
          return responder(caja('🩺', `Diagnóstico ${clave}`, filas.map((f) => `${f.http === 200 ? '✅' : f.http === 404 ? '▫️' : '⚠️'} ${f.http} ${f.ruta}\n   ${f.resumen}`),
            `✅ 200 = funciona · ⚠️ otro código = la ruta existe, falta ajustar · ▫️ 404 = no existe\nFijar: ${P}delirius fijar ${clave} /ruta parametro`))
        }
        delirius.fijarRuta(clave, args[2] || '', args[3])
        return responder(`✅ ${clave} ahora usa ${args[2]}${args[3] ? ` (parámetro ${args[3]})` : ''}.`)
      } catch (e) { return responder(`❌ ${e.message}`) }
    }
    const ruta = args[0]
    if (!ruta) return responder(caja('🧪', 'Probar Delirius', [
      `${P}delirius /ruta clave=valor ; otra=valor`,
      `${P}delirius /search/lyrics monaco`,
      `${P}delirius /search/spotify q=bad bunny`,
      `${P}delirius probar minecraftnews  (prueba todas las rutas)`,
      `${P}delirius fijar <clave> /ruta [parametro]`,
      null,
      'Sin "=" el texto se manda como q=…',
      `Agrega "forma" al final para ver solo la estructura.`,
    ], 'Copia lo que responde y pásalo para crear el comando'))

    let resto = args.slice(1)
    const soloForma = resto.at(-1)?.toLowerCase() === 'forma'
    if (soloForma) resto = resto.slice(0, -1)
    let r
    try { r = await delirius.explorar(ruta, leerParametros(resto.join(' '))) } catch (e) { return responder(`❌ ${e.message}`) }

    const cabecera = [['Ruta', ruta, '🔗'], ['HTTP', `${r.http} · ${r.ms} ms`, '📡'], ['Tipo', (r.tipo || '?').split(';')[0], '📄']]
    let cuerpo
    if (r.json !== null) cuerpo = JSON.stringify(soloForma ? forma(r.json) : r.json, null, 2)
    else cuerpo = r.texto.slice(0, MAX_TEXTO)
    const largo = cuerpo.length > MAX_TEXTO
    await responder(`${caja('🧪', 'Delirius', cabecera, largo ? 'Respuesta larga: te la mando en un archivo' : '')}\n\n${largo ? cuerpo.slice(0, 800) + '\n…' : cuerpo}`)
    if (largo) {
      await sock.sendMessage(jid, { document: Buffer.from(cuerpo, 'utf8'), mimetype: 'application/json', fileName: `delirius-${ruta.replace(/[^\w]+/g, '_')}.json` }, { quoted: msg })
    }
  },
}
