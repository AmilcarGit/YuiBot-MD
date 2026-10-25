// Texto a voz gratis y sin API key.
//  • Voces con nombre (Polly): StreamElements. Si falla, Google en el idioma de la voz.
//  • Idiomas (es, en, pt...): Google Translate TTS, troceando el texto.
const { fetchSeguro } = require('./http')
const { reintentar } = require('./reintentar')

const MAX_TEXTO = 600
const TROZO_GOOGLE = 180

const VOCES = {
  conchita: { nombre: 'Conchita', lang: 'es', pais: '🇪🇸', genero: 'mujer' },
  lucia: { nombre: 'Lucia', lang: 'es', pais: '🇪🇸', genero: 'mujer' },
  enrique: { nombre: 'Enrique', lang: 'es', pais: '🇪🇸', genero: 'hombre' },
  mia: { nombre: 'Mia', lang: 'es', pais: '🇲🇽', genero: 'mujer' },
  lupe: { nombre: 'Lupe', lang: 'es', pais: '🇺🇸', genero: 'mujer' },
  penelope: { nombre: 'Penelope', lang: 'es', pais: '🇺🇸', genero: 'mujer' },
  miguel: { nombre: 'Miguel', lang: 'es', pais: '🇺🇸', genero: 'hombre' },
  joanna: { nombre: 'Joanna', lang: 'en', pais: '🇺🇸', genero: 'mujer' },
  matthew: { nombre: 'Matthew', lang: 'en', pais: '🇺🇸', genero: 'hombre' },
  amy: { nombre: 'Amy', lang: 'en', pais: '🇬🇧', genero: 'mujer' },
  brian: { nombre: 'Brian', lang: 'en', pais: '🇬🇧', genero: 'hombre' },
}

const IDIOMAS = {
  es: 'Español', en: 'Inglés', pt: 'Portugués', fr: 'Francés', it: 'Italiano', de: 'Alemán',
  ja: 'Japonés', ko: 'Coreano', ru: 'Ruso', ar: 'Árabe', hi: 'Hindi', tr: 'Turco',
}

const VOZ_DEFECTO = 'es' // idioma de Google si no se indica nada

// Parte el texto en trozos de hasta `max` caracteres sin cortar palabras.
function trocear(texto, max = TROZO_GOOGLE) {
  const limpio = String(texto).replace(/\s+/g, ' ').trim()
  const trozos = []
  let actual = ''
  const palabras = limpio.split(' ')
  for (let palabra of palabras) {
    while (palabra.length > max) { // palabra gigante: se corta a la fuerza
      if (actual) { trozos.push(actual); actual = '' }
      trozos.push(palabra.slice(0, max))
      palabra = palabra.slice(max)
    }
    if (!actual) actual = palabra
    else if ((actual + ' ' + palabra).length <= max) actual += ' ' + palabra
    else { trozos.push(actual); actual = palabra }
  }
  if (actual) trozos.push(actual)
  return trozos
}

async function descargar(url) {
  return reintentar(async () => {
    const resp = await fetchSeguro(url, { headers: { 'User-Agent': 'Mozilla/5.0' } })
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`)
    const buf = Buffer.from(await resp.arrayBuffer())
    if (buf.length < 200) throw new Error('audio vacío')
    return buf
  }, { intentos: 2, esperaMs: 800 })
}

async function conGoogle(texto, lang) {
  const buffers = []
  for (const trozo of trocear(texto)) {
    const url = `https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=${encodeURIComponent(lang)}&q=${encodeURIComponent(trozo)}`
    buffers.push(await descargar(url))
  }
  return Buffer.concat(buffers)
}

async function conStreamElements(texto, voz) {
  const url = `https://api.streamelements.com/kappa/v2/speech?voice=${encodeURIComponent(voz.nombre)}&text=${encodeURIComponent(texto)}`
  return descargar(url)
}

/**
 * @param {string} texto
 * @param {string} seleccion clave de voz (lupe) o idioma (es)
 * @returns {{buffer, fuente, etiqueta}}
 */
async function generar(texto, seleccion = VOZ_DEFECTO) {
  const limpio = String(texto || '').trim()
  if (!limpio) throw new Error('Falta el texto.')
  if (limpio.length > MAX_TEXTO) throw new Error(`El texto es muy largo (máximo ${MAX_TEXTO} caracteres).`)

  const voz = VOCES[seleccion]
  if (voz) {
    try {
      return { buffer: await conStreamElements(limpio, voz), fuente: 'streamelements', etiqueta: voz.nombre }
    } catch (error) {
      console.error('[TTS] StreamElements falló, uso Google:', error.message)
      return { buffer: await conGoogle(limpio, voz.lang), fuente: 'google', etiqueta: IDIOMAS[voz.lang] }
    }
  }
  if (IDIOMAS[seleccion]) {
    return { buffer: await conGoogle(limpio, seleccion), fuente: 'google', etiqueta: IDIOMAS[seleccion] }
  }
  throw new Error('Voz o idioma no válido.')
}

const esSeleccion = (clave) => Boolean(VOCES[clave] || IDIOMAS[clave])

module.exports = { generar, trocear, esSeleccion, VOCES, IDIOMAS, MAX_TEXTO, VOZ_DEFECTO }
