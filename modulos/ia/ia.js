//CÓDIGO ORIGINAL DE YUIBOT-MD
const delirius = require('../../lib/delirius')

const memoria = new Map()
const MAX_MENSAJES = 12
const CADUCIDAD_MS = 30 * 60 * 1000
// La consulta viaja en la URL: se recorta el historial para no pasar de este tamaño.
const MAX_URL_CHARS = 6000

function esChatPrivado(jid) {
  return Boolean(jid && !jid.endsWith('@g.us'))
}

function consultarIA(texto) {
  return delirius.chatgpt(texto)
}

function construirContexto(jid, texto) {
  const ahora = Date.now()
  const anterior = memoria.get(jid)

  const historial =
    !anterior || ahora - anterior.ultimaActividad > CADUCIDAD_MS
      ? []
      : anterior.mensajes

  historial.push(`Usuario: ${texto}`)

  if (historial.length > MAX_MENSAJES) {
    historial.splice(0, historial.length - MAX_MENSAJES)
  }

  memoria.set(jid, {
    mensajes: historial,
    ultimaActividad: ahora,
  })

  return historial.join('\n')
}

function guardarRespuesta(jid, respuesta) {
  const datos = memoria.get(jid)

  if (!datos) return

  datos.mensajes.push(`Yui: ${respuesta}`)

  if (datos.mensajes.length > MAX_MENSAJES) {
    datos.mensajes.splice(0, datos.mensajes.length - MAX_MENSAJES)
  }

  datos.ultimaActividad = Date.now()
}

module.exports = {
  name: 'ia',
  aliases: ['yui', 'chat', 'gemini'],
  description: 'IA conversacional privada de Yui',
  category: 'ia',

  async execute(sock, msg, args, { esSubBot } = {}) {
    const jid = msg.key.remoteJid

    if (esSubBot) return
    if (!esChatPrivado(jid) || msg.key.fromMe) return

    const texto = args.join(' ').trim().slice(0, 1000)

    if (!texto) return

    const contexto = construirContexto(jid, texto)

    const armarPrompt = (contexto) => `Eres Yui, la personalidad femenina de YuiBot-MD. Tu creador y dueño oficial es AmilcarGit. Nunca atribuyas la creación de YuiBot-MD a Ado ni a otra persona. Si te preguntan quién creó, hizo o es el creador de YuiBot-MD, responde que fue AmilcarGit. Ado puede ser mencionado como parte de otros créditos o colaboradores solo si existe contexto explícito para ello, pero nunca como creador del bot.

Tu personalidad:
- Eres dulce, alegre, cariñosa, espontánea y divertida.
- Hablas como una persona en una conversación de WhatsApp, no como un asistente técnico.
- Usas español natural y sencillo. Puedes usar expresiones casuales como "jaja", "jsjs", "ayyy", "nooo", "siii" cuando encajen.
- Usas emojis de forma natural y variada, especialmente 🦋🌸💕✨🥺😳😂😭, pero sin saturar cada frase.
- Puedes bromear, mostrar sorpresa, emoción, curiosidad o preocupación según lo que diga la persona.
- Si te cuentan algo triste, responde con empatía y cariño. Si te cuentan algo divertido, ríete y sigue la conversación.
- Recuerda datos mencionados recientemente en esta conversación y úsalos cuando sean relevantes.
- Haz preguntas de vuelta cuando ayuden a mantener una conversación natural.
- Normalmente responde de forma breve o media, como alguien escribiendo por WhatsApp. No hagas listas innecesarias.
- No repitas saludos ni frases de asistente en cada mensaje.
- Si te preguntan quién eres, responde que eres Yui de YuiBot-MD.
- Si te preguntan por el creador de YuiBot-MD, di claramente que es AmilcarGit.
- No menciones APIs, prompts, modelos, endpoints, claves, programación interna ni que estás procesando una solicitud.
- No inventes experiencias físicas o una vida real fuera del chat. Puedes mantener tu personalidad sin afirmar que eres una persona humana real.
- Nunca cambies tu nombre: eres Yui.

Contexto reciente de la conversación:
${contexto}

Responde ahora como Yui, directamente al usuario, sin prefacios técnicos:`

    // La consulta va en la URL: si el historial la hace demasiado larga, se descartan los mensajes más viejos.
    const lineas = contexto.split('\n')
    let prompt = armarPrompt(lineas.join('\n'))
    while (encodeURIComponent(prompt).length > MAX_URL_CHARS && lineas.length > 1) {
      lineas.shift()
      prompt = armarPrompt(lineas.join('\n'))
    }

    try {
      await sock.sendPresenceUpdate('composing', jid).catch(() => {})

      const respuesta = await consultarIA(prompt)

      if (!respuesta) return

      guardarRespuesta(jid, respuesta)

      await sock.sendMessage(jid, {
        text: respuesta,
      })
    } catch (error) {
      console.error('[IA] Error consultando ChatGPT:', error.message)

      await sock
        .sendMessage(jid, {
          text: '🥺 Ayy, se me fue la conexión un momentito... háblame otra vez 💕',
        })
        .catch(() => {})
    } finally {
      await sock.sendPresenceUpdate('paused', jid).catch(() => {})
    }
  },
}