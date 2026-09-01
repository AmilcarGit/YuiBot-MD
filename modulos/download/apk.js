//CÓDIGO ORIGINAL DE YUIBOT-MD
const { APIS } = require('../../defaults')

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
        { text: `❌ Escribe qué app quieres buscar.\n📌 Ejemplo: ${prefijo}apk minecraft` },
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

      let texto = `⛧───「 Resultados: ${query} 」───⛧\n\n`
      items.forEach((app, index) => {
        texto += `${index + 1}. *${app.name}*\n`
        texto += `   ❖ desarrollador: ${app.developer}\n`
        texto += `   ❖ versión: ${app.version}\n`
        texto += `   ❖ tamaño: ${formatearTamano(app.size)}\n`
        texto += `   ❖ descargas: ${app.downloads?.toLocaleString('es') || 'Desconocidas'}\n`
        texto += `   ❖ rating: ⭐ ${app.rating}\n`
        texto += `   ❖ seguridad: ${app.malware_rank}\n\n`
      })
      texto += `╰─➤ _Responde con el número (1-${items.length}) para descargar_ 🥀`

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

      await sock.sendMessage(jid, { text: `⏳ Descargando ${elegida.name}...` }, { quoted: msg })

      const respApk = await fetch(elegida.apk)
      if (!respApk.ok) throw new Error(`No se pudo descargar el APK (HTTP ${respApk.status})`)

      const buffer = Buffer.from(await respApk.arrayBuffer())

      await sock.sendMessage(
        jid,
        {
          document: buffer,
          mimetype: 'application/vnd.android.package-archive',
          fileName: `${elegida.name}.apk`,
          caption: `📦 ${elegida.name}\n📌 v${elegida.version} — ${formatearTamano(elegida.size)}`
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