//CÓDIGO ORIGINAL DE YUIBOT-MD
function diasMes(anio, mes) {
  return new Date(anio, mes + 1, 0).getDate()
}

module.exports = {
  name: 'calendario',
  aliases: [],
  description: 'Muestra el calendario del mes',
  category: 'utilidad',
  async execute(sock, msg, args) {
    const jid = msg.key.remoteJid
    const ahora = new Date()
    let anio = Number(args[0]) || ahora.getFullYear()
    let mes = args[1] ? Number(args[1]) - 1 : ahora.getMonth()
    if (!Number.isInteger(anio) || anio < 1 || anio > 9999 || !Number.isInteger(mes) || mes < 0 || mes > 11) return sock.sendMessage(jid, { text: '❌ Usa: *calendario* o *calendario 2026 9*.' }, { quoted: msg })

    const nombreMes = new Date(anio, mes, 1).toLocaleDateString('es-PE', { month: 'long' })
    const primerDia = new Date(anio, mes, 1).getDay()
    const inicio = primerDia === 0 ? 6 : primerDia - 1
    const total = diasMes(anio, mes)
    const semanas = []
    let semana = Array(inicio).fill('  ')
    for (let dia = 1; dia <= total; dia++) {
      semana.push(String(dia).padStart(2, ' '))
      if (semana.length === 7) {
        semanas.push(semana.join(' '))
        semana = []
      }
    }
    if (semana.length) semanas.push(semana.concat(Array(7 - semana.length).fill('  ')).join(' '))

    await sock.sendMessage(jid, { text: `╭─ ✦ 📅 CALENDARIO ✦\n│        ${nombreMes.toUpperCase()} ${anio}\n│ Lu Ma Mi Ju Vi Sa Do\n│ ${semanas.join('\n│ ')}\n╰─ 🍃 YuiBot-MD` }, { quoted: msg })
  },
}