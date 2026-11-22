// Código Oficial de YuiBot-MD.by AmilcarGit
export default {
  nombre: 'ping',
  alias: ['p'],
  categoria: 'general',
  ayuda: 'Velocidad de respuesta',
  async ejecutar(sock, m, ctx) {
    const ms = Math.max(0, Date.now() - Number(m.messageTimestamp) * 1000)
    await ctx.responder(`Pong ${ms} ms`)
  }
}
