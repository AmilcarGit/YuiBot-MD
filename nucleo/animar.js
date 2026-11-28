// Código Oficial de YuiBot-MD.by AmilcarGit
// Mensajes animados: se manda el primer cuadro y se va editando el mismo mensaje (WhatsApp permite editar ~15 min).
// Si el chat no puede editar (la web de Yui, o una versión sin soporte), se omite sin molestar: solo se ve el resultado final.

export const ritmo = { ms: 650 } // pausa entre cuadros; las pruebas la ponen en 0
const dormir = ms => new Promise(r => setTimeout(r, ms))

/** Cuadros de una barra de carga: ['⏳ Título\n▰▱▱▱▱ 20%', …]. */
export function cuadrosCarga(titulo, { pasos = 4, largo = 8, final = '' } = {}) {
  const lunas = ['🌑', '🌒', '🌓', '🌔', '🌕']
  const cuadros = Array.from({ length: pasos }, (_, i) => {
    const p = (i + 1) / pasos; const llenos = Math.round(p * largo)
    return `${lunas[Math.min(lunas.length - 1, i)]} ${titulo}\n${'▰'.repeat(llenos)}${'▱'.repeat(largo - llenos)} ${Math.round(p * 100)}%`
  })
  return final ? [...cuadros, final] : cuadros
}

/** Muestra los cuadros uno tras otro en un solo mensaje. Devuelve la clave del mensaje o null si no se pudo animar. */
export async function animar(ctx, cuadros) {
  if (ctx.web || typeof ctx.enviar !== 'function' || cuadros.length < 2) return null
  let clave
  try { clave = (await ctx.responder(cuadros[0]))?.key } catch { return null }
  if (!clave) return null
  for (const cuadro of cuadros.slice(1)) {
    await dormir(ritmo.ms)
    try { await ctx.enviar({ text: cuadro, edit: clave }) } catch { break }
  }
  return clave
}
