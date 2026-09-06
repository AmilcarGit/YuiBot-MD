//CÓDIGO ORIGINAL DE YUIBOT-MD
const { CATALOGO } = require('../../lib/tienda')
const { saldo, formatoMonedas } = require('../../lib/juegos')
const { numeroUsuario, enviarRpg } = require('../../lib/rpg')

const POR_PAGINA = 6
const NOMBRES_TIPO = { insignia: '🏅', color: '🎨', titulo: '📛', boost: '⚡', proteccion: '🛡️', cofre: '🎁' }

module.exports = {
  name: 'tienda',
  description: 'Muestra la tienda de objetos de YUI RPG',
  category: 'rpg',
  async execute(sock, msg, args) {
    const numero = numeroUsuario(msg)
    const totalPaginas = Math.ceil(CATALOGO.length / POR_PAGINA)
    let pagina = parseInt(args?.[0], 10) || 1
    pagina = Math.max(1, Math.min(totalPaginas, pagina))
    const items = CATALOGO.slice((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA)
    const datos = items.map((item) => `${NOMBRES_TIPO[item.tipo] || '🎒'} #${item.id} ${item.nombre} • ${formatoMonedas(item.precio)}`)
    await enviarRpg(sock, msg, {
      icono: '🛒', titulo: 'Tienda RPG', subtitulo: `Página ${pagina}/${totalPaginas} • Saldo ${formatoMonedas(saldo(numero))}`,
      datos,
      caption: `╭─ ✦ 🛒 TIENDA RPG ✦\n│ 💰 Saldo: *${formatoMonedas(saldo(numero))}*\n│ 📖 Página: *${pagina}/${totalPaginas}*\n│ 🛍️ Compra con */comprar <id>*\n╰─ 🍃 YuiBot-MD`,
      botones: [
        { id: `/tienda ${pagina < totalPaginas ? pagina + 1 : 1}`, text: '➡️ SIGUIENTE' },
        { id: '/inventario', text: '🎒 INVENTARIO' },
        { id: '/perfilrpg', text: '🧙 PERFIL' },
      ],
    })
  },
}
