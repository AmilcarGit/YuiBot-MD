// Comando: pregunta / curiosidad / misterio
// Preguntas sin respuesta clara o definitiva

const PREGUNTAS = [
  "¿Qué había antes del Big Bang?",
  "¿Por qué existe algo en lugar de nada?",
  "¿La conciencia es solo producto del cerebro o es algo más?",
  "¿El tiempo es real o solo una ilusión de nuestra mente?",
  "¿Tenemos libre albedrío o todo está determinado?",
  "¿El universo es infinito o tiene un límite?",
  "¿Qué se siente realmente no existir?",
  "¿Por qué podemos imaginar cosas que nunca hemos visto?",
  "¿La realidad existe cuando nadie la observa?",
  "¿Somos los únicos seres conscientes en el universo?",
  "¿Qué es el 'yo'? ¿Dónde se encuentra exactamente?",
  "¿El pasado sigue existiendo de alguna forma?",
  "¿Por qué el universo parece tan perfectamente ajustado para la vida?",
  "¿La muerte es el final absoluto o solo un cambio de estado?",
  "¿Puede existir un pensamiento sin un pensador?",
  "¿El infinito es una cantidad real o solo un concepto?",
  "¿Por qué sentimos que el tiempo pasa si el tiempo no 'pasa' realmente?",
  "¿Qué hace que una experiencia sea 'mía' y no de otra persona?",
  "¿Es posible que estemos viviendo en una simulación?",
  "¿Por qué hay leyes de la física en lugar de caos total?",
  "¿El universo tiene un propósito o simplemente existe?",
  "¿Qué había en el lugar donde ahora está el universo antes de que existiera?",
  "¿La matemática fue inventada o descubierta?",
  "¿Por qué podemos soñar cosas imposibles?",
  "¿El bien y el mal existen de forma objetiva o solo son opiniones humanas?",
  "¿Qué se siente ser otra persona desde dentro?",
  "¿El futuro ya está escrito o se crea momento a momento?",
  "¿Por qué el presente es lo único que parece 'real'?",
  "¿Puede algo surgir de la nada absoluta?",
  "¿La mente crea la realidad o la realidad crea la mente?",
  "¿Por qué existe el sufrimiento si el universo no tiene intenciones?",
  "¿Somos más que la suma de nuestras memorias?",
  "¿Qué pasaría si el tiempo empezara a correr al revés?",
  "¿El universo se repite eternamente en ciclos?",
  "¿Por qué tenemos la capacidad de hacernos estas preguntas?"
]

module.exports = {
  name: 'pregunta',
  aliases: ['curiosidad', 'misterio', 'preguntaaleatoria', 'filosofia'],
  description: 'Envía una pregunta profunda sin respuesta definitiva',
  category: 'diversion',

  async execute(sock, msg, args) {
    const jid = msg.key.remoteJid
    const pregunta = PREGUNTAS[Math.floor(Math.random() * PREGUNTAS.length)]

    const texto = `╭─❖ 「 🌌 𝗠𝗜𝗦𝗧𝗘𝗥𝗜𝗢 」 ❖─╮\n` +
                  `│\n` +
                  `│  ${pregunta}\n` +
                  `│\n` +
                  `╰────────────────────╯\n\n` +
                  `_No hay una respuesta definitiva..._ 🌌`

    await sock.sendMessage(jid, { text: texto }, { quoted: msg })
  }
}