//CÓDIGO ORIGINAL DE YUIBOT-MD
function enviarBotones(sock, jid, opciones = {}) {
  const { text = '', footer, buttons = [], ...extra } = opciones

  return sock.sendMessage(jid, {
    text,
    ...(footer ? { footer } : {}),
    buttons: buttons.map((button) => {
      const btn = { text: String(button.text || '') }
      // Cada botón trae SOLO el campo que le corresponde según su tipo
      // (id = respuesta rápida, url = abre un link, call = marca un
      // número, copy = copia texto). No se fuerza "id" si el botón es
      // de otro tipo.
      if (button.url) btn.url = String(button.url)
      else if (button.call) btn.call = String(button.call)
      else if (button.copy) btn.copy = String(button.copy)
      else btn.id = String(button.id || '')

      if (Array.isArray(button.sections)) btn.sections = button.sections
      return btn
    }),
    ...extra,
  })
}

function enviarLista(sock, jid, opciones = {}) {
  const { text = '', footer, buttonText = 'Seleccionar', title, sections = [], ...extra } = opciones

  return sock.sendMessage(jid, {
    text,
    ...(footer ? { footer } : {}),
    buttonText,
    ...(title ? { title } : {}),
    sections,
    ...extra,
  })
}

function enviarNativeFlow(sock, jid, opciones = {}) {
  const {
    text = '',
    footer,
    nativeFlow = [],
    optionText,
    optionTitle,
    interactiveAsTemplate,
    ...extra
  } = opciones

  return sock.sendMessage(jid, {
    text,
    ...(footer ? { footer } : {}),
    nativeFlow,
    ...(optionText ? { optionText } : {}),
    ...(optionTitle ? { optionTitle } : {}),
    ...(typeof interactiveAsTemplate === 'boolean' ? { interactiveAsTemplate } : {}),
    ...extra,
  })
}

function enviarCarrusel(sock, jid, opciones = {}) {
  const { text = '', footer, cards = [], ...extra } = opciones

  return sock.sendMessage(jid, {
    text,
    ...(footer ? { footer } : {}),
    cards,
    ...extra,
  })
}

/**
 * Álbum real de WhatsApp: primero el mensaje "padre" (albumMessage) y luego cada
 * foto o video asociado a él con albumParentKey. Si algo falla antes de crear
 * el álbum, se envían los medios sueltos para no perder nada.
 *   medios: [{ image: Buffer|{url}, caption? }, { video: ..., caption? }]
 *   opciones: { quoted }
 */
async function enviarAlbum(sock, jid, medios = [], opciones = {}) {
  const lista = medios.filter((m) => m && (m.image || m.video))
  if (!lista.length) throw new Error('El álbum no tiene fotos ni videos')

  const envio = opciones.quoted ? { quoted: opciones.quoted } : undefined
  if (lista.length === 1) return [await sock.sendMessage(jid, lista[0], envio)]

  let padre = null
  try {
    padre = await sock.sendMessage(
      jid,
      {
        album: {
          expectedImageCount: lista.filter((m) => m.image).length,
          expectedVideoCount: lista.filter((m) => m.video).length,
        },
      },
      envio
    )
  } catch (error) {
    console.error('[ALBUM] No se pudo crear el álbum, se envían sueltos:', error.message)
  }

  const resultados = []
  for (const medio of lista) {
    resultados.push(await sock.sendMessage(jid, padre?.key ? { ...medio, albumParentKey: padre.key } : medio, envio))
  }
  return resultados
}

function enviarTemplate(sock, jid, opciones = {}) {
  const { text = '', footer, templateButtons = [], ...extra } = opciones

  return sock.sendMessage(jid, {
    text,
    ...(footer ? { footer } : {}),
    templateButtons,
    ...extra,
  })
}

/** La conexión con WhatsApp está caída: probar otro formato no sirve, hay que esperar a que reconecte. */
const esConexionCerrada = (error) => error?.output?.statusCode === 428 || /connection closed/i.test(String(error?.message || ''))

/**
 * Prueba formas de enviar de más a menos vistosa (lista, botones, texto) y se
 * queda con la primera que WhatsApp acepte. intentos = [[nombre, contenido], …]
 */
async function enviarConRespaldo(sock, jid, intentos, opciones = {}, etiqueta = 'INTERACTIVO') {
  let ultimoError
  for (const [nombre, contenido] of intentos) {
    try {
      return await sock.sendMessage(jid, contenido, opciones)
    } catch (error) {
      ultimoError = error
      if (esConexionCerrada(error)) {
        console.error(`[${etiqueta}] Sin conexión con WhatsApp; no se reintenta con otros formatos.`)
        throw error
      }
      console.error(`[${etiqueta}] Falló el envío (${nombre}), pruebo algo más simple:`, error.message)
    }
  }
  throw ultimoError
}

module.exports = {
  esConexionCerrada,
  enviarConRespaldo,
  enviarBotones,
  enviarLista,
  enviarNativeFlow,
  enviarCarrusel,
  enviarAlbum,
  enviarTemplate,
}