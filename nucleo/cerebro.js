// Código Oficial de YuiBot-MD.by AmilcarGit
import ajustes from '../ajustes.js'
import { habilidades } from './cargador.js'
import { usuario, chat } from './memoria.js'
import { encolar } from './cola.js'
import { vigilar } from './guardia.js'
import { ganarXp } from './juego.js'
import { extraerTexto, soloNumero } from './utiles.js'

const cacheGrupos = new Map()

async function metadatos(sock, jid) {
  const previo = cacheGrupos.get(jid)
  if (previo && Date.now() - previo.hora < 60000) return previo.datos
  const datos = await sock.groupMetadata(jid)
  cacheGrupos.set(jid, { datos, hora: Date.now() })
  return datos
}

function esAdminDe(meta, identidades) {
  return Boolean(meta?.participants.some(p =>
    p.admin && [p.id, p.lid, p.phoneNumber].some(x => x && identidades.has(soloNumero(x)))
  ))
}

export async function procesar(sock, { messages, type }) {
  if (type !== 'notify') return
  await Promise.all(messages.map(m => atender(sock, m).catch(error => console.error(error))))
}

async function atender(sock, m) {
  if (!m.message || m.key.fromMe) return

  const jid = m.key.remoteJid
  if (!jid || jid === 'status@broadcast' || jid.endsWith('@newsletter')) return

  const grupo = jid.endsWith('@g.us')
  const origen = grupo ? m.key.participant : jid
  if (!origen) return

  const candidatos = [origen, m.key.participantAlt, m.key.remoteJidAlt].filter(Boolean)
  const pn = candidatos.find(j => j.endsWith('@s.whatsapp.net')) || origen
  const numero = soloNumero(pn)
  const identidades = new Set(candidatos.map(soloNumero))

  const esDueno = ajustes.dueno.some(d => identidades.has(d))
  const meta = grupo ? await metadatos(sock, jid).catch(() => null) : null
  const esAdmin = grupo ? esAdminDe(meta, identidades) : false

  const texto = extraerTexto(m)
  const u = usuario(numero)
  const c = chat(jid)

  const ctx = {
    sock,
    m,
    jid,
    grupo,
    numero,
    texto,
    esDueno,
    esAdmin,
    usuario: u,
    chat: c,
    prefijo: '',
    args: [],
    responder: contenido => encolar(jid, () => sock.sendMessage(jid, { text: contenido }, { quoted: m })),
    enviar: (contenido, opciones) => encolar(jid, () => sock.sendMessage(jid, contenido, opciones))
  }

  u.mensajes++
  if (Date.now() - u.ultimoXp > 10000) {
    u.ultimoXp = Date.now()
    if (ganarXp(u, 3) && u.registrado) {
      await ctx.responder(`${u.nombre} subió al nivel ${u.nivel}.`)
    }
  }

  if (await vigilar(ctx)) return

  const prefijo = ajustes.prefijos.find(p => texto.startsWith(p))
  if (!prefijo) return

  const [nombre, ...args] = texto.slice(prefijo.length).trim().split(/\s+/)
  const habilidad = habilidades.get((nombre || '').toLowerCase())
  if (!habilidad) return

  Object.assign(ctx, { prefijo, args, comando: habilidad.nombre })

  if (grupo && c.soloAdmin && !esAdmin && !esDueno) return
  if (habilidad.soloDueno && !esDueno) return ctx.responder('Solo el dueño puede usar este comando.')
  if (habilidad.soloGrupo && !grupo) return ctx.responder('Este comando solo funciona en grupos.')
  if (habilidad.soloPrivado && grupo) return ctx.responder('Este comando solo funciona en privado.')
  if (habilidad.soloAdmin && !esAdmin && !esDueno) {
    return ctx.responder('Solo los administradores pueden usar este comando.')
  }
  if (habilidad.registro && !u.registrado) {
    return ctx.responder(`Regístrate primero con ${prefijo}registrar tuNombre`)
  }

  try {
    await habilidad.ejecutar(sock, m, ctx)
  } catch (error) {
    console.error(`Error en ${habilidad.nombre}:`, error)
    await ctx.responder('Ocurrió un error, inténtalo de nuevo.')
  }
}
