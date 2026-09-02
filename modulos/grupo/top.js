//CÓDIGO ORIGINAL DE YUIBOT-MD
const { obtenerUsuario } = require('../../lib/db')

module.exports = {
  name: 'top',
  aliases: ['ranking', 'xptop'],
  description: 'Muestra el ranking de XP del grupo',
  category: 'grupo',

  async execute(sock, msg, args, { config }) {
    const jid = msg.key.remoteJid

    if (!jid.endsWith('@g.us')) {
      return sock.sendMessage(jid, { text: '❌ Este comando solo funciona dentro de un grupo.' }, { quoted: msg })
    }

    let metadata
    try {
      metadata = await sock.groupMetadata(jid)
    } catch (error) {
      console.error('[TOP] No se pudo obtener la metadata del grupo:', error)
      return sock.sendMessage(jid, { text: '⚠️ No se pudo leer la información del grupo.' }, { quoted: msg })
    }

    const filas = []

    for (const participante of metadata.participants) {
      try {
        const esObjeto = participante !== null && typeof participante === 'object'
        const jidOriginal = esObjeto ? (participante.id || participante.jid || participante.lid) : participante
        if (!jidOriginal) continue

        const jidReal = (esObjeto && participante.phoneNumber) || jidOriginal
        const numero = String(jidReal).split('@')[0].split(':')[0]

        const datos = obtenerUsuario(numero)
        if (!datos || !datos.xp) continue

        filas.push({ numero, jid: jidReal, xp: datos.xp, nivel: datos.nivel || 0 })
      } catch (error) {
        console.error('[TOP] Error procesando a un participante, se continúa:', error)
      }
    }

    if (!filas.length) {
      return sock.sendMessage(jid, { text: '📊 Todavía nadie tiene XP registrada en este grupo.' }, { quoted: msg })
    }

    filas.sort((a, b) => b.xp - a.xp)
    const top = filas.slice(0, 10)
    const medallas = ['🥇', '🥈', '🥉']
    const mentions = []

    let texto = `⛧───「 RANKING DE XP 」───⛧\n\n`
    top.forEach((fila, i) => {
      const posicion = medallas[i] || `${i + 1}.`
      texto += `${posicion} @${fila.numero} — nivel ${fila.nivel} (${fila.xp} XP)\n`
      mentions.push(fila.jid)
    })
    texto += `\n╰─➤ _${config.BOT_NAME}_ 🥀`

    await sock.sendMessage(jid, { text: texto, mentions }, { quoted: msg })
  },
}