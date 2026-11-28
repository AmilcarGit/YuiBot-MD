// Código Oficial de YuiBot-MD.by AmilcarGit
import { caja, mal } from '../../estilo/index.js'
import { conBotones } from '../../nucleo/botones.js'
import { configSubbot, esSubbot, guardarConfigSubbot } from '../../nucleo/subbots.js'
import ajustes from '../../ajustes.js'

export const PREFIJO_VALIDO = /^[^\p{L}\p{N}\s]{1,3}$/u
const soloNumero = sock => String(sock?.user?.id || '').replace(/:\d+(?=@)/, '').replace(/@.*/, '')

export default {
  nombre: 'prefijo',
  alias: ['setprefijo', 'cambiarprefijo'],
  categoria: 'subbots',
  ayuda: 'Cambia el prefijo de tu sub-bot: .prefijo ! · .prefijo reset',
  soloDueno: true,
  async ejecutar(sock, m, ctx) {
    if (!esSubbot(sock)) return ctx.responder(mal('Este comando es solo para sub-bots: cambia el prefijo de tu propio bot.'))
    const numero = soloNumero(sock)
    const nuevo = (ctx.args[0] || '').trim()
    if (!nuevo) {
      const actual = configSubbot(numero).prefijo || ajustes.prefijos.join(' ')
      return conBotones(ctx, caja('Prefijo de tu sub-bot', [`⚙️ Ahora: *${actual}*`, '', `Cámbialo así: ${ctx.prefijo}prefijo !`, 'Puede ser 1 a 3 símbolos (no letras ni números).']), [
        { texto: '! (exclamación)', cmd: 'prefijo !' }, { texto: '# (numeral)', cmd: 'prefijo #' }, { texto: '↩️ Restaurar', cmd: 'prefijo reset' }
      ])
    }
    if (/^(reset|restaurar|normal)$/i.test(nuevo)) {
      guardarConfigSubbot(numero, { prefijo: null })
      return ctx.responder(`✅ Prefijo restaurado: ahora uso *${ajustes.prefijos[0]}* (•ᴗ•)`)
    }
    if (!PREFIJO_VALIDO.test(nuevo)) return ctx.responder(mal('Usa de 1 a 3 símbolos, sin letras, números ni espacios. Ejemplo: ! # / $'))
    guardarConfigSubbot(numero, { prefijo: nuevo })
    await ctx.responder(`✅ Listo, desde ahora tu sub-bot responde con *${nuevo}* (ejemplo: ${nuevo}menu).\nSi lo olvidas, escribe ${nuevo}prefijo reset.`)
  }
}
