const E = require('../../lib/estilo')
const fetch = require('../../lib/http').fetchSeguro
const publicas = require('../../lib/publicas')

module.exports = {
  name: 'pais',
  aliases: ['país', 'country'],
  description: 'Datos de un país: .pais Perú',
  category: 'utilidad',

  async execute(sock, msg, args, { config }) {
    const jid = msg.key.remoteJid
    const consulta = args.join(' ').trim()
    if (!consulta) {
      return sock.sendMessage(jid, { text: `❌ Escribe el nombre de un país.\n\n📌 Ejemplo: ${config.PREFIXES[0]}pais Perú` }, { quoted: msg })
    }

    try {
      const p = await publicas.pais(consulta)
      const caption = E.caja('🌍', p.nombre, [
        ['Nombre oficial', p.oficial, '📜'],
        ['Capital', p.capital || '—', '🏛️'],
        ['Población', p.poblacion.toLocaleString('es-PE'), '👥'],
        ['Región', `${p.region}${p.area ? ` · ${p.area.toLocaleString('es-PE')} km²` : ''}`, '🗺️'],
        ['Monedas', p.monedas.join(', ') || '—', '💰'],
        ['Idiomas', p.idiomas.join(', ') || '—', '🗣️'],
      ], 'YuiBot-MD')

      if (p.bandera) {
        const img = await fetch(p.bandera)
        if (img.ok) return sock.sendMessage(jid, { image: Buffer.from(await img.arrayBuffer()), caption }, { quoted: msg })
      }
      await sock.sendMessage(jid, { text: caption }, { quoted: msg })
    } catch (error) {
      const texto = error.noEncontrado ? `❌ No encontré el país "${consulta}".` : `❌ No se pudo consultar el país.\n\n> ${error.message}`
      await sock.sendMessage(jid, { text: texto }, { quoted: msg })
    }
  },
}
