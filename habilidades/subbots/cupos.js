// Código Oficial de YuiBot-MD.by AmilcarGit
import { caja } from '../../estilo/index.js'
import { conBotones } from '../../nucleo/botones.js'
import { animar, cuadrosCarga } from '../../nucleo/animar.js'
import { cupos } from '../../nucleo/subbots.js'

export default {
  nombre: 'cupos',
  alias: ['cuposbot', 'espacios'],
  categoria: 'subbots',
  ayuda: 'Cuántos lugares libres hay para sub-bots',
  async ejecutar(sock, m, ctx) {
    await animar(ctx, cuadrosCarga('Contando cupos…', { pasos: 3 }))
    const c = cupos()
    const texto = caja('Cupos de sub-bots', [`🤖 En uso: ${c.usados} de ${c.maximo}`, c.libres ? `🟢 Libres: ${c.libres}` : '🔴 No hay cupos ahora mismo'])
    if (c.libres && !ctx.grupo) return conBotones(ctx, texto, [{ texto: '🤖 Crear sub-bot', cmd: 'serbot' }])
    await ctx.responder(c.libres ? `${texto}\n\n💡 Pídelo por privado con ${ctx.prefijo}serbot` : texto)
  }
}
