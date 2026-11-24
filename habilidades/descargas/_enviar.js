// Código Oficial de YuiBot-MD.by AmilcarGit
// Envío de audio; si pesa demasiado para reproducirse, va como archivo.
import { ytaudioYui, ytmp3 } from '../../nucleo/descargas.js'
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

/** Audio como archivo de YuiApi (Buffer); si falla, sigue el camino por enlace. */
export async function enviarAudioBuffer(ctx, buffer, titulo) {
  try {
    await ctx.enviar({ audio: buffer, mimetype: 'audio/mpeg' }, { quoted: ctx.m })
  } catch {
    await ctx.enviar({ document: buffer, mimetype: 'audio/mpeg', fileName: `${String(titulo).slice(0, 60)}.mp3` }, { quoted: ctx.m })
  }
}

/** Obtiene y envía el audio: primero YuiApi (archivo) y, si no se puede, por enlace (Nexora / YOSOYO). */
export async function entregarAudio(ctx, enlace, titulo) {
  let buffer = null
  try { buffer = await ytaudioYui(enlace) } catch (error) { console.error(`ytaudio: ${error.message}`) }
  if (buffer) return enviarAudioBuffer(ctx, buffer, titulo)
  return enviarAudio(ctx, await ytmp3(enlace), titulo)
}
