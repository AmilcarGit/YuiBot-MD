//CÓDIGO ORIGINAL DE YUIBOT-MD
module.exports = {
  name: 'whois',
  description: 'Muestra información básica de un dominio mediante RDAP',
  category: 'herramientas',
  async execute(sock, msg, args) {
    const jid = msg.key.remoteJid
    const dominio = (args[0] || '').toLowerCase().replace(/^https?:\/\//, '').split('/')[0].split(':')[0]
    if (!dominio || !/^(?=.{1,253}$)[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+$/i.test(dominio)) return sock.sendMessage(jid, { text: '❌ Usa: *whois ejemplo.com*' }, { quoted: msg })
    try {
      const respuesta = await fetch(`https://rdap.org/domain/${encodeURIComponent(dominio)}`)
      if (!respuesta.ok) throw new Error(`HTTP ${respuesta.status}`)
      const data = await respuesta.json()
      const eventos = Array.isArray(data.events) ? data.events : []
      const creado = eventos.find(e => e.eventAction === 'registration')?.eventDate || 'N/A'
      const actualizado = eventos.find(e => e.eventAction === 'last changed')?.eventDate || eventos.find(e => e.eventAction === 'last update of RDAP database')?.eventDate || 'N/A'
      const vencimiento = eventos.find(e => e.eventAction === 'expiration')?.eventDate || 'N/A'
      const estado = Array.isArray(data.status) && data.status.length ? data.status.slice(0, 3).join(', ') : 'N/A'
      await sock.sendMessage(jid, { text: `╭─ ✦ 🔍 WHOIS ✦
│ 🌐 Dominio: *${data.ldhName || dominio}*
│ 📅 Registro: *${creado}*
│ 🔄 Actualizado: *${actualizado}*
│ ⏳ Vencimiento: *${vencimiento}*
│ 📌 Estado: *${estado}*
╰─ 🍃 YuiBot-MD` }, { quoted: msg })
    } catch (error) {
      await sock.sendMessage(jid, { text: `❌ No se pudo consultar el dominio: ${error.message}` }, { quoted: msg })
    }
  },
}
