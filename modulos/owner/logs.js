//CÓDIGO ORIGINAL DE YUIBOT-MD
const fs = require('fs')
const path = require('path')

module.exports = {
  name: 'logs',
  description: 'Consulta los registros recientes del bot',
  category: 'owner',
  ownerOnly: true,

  async execute(sock, msg, args) {
    const jid = msg.key.remoteJid
    const raiz = path.join(__dirname, '..', '..')
    const candidatos = [
      path.join(raiz, 'logs', 'yui.log'),
      path.join(raiz, 'logs', 'bot.log'),
      path.join(raiz, 'yui.log'),
      path.join(raiz, 'bot.log'),
    ]
    const archivo = candidatos.find((ruta) => fs.existsSync(ruta))

    if (!archivo) {
      return sock.sendMessage(jid, {
        text: '📋 *YUI LOGS*\n\nNo hay un archivo de registros disponible todavía.\n\nLos registros actuales se muestran en la consola del proceso.'
      }, { quoted: msg })
    }

    const cantidad = Math.min(Math.max(Number(args[0]) || 40, 1), 100)
    const contenido = fs.readFileSync(archivo, 'utf8')
    const lineas = contenido.split(/\r?\n/).filter(Boolean).slice(-cantidad)
    const salida = lineas.join('\n').slice(-12000)

    await sock.sendMessage(jid, {
      text: `📋 *YUI LOGS*\n📄 ${path.relative(raiz, archivo)}\n📌 Últimas ${lineas.length} líneas\n\n\`\`\`\n${salida || 'Sin registros'}\n\`\`\``
    }, { quoted: msg })
  },
}
