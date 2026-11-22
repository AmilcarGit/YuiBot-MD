// Código Oficial de YuiBot-MD.by AmilcarGit
import { estadoSincro, sincronizarAhora } from '../../nucleo/sincro.js'
import { aviso, caja, temaActivo } from '../../estilo/index.js'
import { tiempo } from '../../nucleo/utiles.js'

export default {
  nombre: 'datos',
  alias: ['yuidatos', 'sincro'],
  categoria: 'dueno',
  ayuda: 'Estado de Yui-Datos (datos ahora = sincronizar ya)',
  soloDueno: true,
  async ejecutar(sock, m, ctx) {
    let s = estadoSincro()
    if (!s.activa) {
      return ctx.responder(aviso(`Yui-Datos no está conectada. Pon DATOS_URL en el .env con la dirección de tu despliegue y reinicia.`))
    }
    if (ctx.args[0]?.toLowerCase() === 'ahora') {
      await sincronizarAhora()
      s = estadoSincro()
    }
    const e = temaActivo().emojis
    await ctx.responder(caja('Yui-Datos', [
      `${e.item} Servidor: ${s.url}`,
      `${e.item} Instalación: ${s.id || 'sin registrar aún'}`,
      `${e.item} Última sincronización: ${s.ultimoOk ? `hace ${tiempo(Date.now() - s.ultimoOk)}` : 'todavía ninguna'}`,
      `${e.item} Jugadores enviados: ${s.enviados}`,
      s.ultimoError && `⚠️ Último error: ${s.ultimoError}`
    ]))
  }
}
