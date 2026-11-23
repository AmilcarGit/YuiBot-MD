// Código Oficial de YuiBot-MD.by AmilcarGit
import { tirar, logro } from '../../nucleo/juego.js'
import { formato } from '../../nucleo/utiles.js'
import { caja, dice, mal, temaActivo } from '../../estilo/index.js'
import { conBotones } from '../../nucleo/botones.js'

const COSTO = 200

const marcas = { Común: '⚪', Rara: '🔵', Épica: '🟣', Legendaria: '🌟' }
const frases = { Común: 'gachaComun', Rara: 'gachaRara', Épica: 'gachaEpica', Legendaria: 'gachaLegendaria' }

export default {
  nombre: 'gacha',
  alias: ['invocar'],
  categoria: 'economia',
  ayuda: `Invoca un personaje por ${COSTO} monedas`,
  registro: true,
  async ejecutar(sock, m, ctx) {
    const u = ctx.usuario
    if (u.monedas < COSTO) return ctx.responder(mal(dice('gachaSinMonedas', { costo: COSTO })))

    u.monedas -= COSTO
    const { rareza, personaje } = tirar(Boolean(u.inventario.amuleto))
    u.coleccion[personaje] = (u.coleccion[personaje] || 0) + 1

    const e = temaActivo().emojis
    const nuevoLogro = rareza === 'Legendaria' && logro(u, 'legendario')
    await conBotones(ctx, caja('Invocación', [
      dice(frases[rareza], { personaje }),
      '',
      `${marcas[rareza]} ${personaje} · ${rareza}`,
      `${e.dinero} Te quedan ${formato(u.monedas)}`,
      nuevoLogro && `${e.logro} Logro: Personaje legendario`
    ]), [{ texto: `🎰 Otra (${COSTO})`, cmd: 'gacha' }, { texto: '🎒 Inventario', cmd: 'inventario' }])
  }
}
