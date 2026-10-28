const dw = require('../../lib/descargaWeb')
const { descargarYEnviar, mensajeError } = require('../../lib/comandosDescarga')
const { uso } = require('../../lib/estilo')

module.exports = {
  name: 'gitclone',
  aliases: ['repozip', 'zipgithub'],
  description: 'Descarga un repositorio de GitHub como ZIP: .gitclone dueño/repo',
  category: 'download',

  async execute(sock, msg, args, { config }) {
    const jid = msg.key.remoteJid
    const entrada = args.join(' ').trim()
    if (!entrada) return sock.sendMessage(jid, { text: uso(config.PREFIXES[0], 'gitclone', 'AmilcarGit/YuiBot-MD', 'Escribe dueño/repo o pega el enlace del repositorio.') }, { quoted: msg })
    return descargarYEnviar(sock, msg, 'github', dw.extraerUrl(entrada) || entrada)
  },
}
