// Código Oficial de YuiBot-MD.by AmilcarGit
// Envío de audio; si pesa demasiado para reproducirse, va como archivo.
export async function enviarAudio(ctx, url, titulo) {
  try {
    await ctx.enviar({ audio: { url }, mimetype: 'audio/mpeg' }, { quoted: ctx.m })
  } catch {
    await ctx.enviar({ document: { url }, mimetype: 'audio/mpeg', fileName: `${String(titulo).slice(0, 60)}.mp3` }, { quoted: ctx.m })
  }
}
