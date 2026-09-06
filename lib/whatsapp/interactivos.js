//CÓDIGO ORIGINAL DE YUIBOT-MD
function enviarBotones(sock, jid, opciones = {}) {
  const { text = '', footer, buttons = [], ...extra } = opciones

  return sock.sendMessage(jid, {
    text,
    ...(footer ? { footer } : {}),
    buttons: buttons.map((button) => ({
      text: String(button.text || ''),
      id: String(button.id || ''),
    })),
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
