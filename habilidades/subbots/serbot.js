// Código Oficial de YuiBot-MD.by AmilcarGit
import { crearSubbot } from '../../nucleo/subbots.js'

export default {
  nombre: 'serbot',
  alias: ['jadibot'],
  categoria: 'subbots',
  ayuda: 'Conviértete en sub-bot con un código',
  soloPrivado: true,
  async ejecutar(sock, m, ctx) {
    try {
      await ctx.responder('Generando tu código de vinculación...')
      const codigo = await crearSubbot(ctx.numero)
      await ctx.responder(`Código: ${codigo}\nAbre WhatsApp > Dispositivos vinculados > Vincular con el número de teléfono.`)
    } catch (error) {
      await ctx.responder(error.message)
    }
  }
}
