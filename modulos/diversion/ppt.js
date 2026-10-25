const OPCIONES = { piedra: '🪨', papel: '📄', tijera: '✂️' }
const GANA_A = { piedra: 'tijera', papel: 'piedra', tijera: 'papel' }

function normalizar(texto) {
  const t = String(texto || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
  if (t.startsWith('pie')) return 'piedra'
  if (t.startsWith('pap')) return 'papel'
  if (t.startsWith('tij')) return 'tijera'
  return null
}

function resolver(jugador, bot) {
  if (jugador === bot) return 'empate'
  return GANA_A[jugador] === bot ? 'gana' : 'pierde'
}

module.exports = {
  name: 'ppt',
  aliases: ['piedrapapeltijera', 'rps'],
  description: 'Piedra, papel o tijera contra el bot: .ppt piedra',
  category: 'diversion',

  async execute(sock, msg, args, { config }) {
    const jid = msg.key.remoteJid
    const jugador = normalizar(args[0])
    if (!jugador) {
      return sock.sendMessage(jid, { text: `❌ Elige una opción.\n\n📌 ${config.PREFIXES[0]}ppt piedra | papel | tijera` }, { quoted: msg })
    }
    const claves = Object.keys(OPCIONES)
    const bot = claves[Math.floor(Math.random() * claves.length)]
    const resultado = resolver(jugador, bot)
    const veredicto = { gana: '🎉 ¡Ganaste!', pierde: '😈 ¡Perdiste!', empate: '🤝 ¡Empate!' }[resultado]
    await sock.sendMessage(jid, { text: `🎮 *Piedra, papel o tijera*\n\nTú: ${OPCIONES[jugador]} ${jugador}\nYo: ${OPCIONES[bot]} ${bot}\n\n${veredicto}` }, { quoted: msg })
  },

  _internos: { normalizar, resolver },
}
