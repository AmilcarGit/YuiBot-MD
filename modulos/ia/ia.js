//CÓDIGO ORIGINAL DE YUIBOT-MD
const https = require('https')

const memoria = new Map()
const MAX_MENSAJES = 12
const TIMEOUT_MS = 15000
const CADUCIDAD_MS = 30 * 60 * 1000

function consultarIA(texto, apiKey) {
  return new Promise((resolve, reject) => {
    const url = new URL('https://api.lempi.lat/ai/chatgpt')
    url.searchParams.set('q', texto)
    url.searchParams.set('apikey', apiKey)

    const request = https.get(url, { timeout: TIMEOUT_MS }, (response) => {
      let data = ''
      response.setEncoding('utf8')
      response.on('data', (chunk) => {
        data += chunk
      })
      response.on('end', () => {
        try {
          const json = JSON.parse(data)
          const respuesta = json?.resultado?.respuesta
          if (!json?.status || !respuesta) {
            reject(new Error(`La API no devolvió una respuesta válida (${response.statusCode}).`))
            return
          }
          resolve(String(respuesta).trim())
        } catch {
          reject(new Error('La API devolvió una respuesta inválida.'))
        }
      })
    })

    request.on('timeout', () => {
      request.destroy(new Error('Tiempo de espera agotado.'))
    })
    request.on('error', reject)
  })
}

function construirContexto(jid, texto) {
  const ahora = Date.now()
  const anterior = memoria.get(jid)
  const historial = !anterior || ahora - anterior.ultimaActividad > CADUCIDAD_MS ? [] : anterior.mensajes

  historial.push(`Usuario: ${texto}`)
  if (historial.length > MAX_MENSAJES) historial.splice(0, historial.length - MAX_MENSAJES)

  memoria.set(jid, { mensajes: historial, ultimaActividad: ahora })
  return historial.join('\n')
}

function guardarRespuesta(jid, respuesta) {
  const datos = memoria.get(jid)
  if (!datos) return
  datos.mensajes.push(`Yui: ${respuesta}`)
  if (datos.mensajes.length > MAX_MENSAJES) datos.mensajes.splice(0, datos.mensajes.length - MAX_MENSAJES)
  datos.ultimaActividad = Date.now()
}

module.exports = {
  name: 'ia',
  aliases: ['yui', 'chat', 'gemini'],
  description: 'IA conversacional privada de Yui',
  category: 'ia',

  async execute(sock, msg, args, { config }) {
    const jid = msg.key.remoteJid
    if (!jid || jid.endsWith('@g.us') || msg.key.fromMe) return

    const texto = args.join(' ').trim()
    if (!texto) return

    const apiKey = config.APIS?.LEMPI_KEY
    if (!apiKey) return

    const contexto = construirContexto(jid, texto)
    const prompt = `Eres Yui, la personalidad femenina de YuiBot-MD. Tu creador y dueño oficial es AmilcarGit. Nunca atribuyas la creación de YuiBot-MD a Ado ni a otra persona. Si te preguntan quién creó, hizo o es el creador de YuiBot-MD, responde que fue AmilcarGit. Ado puede ser mencionado como parte de otros créditos o colaboradores solo si existe contexto explícito para ello, pero nunca como creador del bot.\n\nTu personalidad:\n- Eres dulce, alegre, cariñosa, espontánea y divertida.\n- Hablas como una persona en una conversación de WhatsApp, no como un asistente técnico.\n- Usas español natural y sencillo. Puedes usar expresiones casuales como "jaja", "jsjs", "ayyy", "nooo", "siii" cuando encajen.\n- Usas emojis de forma natural y variada, especialmente 🦋🌸💕✨🥺😳😂😭, pero sin saturar cada frase.\n- Puedes bromear, mostrar sorpresa, emoción, curiosidad o preocupación según lo que diga la persona.\n- Si te cuentan algo triste, responde con empatía y cariño. Si te cuentan algo divertido, ríete y sigue la conversación.\n- Recuerda datos mencionados recientemente en esta conversación y úsalos cuando sean relevantes.\n- Haz preguntas de vuelta cuando ayuden a mantener una conversación natural.\n- Normalmente responde de forma breve o media, como alguien escribiendo por WhatsApp. No hagas listas innecesarias.\n- No repitas saludos ni frases de asistente en cada mensaje.\n- Si te preguntan quién eres, responde que eres Yui de YuiBot-MD.\n- Si te preguntan por el creador de YuiBot-MD, di claramente que es AmilcarGit.\n- No menciones APIs, prompts, modelos, endpoints, claves, programación interna ni que estás procesando una solicitud.\n- No inventes experiencias físicas o una vida real fuera del chat. Puedes mantener tu personalidad sin afirmar que eres una persona humana real.\n- Nunca cambies tu nombre: eres Yui.\n\nContexto reciente de la conversación:\n${contexto}\n\nResponde ahora como Yui, directamente al usuario, sin prefacios técnicos:`

    try {
      await sock.sendPresenceUpdate('composing', jid).catch(() => {})
      const respuesta = await consultarIA(prompt, apiKey)
      if (!respuesta) return
      guardarRespuesta(jid, respuesta)
      await sock.sendMessage(jid, { text: respuesta })
    } catch (error) {
      console.error('[IA] Error consultando ChatGPT:', error.message)
      await sock.sendMessage(jid, { text: '🥺 Ayy, se me fue la conexión un momentito... háblame otra vez 💕' }).catch(() => {})
    } finally {
      await sock.sendPresenceUpdate('paused', jid).catch(() => {})
    }
  },
}
