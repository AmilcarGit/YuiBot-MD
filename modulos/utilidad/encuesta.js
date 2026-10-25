// .encuesta Pregunta | opción 1 | opción 2 | ...   (con -m se pueden elegir varias)
const MIN_OPCIONES = 2
const MAX_OPCIONES = 12
const MAX_PREGUNTA = 250
const MAX_OPCION = 100

function interpretar(args) {
  let texto = args.join(' ').trim()
  let multiple = false
  if (/^(-m|--multiple)\s/i.test(texto) || /^(-m|--multiple)$/i.test(texto)) {
    multiple = true
    texto = texto.replace(/^(-m|--multiple)\s*/i, '')
  }

  const partes = texto.split('|').map((p) => p.trim()).filter(Boolean)
  const [pregunta, ...opciones] = partes
  if (!pregunta) return { error: 'Falta la pregunta.' }
  if (pregunta.length > MAX_PREGUNTA) return { error: `La pregunta es muy larga (máx. ${MAX_PREGUNTA} caracteres).` }

  const unicas = [...new Set(opciones)]
  if (unicas.length < MIN_OPCIONES) return { error: `Pon al menos ${MIN_OPCIONES} opciones distintas.` }
  if (unicas.length > MAX_OPCIONES) return { error: `Máximo ${MAX_OPCIONES} opciones.` }
  const larga = unicas.find((o) => o.length > MAX_OPCION)
  if (larga) return { error: `Una opción es muy larga (máx. ${MAX_OPCION} caracteres): "${larga.slice(0, 30)}…"` }

  return { pregunta, opciones: unicas, selectableCount: multiple ? unicas.length : 1 }
}

module.exports = {
  name: 'encuesta',
  aliases: ['poll'],
  description: 'Crea una encuesta: .encuesta ¿Pizza o hamburguesa? | Pizza | Hamburguesa',
  category: 'utilidad',

  async execute(sock, msg, args, { config }) {
    const jid = msg.key.remoteJid
    const prefijo = config.PREFIXES[0]
    const datos = interpretar(args)

    if (datos.error) {
      return sock.sendMessage(jid, {
        text:
          `❌ ${datos.error}\n\n📌 Ejemplo:\n${prefijo}encuesta ¿Qué comemos? | Pizza | Hamburguesa | Sushi\n\n` +
          `💡 Con *-m* se pueden elegir varias opciones:\n${prefijo}encuesta -m ¿Qué juegos? | FF | Minecraft | Roblox`,
      }, { quoted: msg })
    }

    await sock.sendMessage(jid, {
      poll: { name: datos.pregunta, values: datos.opciones, selectableCount: datos.selectableCount },
    }, { quoted: msg })
  },

  _internos: { interpretar },
}
