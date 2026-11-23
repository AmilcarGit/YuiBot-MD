// Código Oficial de YuiBot-MD.by AmilcarGit
import ajustes from '../../ajustes.js'
import { api, activa } from '../../nucleo/api.js'
import { credenciales, sincronizarAhora } from '../../nucleo/sincro.js'
import { caja, dice, mal, temaActivo } from '../../estilo/index.js'

export default {
  nombre: 'web',
  alias: ['wep', 'pagina', 'codigoweb'],
  categoria: 'economia',
  ayuda: 'Código para usar a Yui desde la página web',
  registro: true,
  soloPrivado: true,
  async ejecutar(sock, m, ctx) {
    if (!activa()) return ctx.responder(mal(dice('webNoDisponible')))
    try {
      // Primero se suben los datos, así la web ya los tiene al entrar.
      await sincronizarAhora()
      const cred = credenciales()
      if (!cred) return ctx.responder(mal(dice('webNoDisponible')))
      const { codigo, minutos } = await api.vincular(cred, ctx.numero)
      const e = temaActivo().emojis
      await ctx.responder(caja('Yui en la web', [
        dice('webCodigo'),
        '',
        `${e.item} Código: ${codigo}`,
        `${e.item} Vale ${minutos} minutos`,
        `${e.item} Entra en: ${ajustes.datosUrl.replace(/\/$/, '')}/yui`,
        '',
        'No compartas este código con nadie.'
      ]))
    } catch (error) {
      console.error(`.web: ${error.message}`)
      await ctx.responder(mal(dice('webNoDisponible')))
    }
  }
}
