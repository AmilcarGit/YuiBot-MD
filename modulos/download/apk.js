//CÓDIGO ORIGINAL DE YUIBOT-MD
const fetch = require('../../lib/http').fetchSeguro // timeout por defecto (ver lib/http.js)
const { APIS } = require('../../defaults')
const { caja, espera, uso, negrita } = require('../../lib/estilo')

const cortar = (t, n) => { const s = String(t ?? '').replace(/\s+/g, ' ').trim(); return s.length > n ? `${s.slice(0, n - 1)}…` : s }

const API_URL = 'https://api.mitzuki.xyz/search/aptoide'
const LIMITE = 5

function formatearTamano(bytes) {
  if (!bytes) return 'Desconocido'
  const mb = bytes / (1024 * 1024)
  return `${mb.toFixed(1)} MB`
}

module.exports = {
  name: 'apk',
  aliases: ['app', 'aptoide'],
  description: 'Busca aplicaciones Android en Aptoide',
  category: 'download',

  async execute(sock, msg, args, { config }) {
    const jid = msg.key.remoteJid
    const prefijo = config.PREFIXES[0]
    const query = args.join(' ').trim()

    if (!query) {
      return sock.sendMessage(
        jid,
        { text: uso(prefijo, 'apk', 'minecraft', 'Escribe qué app quieres buscar.') },
        { quoted: msg }
      )
    }

    try {
      const url = `${API_URL}?q=${encodeURIComponent(query)}&apikey=${encodeURIComponent(APIS.MITZUKI_KEY)}`
      const resp = await fetch(url)
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`)

      const data = await resp.json()

      if (!data?.status || !Array.isArray(data?.data?.items) || data.data.items.length === 0) {
        throw new Error(`No se encontraron apps para "${query}"`)
      }

      const items = data.data.items.slice(0, LIMITE)

      const filas = [['Búsqueda', cortar(query, 60), '🔍'], '┃']
      items.forEach((app, index) => {
        filas.push(
          `${index + 1}. *${cortar(app.name, 60)}*`,
          ['Desarrollador', cortar(app.developer, 40), '👤'],
          ['Versión', app.version, '🏷️'],
          ['Tamaño', formatearTamano(app.size), '💾'],
          ['Descargas', app.downloads?.toLocaleString('es') || 'Desconocidas', '📥'],
          ['Rating', app.rating !== undefined && app.rating !== null ? `⭐ ${app.rating}` : null, '⭐'],
          ['Seguridad', app.malware_rank, '🛡️'],
          '┃'
        )
      })
      const texto = caja('📦', 'Resultados APK', filas, `Responde con el número (1-${items.length}) para descargar`)

      await sock.sendMessage(jid, { text: texto }, { quoted: msg })

      const respuesta = await new Promise((resolve) => {
        const escuchar = (upsert) => {
          const nuevoMsg = upsert.messages?.[0]
          if (!nuevoMsg?.message) return
          const remitenteNuevo = nuevoMsg.key.participantAlt || nuevoMsg.key.participant || nuevoMsg.key.remoteJid
          const remitenteOriginal = msg.key.participantAlt || msg.key.participant || msg.key.remoteJid
          if (nuevoMsg.key.remoteJid !== jid || remitenteNuevo !== remitenteOriginal) return

          const texto = nuevoMsg.message.conversation || nuevoMsg.message.extendedTextMessage?.text || ''
          const numero = parseInt(texto.trim(), 10)
          if (numero >= 1 && numero <= items.length) {
            sock.ev.off('messages.upsert', escuchar)
            resolve(numero)
          }
        }
        sock.ev.on('messages.upsert', escuchar)
        setTimeout(() => {
          sock.ev.off('messages.upsert', escuchar)
          resolve(null)
        }, 60000)
      })

      if (!respuesta) return

      const elegida = items[respuesta - 1]

      await sock.sendMessage(jid, { text: espera(`Descargando ${elegida.name}...`) }, { quoted: msg })

      const respApk = await fetch(elegida.apk)
      if (!respApk.ok) throw new Error(`No se pudo descargar el APK (HTTP ${respApk.status})`)

      const buffer = Buffer.from(await respApk.arrayBuffer())

      await sock.sendMessage(
        jid,
        {
          document: buffer,
          mimetype: 'application/vnd.android.package-archive',
          fileName: `${elegida.name}.apk`,
          caption: caja('📦', 'APK', [
            ['App', cortar(elegida.name, 80)],
            ['Versión', elegida.version],
            ['Tamaño', formatearTamano(elegida.size)],
          ], 'Instálala bajo tu responsabilidad')
        },
        { quoted: msg }
      )
    } catch (error) {
      console.error('[APK]', error)
      await sock.sendMessage(
        jid,
        { text: `❌ No se pudo buscar o descargar la app.\n\n> ${error.message || 'Error desconocido'}` },
        { quoted: msg }
      )
    }
  },
}