//CÓDIGO ORIGINAL DE YUIBOT-MD
const https = require('https')

const memoria = new Map()
const MAX_MENSAJES = 10
const TIMEOUT_MS = 15000

function consultarIA(texto, apiKey) {
  return new Promise((resolve, reject) => {
    const url = new URL('https://api.lempi.lat/ai/gemini')
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
            reject(new Error('La API no devolvió una respuesta válida.'))
            return
          }
          resolve(respuesta)
        } catch (error) {
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
  const historial = memoria.get(jid) || []
  historial.push(`Usuario: ${texto}`)
  if (historial.length > MAX_MENSAJES) historial.splice(0, historial.length - MAX_MENSAJES)
  memoria.set(jid, historial)
  return historial.join('\n')
}

module.exports = {
  name: 'ia',
  aliases: ['yui', 'chat', 'gemini'],
  description: 'IA conversacional privada de Yui',
  category: 'ia',

  async execute(sock, msg, args, { config }) {
    const jid = msg.key.remoteJid
    if (!jid || jid.endsWith('@g.us')) return

    const texto = args.join(' ').trim()
    if (!texto) return

    const apiKey = config.APIS?.LEMPI_KEY
    if (!apiKey) {
      await sock.sendMessage(jid, { text: '⚠️ La IA no está configurada.' }, { quoted: msg })
      return
    }

    const contexto = construirContexto(jid, texto)
    const prompt = `Eres Yui, la asistente virtual de YuiBot-MD. Responde en español de forma natural, cercana, amable y conversacional. No digas que eres una API ni menciones detalles técnicos. Mantén respuestas claras y no excesivamente largas. Este es el contexto reciente:\n${contexto}\nYui:`

    try {
      const respuesta = await consultarIA(prompt, apiKey)
      const historial = memoria.get(jid) || []
      historial.push(`Yui: ${respuesta}`)
      if (historial.length > MAX_MENSAJES) historial.splice(0, historial.length - MAX_MENSAJES)
      memoria.set(jid, historial)
      await sock.sendMessage(jid, { text: respuesta }, { quoted: msg })
    } catch (error) {
      console.error('[IA] Error consultando Gemini:', error.message)
      await sock.sendMessage(jid, { text: '🥺 Ahora mismo no puedo responder. Inténtalo de nuevo en un momento.' }, { quoted: msg })
    }
  },
}