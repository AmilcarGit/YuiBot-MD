// Código Oficial de YuiBot-MD.by AmilcarGit
import { crearSubbot } from '../../nucleo/subbots.js'
import { aviso, caja, dice, mal } from '../../estilo/index.js'
import { animar, cuadrosCarga } from '../../nucleo/animar.js'
import { conBotones } from '../../nucleo/botones.js'

export default {
  nombre: 'serbot',
  alias: ['jadibot'],
  categoria: 'subbots',
  ayuda: 'Conviértete en sub-bot con un código',
  soloPrivado: true,
  async ejecutar(sock, m, ctx) {
    try {
      const animacion = animar(ctx, cuadrosCarga('Generando tu código…', { pasos: 4 }))
        .then(clave => clave || ctx.responder(aviso(dice('serbotGenerando'))))
        .catch(() => {})
      const codigo = await crearSubbot(ctx.numero)
      await animacion
      await conBotones(ctx, caja('Código de vinculación', [
        dice('serbotCodigo'),
        '',
        `🔑 ${codigo}`,
        '',
        'WhatsApp › Dispositivos vinculados › Vincular con el número de teléfono'
      ]), [{ texto: '📡 Ver mi estado', cmd: 'mibot' }, { texto: '🎟️ Cupos', cmd: 'cupos' }])
    } catch (error) {
      await ctx.responder(mal(error.message))
    }
  }
}
