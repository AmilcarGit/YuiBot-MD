// Código Oficial de YuiBot-MD.by AmilcarGit
import { crearSubbot } from '../../nucleo/subbots.js'
import { aviso, caja, dice, mal } from '../../estilo/index.js'

export default {
  nombre: 'serbot',
  alias: ['jadibot'],
  categoria: 'subbots',
  ayuda: 'Conviértete en sub-bot con un código',
  soloPrivado: true,
  async ejecutar(sock, m, ctx) {
    try {
      await ctx.responder(aviso(dice('serbotGenerando')))
      const codigo = await crearSubbot(ctx.numero)
      await ctx.responder(caja('Código de vinculación', [
        dice('serbotCodigo'),
        '',
        `🔑 ${codigo}`,
        '',
        'WhatsApp › Dispositivos vinculados › Vincular con el número de teléfono'
      ]))
    } catch (error) {
      await ctx.responder(mal(error.message))
    }
  }
}
