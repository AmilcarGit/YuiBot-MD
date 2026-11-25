// Código Oficial de YuiBot-MD.by AmilcarGit
import { caja, mal } from '../../estilo/index.js'
import { buscarCiudad, obtenerClima, resumen } from '../../nucleo/clima.js'

export default {
  nombre: 'clima',
  alias: ['tiempo', 'weather'],
  categoria: 'general',
  ayuda: 'El clima de una ciudad: .clima Lima (o .clima Madrid, España)',
  async ejecutar(sock, m, ctx) {
    const consulta = ctx.args.join(' ').trim()
    if (!consulta) return ctx.responder(mal(`Dime la ciudad: ${ctx.prefijo}clima Lima\nTambién con país: ${ctx.prefijo}clima Córdoba, España`))
    try {
      const ciudad = await buscarCiudad(consulta)
      if (!ciudad) return ctx.responder(mal(`No encontré "${consulta.slice(0, 40)}". Revisa el nombre o agrega el país: ${ctx.prefijo}clima Córdoba, Argentina`))
      const clima = await obtenerClima(ciudad.lat, ciudad.lon)
      await ctx.responder(caja('Clima', resumen(ciudad, clima)))
    } catch (error) {
      console.error(`clima: ${error.message}`)
      await ctx.responder(mal('No pude consultar el clima ahora mismo (•́︵•̀) Intenta de nuevo en un momento.'))
    }
  }
}
