// Código Oficial de YuiBot-MD.by AmilcarGit
import readline from 'readline'

export const dormir = ms => new Promise(resolver => setTimeout(resolver, ms))

export const soloNumero = jid => String(jid || '').split('@')[0].split(':')[0].replace(/\D/g, '')

export const aleatorio = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min

export const formato = n => Number(n).toLocaleString('es-PE')

export function tiempo(ms) {
  const s = Math.ceil(ms / 1000)
  const h = Math.floor(s / 3600)
  const mi = Math.floor((s % 3600) / 60)
  const se = s % 60
  return [h && `${h}h`, mi && `${mi}m`, !h && `${se}s`].filter(Boolean).join(' ')
}

export function preguntar(texto) {
  const lector = readline.createInterface({ input: process.stdin, output: process.stdout })
  return new Promise(resolver => lector.question(texto, respuesta => {
    lector.close()
    resolver(respuesta.trim())
  }))
}

export function extraerTexto(m) {
  let c = m.message
  c = c?.ephemeralMessage?.message || c?.viewOnceMessage?.message || c?.documentWithCaptionMessage?.message || c
  if (!c) return ''
  let idNativo = ''
  const nativo = c.interactiveResponseMessage?.nativeFlowResponseMessage?.paramsJson
  if (nativo) {
    try { idNativo = JSON.parse(nativo).id || '' } catch { idNativo = '' }
  }
  return String(
    c.conversation ||
    c.extendedTextMessage?.text ||
    c.imageMessage?.caption ||
    c.videoMessage?.caption ||
    c.listResponseMessage?.singleSelectReply?.selectedRowId ||
    c.buttonsResponseMessage?.selectedButtonId ||
    c.templateButtonReplyMessage?.selectedId ||
    idNativo ||
    ''
  ).trim()
}
