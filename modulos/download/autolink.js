// .autolink — cuando alguien pega un enlace descargable, el bot ofrece botones "Video / Audio".
const path = require('path')
const { crearAlmacenCacheado } = require('../../lib/escrituraAtomica')
const { esAdminDeGrupo } = require('../../lib/moderacion')
const dw = require('../../lib/descargaWeb')
const { enviarConRespaldo } = require('../../lib/whatsapp/interactivos')
const { caja } = require('../../lib/estilo')

const almacen = crearAlmacenCacheado(path.join(__dirname, '..', '..', 'data', 'autolink.json'), () => ({ chats: {} }))
const recientes = new Map() // `${jid}|${url}` → hora (evita repetir el aviso del mismo enlace)
const COOLDOWN_MS = 60 * 1000

const activo = (jid) => Boolean(almacen.leer().chats?.[jid])
function poner(jid, valor) {
  const datos = almacen.leer()
  datos.chats = datos.chats || {}
  if (valor) datos.chats[jid] = true; else delete datos.chats[jid]
  almacen.guardar(datos)
}

// Sitios de los que NO se ofrece audio aparte (ya son música o archivos)
const SIN_AUDIO = new Set(['spotify', 'soundcloud', 'mediafire', 'gdrive', 'mega', 'github', 'pinterest'])

module.exports = {
  name: 'autolink',
  aliases: ['enlaceauto', 'autodl'],
  description: 'Activa botones de descarga cuando alguien pega un enlace (admins en grupos): .autolink on/off',
  category: 'download',

  async execute(sock, msg, args, { config }) {
    const jid = msg.key.remoteJid
    const P = config.PREFIXES[0]
    if (jid.endsWith('@g.us')) {
      let meta
      try { meta = await sock.groupMetadata(jid) } catch { return sock.sendMessage(jid, { text: '❌ No pude leer la información del grupo.' }, { quoted: msg }) }
      const numero = (msg.key.participantAlt || msg.key.participant || '').split('@')[0].split(':')[0]
      if (!esAdminDeGrupo(meta, numero) && !config.OWNERS.some((o) => o.numero === numero)) {
        return sock.sendMessage(jid, { text: '⛔ Solo los administradores pueden cambiar esto.' }, { quoted: msg })
      }
    }
    const a = (args[0] || '').toLowerCase()
    if (['on', 'activar'].includes(a)) { poner(jid, true); return sock.sendMessage(jid, { text: `🔗 *Autolink* activado.\nCuando alguien pegue un enlace de TikTok, YouTube, X, Instagram, Reddit y más, mostraré botones para bajarlo.` }, { quoted: msg }) }
    if (['off', 'desactivar'].includes(a)) { poner(jid, false); return sock.sendMessage(jid, { text: '🔗 *Autolink* desactivado.' }, { quoted: msg }) }
    return sock.sendMessage(jid, { text: `🔗 *AUTOLINK*\n\nEstado: *${activo(jid) ? 'ON ✅' : 'OFF ❌'}*\n\n${P}autolink on\n${P}autolink off` }, { quoted: msg })
  },

  async onMessage(sock, msg, ctx) {
    const { jid, body, config } = ctx
    if (msg.key.fromMe || !body || !activo(jid)) return
    if (config.PREFIXES.some((p) => body.trim().startsWith(p))) return // ya es un comando (incluye los botones)
    const url = dw.extraerUrl(body)
    const sitio = url && dw.detectarSitio(url)
    if (!sitio) return
    const clave = `${jid}|${url}`
    const ahora = Date.now()
    if (recientes.get(clave) > ahora - COOLDOWN_MS) return
    recientes.set(clave, ahora)
    if (recientes.size > 200) recientes.delete(recientes.keys().next().value)

    const P = config.PREFIXES[0]
    const botones = [{ text: sitio.soloComando || ['mediafire', 'gdrive', 'mega', 'github'].includes(sitio.clave) ? '📥 Descargar' : '🎬 Video', id: `${P}dl ${url}` }]
    if (!SIN_AUDIO.has(sitio.clave)) botones.push({ text: '🎵 Solo audio', id: `${P}dl ${url} audio` })
    const texto = caja(sitio.emoji, `Enlace de ${sitio.nombre}`, ['¿Quieres descargarlo?'], 'Toca un botón')
    await enviarConRespaldo(sock, jid, [
      ['botones', { text: texto, footer: config.BOT_NAME || 'YuiBot-MD', buttons: botones }],
    ], { quoted: msg }, 'AUTOLINK').catch(() => {}) // si WhatsApp rechaza los botones, mejor callar que spamear
  },
}
