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

function enviarAlbum(sock, jid, album = [], opciones = {}) {
  const { ...extra } = opciones

  return sock.sendMessage(jid, {
    album,
    ...extra,
  })
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

module.exports = {
  enviarBotones,
  enviarLista,
  enviarNativeFlow,
  enviarCarrusel,
  enviarAlbum,
  enviarTemplate,
}