// Código Oficial de YuiBot-MD.by AmilcarGit
import { caja, mal } from '../../estilo/index.js'
import { buscarCiudad } from '../../nucleo/clima.js'

export default {
  nombre: 'hora',
  alias: ['time', 'horamundial'],
  categoria: 'herramientas',
  ayuda: 'Hora y fecha de una ciudad: .hora Tokio · .hora Madrid, España',
  async ejecutar(sock, m, ctx) {
    const consulta = ctx.args.join(' ').trim()
    if (!consulta) return ctx.responder(mal(`Dime la ciudad: ${ctx.prefijo}hora Tokio`))
    try {
      const c = await buscarCiudad(consulta)
      if (!c?.zona) return ctx.responder(mal(`No encontré "${consulta.slice(0, 40)}". Prueba con el país: ${ctx.prefijo}hora Córdoba, Argentina`))
      const ahora = new Date()
      const hora = new Intl.DateTimeFormat('es', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: c.zona }).format(ahora)
      const fecha = new Intl.DateTimeFormat('es', { weekday: 'long', day: 'numeric', month: 'long', timeZone: c.zona }).format(ahora)
      await ctx.responder(caja('Hora mundial', [`📍 ${c.nombre}${c.pais ? `, ${c.pais}` : ''}`, `🕒 *${hora}*`, `📅 ${fecha}`, `🌐 ${c.zona}`]))
    } catch (error) { console.error(`hora: ${error.message}`); await ctx.responder(mal('No pude consultar la hora ahora mismo (•́︵•̀)')) }
  }
}
