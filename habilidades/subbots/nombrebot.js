// Código Oficial de YuiBot-MD.by AmilcarGit
import { mal } from '../../estilo/index.js'
import { esSubbot, guardarConfigSubbot } from '../../nucleo/subbots.js'
import ajustes from '../../ajustes.js'

const soloNumero = sock => String(sock?.user?.id || '').replace(/:\d+(?=@)/, '').replace(/@.*/, '')

export default {
  nombre: 'nombrebot',
  alias: ['setnombre', 'nombresubbot'],
  categoria: 'subbots',
  ayuda: 'Ponle nombre a tu sub-bot (sale en su menú y botones): .nombrebot Mi Bot',
  soloDueno: true,
  async ejecutar(sock, m, ctx) {
    if (!esSubbot(sock)) return ctx.responder(mal('Este comando es solo para sub-bots: cambia el nombre de tu propio bot.'))
    const nombre = ctx.args.join(' ').replace(/\s+/g, ' ').trim()
    if (!nombre) return ctx.responder(mal(`¿Cómo lo llamamos? ${ctx.prefijo}nombrebot Mi Bot\nPara volver al nombre normal: ${ctx.prefijo}nombrebot reset`))
    if (/^(reset|restaurar|normal)$/i.test(nombre)) { guardarConfigSubbot(soloNumero(sock), { nombre: null }); return ctx.responder(`✅ Nombre restaurado: *${ajustes.nombre}*`) }
    if (nombre.length > 20) return ctx.responder(mal(`Máximo 20 letras (tiene ${nombre.length}).`))
    guardarConfigSubbot(soloNumero(sock), { nombre })
    await ctx.responder(`✅ Tu sub-bot ahora se llama *${nombre}*. Lo verás en el menú y en los botones.`)
  }
}
