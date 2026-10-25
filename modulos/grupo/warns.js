const { leerWarns, objetivoDe, MAX_WARNS_DEFECTO } = require('../../lib/adminGrupo')

module.exports = {
  name: 'warns',
  aliases: ['advertencias', 'listawarns'],
  description: 'Muestra las advertencias del grupo (o de alguien citado)',
  category: 'grupo',

  async execute(sock, msg, args, { config }) {
    const jid = msg.key.remoteJid
    if (!jid.endsWith('@g.us')) return sock.sendMessage(jid, { text: '❌ Este comando solo funciona en grupos.' }, { quoted: msg })
    const max = config.MODERACION?.WARNS?.MAX || MAX_WARNS_DEFECTO
    const warns = leerWarns(jid)
    const objetivo = objetivoDe(msg, args)
    const entradas = objetivo ? [[objetivo, warns[objetivo] || { total: 0, motivos: [] }]] : Object.entries(warns)
    if (!entradas.length) return sock.sendMessage(jid, { text: '✅ Nadie tiene advertencias en este grupo.' }, { quoted: msg })
    const filas = entradas.map(([n, w]) => `• @${n} — ${w.total}/${max}${w.motivos.length ? `\n   📝 ${w.motivos[w.motivos.length - 1]}` : ''}`)
    return sock.sendMessage(jid, { text: `⚠️ *Advertencias*\n\n${filas.join('\n')}`, mentions: entradas.map(([n]) => `${n}@s.whatsapp.net`) }, { quoted: msg })
  },
}
