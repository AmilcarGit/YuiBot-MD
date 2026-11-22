// Código Oficial de YuiBot-MD.by AmilcarGit
export async function enviarLista(ctx, { titulo, texto, pie, boton, secciones }) {
  const alterno = [
    `*${titulo}*`,
    texto,
    ...secciones.flatMap(s => s.rows.map(r => `• ${r.title}: ${r.rowId}`))
  ].join('\n')

  if (ctx.grupo) return ctx.responder(alterno)

  try {
    await ctx.enviar(
      { text: texto, footer: pie, title: titulo, buttonText: boton, sections: secciones },
      { quoted: ctx.m }
    )
  } catch {
    await ctx.responder(alterno)
  }
}
