// Código Oficial de YuiBot-MD.by AmilcarGit
// Envío de audio; si pesa demasiado para reproducirse, va como archivo.
const mimeDe = url => {
  try { const m = new URL(url).searchParams.get('mime'); if (/^audio\/(mp4|mpeg)$/.test(m || '')) return m } catch {}
  return 'audio/mpeg'
}

export async function enviarAudio(ctx, url, titulo) {
  try {
    await ctx.enviar({ audio: { url }, mimetype: mimeDe(url) }, { quoted: ctx.m })
  } catch {
    await ctx.enviar({ document: { url }, mimetype: 'audio/mpeg', fileName: `${String(titulo).slice(0, 60)}.mp3` }, { quoted: ctx.m })
  }
}
