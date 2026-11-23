// Código Oficial de YuiBot-MD.by AmilcarGit
// Botones de respuesta rápida y menús desplegables. Se describen una sola vez, sin prefijo:
//   { texto: '🪨 Piedra', cmd: 'ppt piedra' }
//   { texto: '📜 Comandos', secciones: [{ titulo: 'Economía', filas: [{ titulo: 'daily', descripcion: '…', cmd: 'daily' }] }] }
// En WhatsApp se envían como botones nativos de Yui-Bails; en la web de Yui como botones de la página.
// Al tocar uno, el id llega como texto (".ppt piedra") y pasa por el mismo camino que cualquier comando.

const cortar = (texto, max) => {
  const t = String(texto ?? '')
  return t.length > max ? `${t.slice(0, max - 1)}…` : t
}

export const conBotones = (ctx, texto, lista, opciones) =>
  typeof ctx.botones === 'function' ? ctx.botones(texto, lista, opciones) : ctx.responder(texto)

/** Convierte la descripción al formato de `sock.sendMessage({ buttons })` de Yui-Bails. */
export function aBotonesWa(lista, prefijo) {
  const botones = []
  let rapidos = 0
  for (const b of lista) {
    if (b.secciones) {
      botones.push({
        text: cortar(b.texto, 20),
        sections: b.secciones.slice(0, 10).map(s => ({
          title: cortar(s.titulo, 24),
          rows: s.filas.slice(0, 10).map(f => ({ title: cortar(f.titulo, 24), description: cortar(f.descripcion, 72), id: `${prefijo}${f.cmd}` }))
        }))
      })
    } else if (rapidos < 3) {
      rapidos++
      botones.push({ text: cortar(b.texto, 20), id: `${prefijo}${b.cmd}` })
    }
  }
  return botones
}

/** Por si WhatsApp no deja enviar botones: los atajos van escritos al final del mensaje. */
export function textoAlterno(lista, prefijo) {
  const atajos = lista.filter(b => b.cmd).map(b => `${prefijo}${b.cmd}`)
  return atajos.length ? `\n\n💡 ${atajos.join(' · ')}` : ''
}
