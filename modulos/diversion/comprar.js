//CÓDIGO ORIGINAL DE YUIBOT-MD
const { obtenerItem } = require('../../lib/tienda')
const { comprarItem } = require('../../lib/db')

module.exports = {
  name: 'comprar',
  aliases: ['buy'],
  description: 'Compra un objeto de la tienda por su número',
  category: 'diversion',

  async execute(sock, msg, args, { config }) {
    const jid = msg.key.remoteJid
    const prefijo = config.PREFIXES[0]
    const remitente = msg.key.participantAlt || msg.key.participant || jid
    const numero = remitente.split('@')[0].split(':')[0]

    const id = parseInt(args[0], 10)
    const item = obtenerItem(id)

    if (!item) {
      return sock.sendMessage(
        jid,
        { text: `❌ Ese objeto no existe.\n📌 Usa ${prefijo}tienda para ver los disponibles.` },
        { quoted: msg }
      )
    }

    const resultado = comprarItem(numero, item)

    if (!resultado.exito) {
      if (resultado.motivo === 'saldo') {
        return sock.sendMessage(jid, { text: `❌ No tienes suficientes monedas para *${item.nombre}* (${item.precio} monedas).` }, { quoted: msg })
      }
      if (resultado.motivo === 'ya_tiene') {
        return sock.sendMessage(jid, { text: `❌ Ya tienes *${item.nombre}* en tu inventario.` }, { quoted: msg })
      }
      return sock.sendMessage(jid, { text: '❌ No se pudo completar la compra.' }, { quoted: msg })
    }

    let texto = `✅ ¡Compraste *${item.nombre}*!\n`

    if (item.tipo === 'insignia' || item.tipo === 'color' || item.tipo === 'titulo') {
      texto += `\n📌 Usa ${prefijo}equipar ${item.id} para activarlo en tu perfil.`
    }

    if (item.tipo === 'boost') {
      const horas = Math.round(item.valor.duracionMs / 3600000)
      texto += `\n⚡ Activo por las próximas ${horas}h. Ya se aplica automáticamente.`
    }

    if (item.tipo === 'proteccion') {
      texto += `\n🛡️ Protección antiflood activa por 24 horas.`
    }

    if (item.tipo === 'cofre') {
      texto += `\n🎁 ¡Encontraste ${resultado.ganado} monedas extra dentro del cofre!`
    }

    await sock.sendMessage(jid, { text: texto }, { quoted: msg })
  },
}