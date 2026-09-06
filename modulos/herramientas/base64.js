//CÓDIGO ORIGINAL DE YUIBOT-MD
module.exports = {
  name: 'base64',
  description: 'Codifica y decodifica texto en Base64',
  category: 'herramientas',
  async execute(sock, msg, args) {
    const jid = msg.key.remoteJid
    const modo = (args[0] || '').toLowerCase()
    const texto = args.slice(1).join(' ')
    if (!['encode', 'decode'].includes(modo) || !texto) return sock.sendMessage(jid, { text: '❌ Usa:\n*base64 encode Hola mundo*\n*base64 decode SG9sYSBtdW5kbw==*' }, { quoted: msg })
    try {
      const resultado = modo === 'encode' ? Buffer.from(texto, 'utf8').toString('base64') : Buffer.from(texto, 'base64').toString('utf8')
      if (modo === 'decode' && Buffer.from(resultado, 'utf8').toString('base64').replace(/=+$/, '') !== texto.replace(/=+$/, '')) throw new Error('Cadena Base64 inválida')
      await sock.sendMessage(jid, { text: `╭─ ✦ 🔢 BASE64 ✦
│ ⚙️ Modo: *${modo}*
│ 📥 Entrada: *${texto}*
│ 📤 Resultado:
│ ${resultado}
╰─ 🍃 YuiBot-MD` }, { quoted: msg })
    } catch (error) {
      await sock.sendMessage(jid, { text: `❌ No se pudo procesar Base64: ${error.message}` }, { quoted: msg })
    }
  },
}
