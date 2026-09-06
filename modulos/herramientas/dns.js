//CÓDIGO ORIGINAL DE YUIBOT-MD
const dns = require('dns').promises

module.exports = {
  name: 'dns',
  description: 'Consulta registros DNS de un dominio',
  category: 'herramientas',
  async execute(sock, msg, args) {
    const jid = msg.key.remoteJid
    const dominio = (args[0] || '').toLowerCase().replace(/^https?:\/\//, '').split('/')[0].split(':')[0]
    const tipos = ['A', 'AAAA', 'MX', 'NS', 'TXT', 'CNAME']
    const tipo = (args[1] || 'A').toUpperCase()
    if (!dominio || !/^[a-z0-9.-]+$/i.test(dominio) || !tipos.includes(tipo)) return sock.sendMessage(jid, { text: '❌ Usa: *dns ejemplo.com A*\nTipos: A, AAAA, MX, NS, TXT, CNAME' }, { quoted: msg })
    try {
      let datos
      if (tipo === 'A') datos = await dns.resolve4(dominio)
      else if (tipo === 'AAAA') datos = await dns.resolve6(dominio)
      else if (tipo === 'MX') datos = await dns.resolveMx(dominio)
      else if (tipo === 'NS') datos = await dns.resolveNs(dominio)
      else if (tipo === 'TXT') datos = (await dns.resolveTxt(dominio)).map(x => x.join(''))
      else datos = await dns.resolveCname(dominio)
      const salida = datos.slice(0, 10).map(x => typeof x === 'object' ? `${x.exchange} (${x.priority})` : String(x)).join('\n│ ')
      await sock.sendMessage(jid, { text: `╭─ ✦ 🌐 DNS ✦
│ Dominio: *${dominio}*
│ Tipo: *${tipo}*
│ ${salida}
╰─ 🍃 YuiBot-MD` }, { quoted: msg })
    } catch (error) {
      await sock.sendMessage(jid, { text: `❌ No se encontraron registros ${tipo}: ${error.code || error.message}` }, { quoted: msg })
    }
  },
}
