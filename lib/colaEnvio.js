// Cola de envío anti-ban.
//
// WhatsApp penaliza a las cuentas que mandan muchos mensajes seguidos o a un
// ritmo "de robot". Este envoltorio de sock.sendMessage:
//   - mantiene el ORDEN de los mensajes de cada chat (cola por chat),
//   - espera un mínimo (con un poco de azar) entre mensajes del mismo chat,
//   - separa también los envíos entre chats distintos (ritmo global),
//   - limita cuánto se puede acumular en un chat (si se llena, rechaza).
// No cambia lo que se envía ni lo que devuelve sendMessage.
// Para saltarse la cola en un caso puntual: sock.sendMessageDirecto(jid, contenido, opciones).

const POR_DEFECTO = {
  ENABLED: true,
  MIN_CHAT_MS: 700, // mínimo entre dos mensajes al mismo chat
  JITTER_MS: 300, // + un valor al azar entre 0 y esto
  MIN_GLOBAL_MS: 120, // mínimo entre dos envíos cualesquiera
  MAX_COLA_CHAT: 40, // mensajes en espera por chat
  TIMEOUT_ENVIO_MS: 90000, // si un envío no responde en este tiempo, se descarta para no bloquear el chat
}

const esperar = (ms) => (ms > 0 ? new Promise((resolve) => setTimeout(resolve, ms)) : Promise.resolve())

function conLimite(promesa, ms) {
  if (!ms) return promesa
  let temporizador
  const limite = new Promise((_, rechazar) => {
    temporizador = setTimeout(() => rechazar(new Error(`El envío no respondió en ${Math.round(ms / 1000)} s`)), ms)
  })
  return Promise.race([promesa, limite]).finally(() => clearTimeout(temporizador))
}

function crearColaEnvio(opciones = {}) {
  const cfg = { ...POR_DEFECTO, ...opciones }
  const chats = new Map() // jid -> { cola: [], procesando, ultimoEnvio }
  let ultimoGlobal = 0
  let relojGlobal = Promise.resolve()
  const estadisticas = { enviados: 0, fallidos: 0, rechazados: 0, esperaTotalMs: 0 }

  // Reserva el siguiente "turno" global, así los envíos de varios chats salen espaciados.
  function turnoGlobal() {
    const turno = relojGlobal.then(async () => {
      const faltante = ultimoGlobal + cfg.MIN_GLOBAL_MS - Date.now()
      await esperar(faltante)
      ultimoGlobal = Date.now()
    })
    relojGlobal = turno.catch(() => {})
    return turno
  }

  async function procesar(jid, estado, enviarReal) {
    if (estado.procesando) return
    estado.procesando = true
    try {
      while (estado.cola.length) {
        const tarea = estado.cola.shift()
        const inicio = Date.now()
        const faltanteChat = estado.ultimoEnvio + cfg.MIN_CHAT_MS + Math.random() * cfg.JITTER_MS - Date.now()
        await esperar(faltanteChat)
        await turnoGlobal()
        estadisticas.esperaTotalMs += Date.now() - inicio
        try {
          const resultado = await conLimite(enviarReal(...tarea.argumentos), cfg.TIMEOUT_ENVIO_MS)
          estadisticas.enviados++
          tarea.resolver(resultado)
        } catch (error) {
          estadisticas.fallidos++
          tarea.rechazar(error)
        }
        estado.ultimoEnvio = Date.now()
      }
    } finally {
      estado.procesando = false
      if (!estado.cola.length) chats.delete(jid)
    }
  }

  function envolver(sock) {
    if (!cfg.ENABLED || sock.sendMessageDirecto) return sock
    const enviarReal = sock.sendMessage.bind(sock)
    sock.sendMessageDirecto = enviarReal

    sock.sendMessage = (jid, contenido, opcionesEnvio) => {
      let estado = chats.get(jid)
      if (!estado) {
        estado = { cola: [], procesando: false, ultimoEnvio: 0 }
        chats.set(jid, estado)
      }
      if (estado.cola.length >= cfg.MAX_COLA_CHAT) {
        estadisticas.rechazados++
        return Promise.reject(new Error(`Cola de envío llena para ${jid} (${cfg.MAX_COLA_CHAT} mensajes en espera)`))
      }
      return new Promise((resolver, rechazar) => {
        estado.cola.push({ argumentos: [jid, contenido, opcionesEnvio], resolver, rechazar })
        procesar(jid, estado, enviarReal)
      })
    }

    sock.colaEnvio = { estado }
    return sock
  }

  function estado() {
    let enEspera = 0
    for (const c of chats.values()) enEspera += c.cola.length
    return {
      ...estadisticas,
      enEspera,
      chatsActivos: chats.size,
      esperaMediaMs: estadisticas.enviados ? Math.round(estadisticas.esperaTotalMs / estadisticas.enviados) : 0,
    }
  }

  return { envolver, estado, config: cfg }
}

module.exports = { crearColaEnvio, POR_DEFECTO }
