//CÓDIGO ORIGINAL DE YUIBOT-MD
module.exports = {
  name: 'broadcast',
  description: 'Envía un mensaje a todos los grupos o a números indicados',
  category: 'owner',
  ownerOnly: true,

  async execute(sock, msg, args) {
    const jid = msg.key.remoteJid
    const texto = args.join(' ').trim()
    if (!texto) {
      return sock.sendMessage(jid, { text: '📢 Usa: *broadcast mensaje*\nTambién puedes indicar números: *broadcast 51999999999 58400000000 | mensaje*' }, { quoted: msg })
    }

    let destinos = []
    let mensaje = texto
    const separador = texto.indexOf('|')

    if (separador >= 0) {
      const lista = texto.slice(0, separador).trim()
      mensaje = texto.slice(separador + 1).trim()
      destinos = lista.split(/\s+/).map((numero) => numero.replace(/[^0-9]/g, '')).filter(Boolean).map((numero) => `${numero}@s.whatsapp.net`)
    }

    if (!destinos.length) {
      const grupos = await sock.groupFetchAllParticipating()
      destinos = Object.keys(grupos || {})
    }

    if (!mensaje) {
      return sock.sendMessage(jid, { text: '❌ El mensaje no puede estar vacío.' }, { quoted: msg })
    }

    const unicos = [...new Set(destinos)].filter((destino) => destino !== jid)
    if (!unicos.length) {
      return sock.sendMessage(jid, { text: '❌ No encontré chats de destino.' }, { quoted: msg })
    }

    let enviados = 0
    let fallidos = 0
    for (const destino of unicos) {
      try {
        await sock.sendMessage(destino, { text: `📢 *YuiBot-MD*\n\n${mensaje}` })
        enviados++
      } catch {
        fallidos++
      }
    }

    await sock.sendMessage(jid, {
      text: `📢 *BROADCAST COMPLETADO*\n\n✅ Enviados: ${enviados}\n❌ Fallidos: ${fallidos}\n📨 Destinos: ${unicos.length}`
    }, { quoted: msg })
  },
}
