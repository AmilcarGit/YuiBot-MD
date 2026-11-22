// Código Oficial de YuiBot-MD.by AmilcarGit
export default function interruptor(nombre, campo, ayuda, alias = []) {
  return {
    nombre,
    alias,
    categoria: 'grupo',
    ayuda,
    soloGrupo: true,
    soloAdmin: true,
    async ejecutar(sock, m, ctx) {
      const opcion = ctx.args[0]?.toLowerCase()
      if (!['on', 'off'].includes(opcion)) {
        return ctx.responder(`Uso: ${ctx.prefijo}${nombre} on|off`)
      }
      ctx.chat[campo] = opcion === 'on'
      await ctx.responder(`${nombre} ${opcion === 'on' ? 'activado' : 'desactivado'}.`)
    }
  }
}
