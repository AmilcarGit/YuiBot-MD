//CÓDIGO ORIGINAL DE YUIBOT-MD
const { CATALOGO } = require('../../lib/tienda')

const POR_PAGINA = 10
const NOMBRES_TIPO = {
  insignia: '🏅 Insignia',
  color: '🎨 Color de barra',
  titulo: '📛 Título',
  boost: '⚡ Boost',
  proteccion: '🛡️ Protección',
  cofre: '🎁 Cofre',
}

module.exports = {
  name: 'tienda',
  aliases: ['shop', 'store'],
  description: 'Muestra la tienda de objetos (usa !tienda 2 para la página 2)',
  category: 'diversion',

  async execute(sock, msg, args, { config }) {
    const jid = msg.key.remoteJid
    const totalPaginas = Math.ceil(CATALOGO.length / POR_PAGINA)
    let pagina = parseInt(args[0], 10) || 1
    if (pagina < 1) pagina = 1
    if (pagina > totalPaginas) pagina = totalPaginas

    const inicio = (pagina - 1) * POR_PAGINA
    const items = CATALOGO.slice(inicio, inicio + POR_PAGINA)

    let texto = `🛒 *TIENDA DE ${config.BOT_NAME.toUpperCase()}*\n`
    texto += `Página ${pagina}/${totalPaginas}\n\n`

    for (const item of items) {
      texto += `*#${item.id}* — ${NOMBRES_TIPO[item.tipo] || item.tipo}\n`
      texto += `${item.nombre}\n`
      texto += `_${item.descripcion}_\n`
      texto += `💰 ${item.precio} monedas\n\n`
    }

    texto += `╰─➤ _Compra con ${config.PREFIXES[0]}comprar <número>_\n`
    texto += `╰─➤ _Ver más: ${config.PREFIXES[0]}tienda ${pagina < totalPaginas ? pagina + 1 : 1}_`

    await sock.sendMessage(jid, { text: texto }, { quoted: msg })
  },
}