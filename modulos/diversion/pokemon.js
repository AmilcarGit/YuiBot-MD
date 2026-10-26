const { caja, uso } = require('../../lib/estilo')
const fetch = require('../../lib/http').fetchSeguro
const publicas = require('../../lib/publicas')

module.exports = {
  name: 'pokemon',
  aliases: ['poke', 'pokedex'],
  description: 'Ficha de un Pokémon: .pokemon <nombre o número>',
  category: 'diversion',

  async execute(sock, msg, args, { config }) {
    const jid = msg.key.remoteJid
    const consulta = args.join(' ').trim()
    if (!consulta) {
      return sock.sendMessage(jid, { text: uso(config.PREFIXES[0], 'pokemon', 'pikachu', 'Escribe el nombre o número del Pokémon.') }, { quoted: msg })
    }

    try {
      const p = await publicas.pokemon(consulta)
      const caption = caja('⚡', `Pokédex #${p.id}`, [
        ['Nombre', p.nombre, '🔴'],
        ['Tipo', p.tipos.join(' / '), '🧬'],
        ['Altura', `${p.altura} m`, '📏'],
        ['Peso', `${p.peso} kg`, '⚖️'],
        ['Habilidades', p.habilidades.join(', '), '✨'],
        `❤️ HP ${p.stats.hp}  ⚔️ Ataque ${p.stats.ataque}  🛡️ Defensa ${p.stats.defensa}`,
        `💥 At. esp. ${p.stats.ataqueEsp}  🔰 Def. esp. ${p.stats.defensaEsp}  💨 Veloc. ${p.stats.velocidad}`,
      ], 'Datos de PokéAPI')

      if (p.imagen) {
        const img = await fetch(p.imagen)
        if (img.ok) return sock.sendMessage(jid, { image: Buffer.from(await img.arrayBuffer()), caption }, { quoted: msg })
      }
      await sock.sendMessage(jid, { text: caption }, { quoted: msg })
    } catch (error) {
      const texto = error.noEncontrado ? `❌ No encontré el Pokémon "${consulta}". Usa su nombre en inglés o su número.` : `❌ No se pudo consultar la Pokédex.\n\n> ${error.message}`
      await sock.sendMessage(jid, { text: texto }, { quoted: msg })
    }
  },
}
