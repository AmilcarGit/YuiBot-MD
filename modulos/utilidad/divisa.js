const publicas = require('../../lib/publicas')

function interpretar(args) {
  // .divisa 100 usd pen  |  .divisa usd pen  |  .divisa 100 usd a pen
  const partes = args.map((a) => a.toLowerCase()).filter((a) => !['a', 'to', 'en'].includes(a))
  let monto = 1
  if (partes.length && /^[\d.,]+$/.test(partes[0])) monto = parseFloat(partes.shift().replace(',', '.'))
  const [de, a = 'pen'] = partes
  if (!de || !/^[a-z]{3}$/.test(de) || !/^[a-z]{3}$/.test(a) || !Number.isFinite(monto) || monto <= 0) return null
  return { monto, de: de.toUpperCase(), a: a.toUpperCase() }
}

module.exports = {
  name: 'divisa',
  aliases: ['divisas', 'conversor'],
  description: 'Convierte divisas: .divisa 100 usd pen',
  category: 'utilidad',

  async execute(sock, msg, args, { config }) {
    const jid = msg.key.remoteJid
    const datos = interpretar(args)
    if (!datos) {
      return sock.sendMessage(jid, { text: `❌ Formato no válido.\n\n📌 Ejemplos:\n${config.PREFIXES[0]}divisa 100 usd pen\n${config.PREFIXES[0]}divisa eur usd` }, { quoted: msg })
    }

    try {
      const r = await publicas.divisa(datos.monto, datos.de, datos.a)
      await sock.sendMessage(jid, {
        text: `💱 *Conversor de divisas*\n\n${r.monto.toLocaleString('es-PE')} ${r.de} = *${r.resultado.toLocaleString('es-PE', { maximumFractionDigits: 4 })} ${r.a}*\n\n📅 Tasa del ${r.fecha} (Banco Central Europeo)`,
      }, { quoted: msg })
    } catch (error) {
      const texto = error.noEncontrado ? `❌ No reconozco esas monedas (${datos.de} → ${datos.a}). Usa códigos como USD, EUR, PEN, MXN.` : `❌ No se pudo convertir.\n\n> ${error.message}`
      await sock.sendMessage(jid, { text: texto }, { quoted: msg })
    }
  },

  _internos: { interpretar },
}
