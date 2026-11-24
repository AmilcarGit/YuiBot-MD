// Código Oficial de YuiBot-MD.by AmilcarGit
import fs from 'fs'
import path from 'path'
import ajustes from '../ajustes.js'
import { habilidades } from './cargador.js'
import { usuario, chat, moverUsuario, todosUsuarios } from './memoria.js'
import { encolar } from './cola.js'
import { aBotonesWa, textoAlterno } from './botones.js'
import { vigilar } from './guardia.js'
import { ganarXp } from './juego.js'
import { extraerTexto, soloNumero } from './utiles.js'
import { dice, mal, ok } from '../estilo/index.js'

/** Convierte un enlace o ruta (imagen, GIF o video) en el contenido que entiende sock.sendMessage; null si no hay. */
export function adjuntoDe(medio) {
  if (!medio) return null
  const ref = /^https?:\/\//i.test(medio) ? medio : path.resolve(medio)
  if (!/^https?:\/\//i.test(ref) && !fs.existsSync(ref)) return null
  const ext = ref.split('?')[0].split('.').pop().toLowerCase()
  if (['mp4', 'mov', 'webm', 'gif'].includes(ext)) return { video: { url: ref }, gifPlayback: true }
  if (['jpg', 'jpeg', 'png', 'webp'].includes(ext)) return { image: { url: ref } }
  return null
}

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

// WhatsApp a veces oculta el teléfono (id LID de 15 dígitos). Se busca el teléfono real en el mensaje,
// en el mapa LID→teléfono de la sesión o en la lista de participantes del grupo.
async function telefonoReal(sock, m, candidatos, meta) {
  const directo = candidatos.find(j => j.endsWith('@s.whatsapp.net'))
  if (directo) return directo
  const lid = candidatos.find(j => j.endsWith('@lid'))
  if (!lid) return undefined
  for (const extra of [m.key.senderPn, m.key.participantPn, m.senderPn]) {
    if (extra) return String(extra).includes('@') ? extra : `${extra}@s.whatsapp.net`
  }
  const participante = meta?.participants.find(p => p.id === lid || p.lid === lid)
  if (participante?.phoneNumber) return participante.phoneNumber
  try {
    const pn = await sock.signalRepository?.lidMapping?.getPNForLID?.(lid)
    if (pn) return pn
  } catch {}
  return undefined
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
  const meta = grupo ? await metadatos(sock, jid).catch(() => null) : null
  const pn = (await telefonoReal(sock, m, candidatos, meta)) || origen
  const numero = soloNumero(pn)
  const identidades = new Set([...candidatos, pn].map(soloNumero))
  // Si antes se guardó con el id oculto, el perfil se pasa al teléfono.
  for (const j of candidatos) if (j.endsWith('@lid')) moverUsuario(soloNumero(j), numero)

  const esDueno = ajustes.dueno.some(d => identidades.has(d))
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
    enviar: (contenido, opciones) => encolar(jid, () => sock.sendMessage(jid, contenido, opciones)),
    botonesActivos: ajustes.botones,
    // Regalo de monedas a otro jugador registrado en este mismo bot.
    regalar: async (destino, cantidad) => {
      if (destino === numero) throw new Error('No puedes regalarte a ti mismo.')
      const otro = todosUsuarios()[destino]
      if (!otro?.registrado) throw new Error('Ese número no está registrado en el bot.')
      if (u.monedas < cantidad) throw new Error('No tienes tantas monedas.')
      u.monedas -= cantidad
      otro.monedas += cantidad
      return { nombre: otro.nombre }
    },
    // Texto con botones; si WhatsApp no los acepta, el mismo texto con los atajos escritos.
    botones: (contenido, lista, { pie, media } = {}) => encolar(jid, async () => {
      if (ajustes.botones) {
        try {
          // Con imagen, GIF o video: el texto va como pie de la imagen y los botones debajo.
          const adjunto = adjuntoDe(media)
          if (adjunto) {
            try {
              return await sock.sendMessage(jid, { ...adjunto, caption: contenido, footer: pie || ajustes.nombre, buttonsFormat: ajustes.botonesFormato, buttons: aBotonesWa(lista, ctx.prefijo) }, { quoted: m })
            } catch (error) {
              console.error(`Botones con medio: ${error.message}`)
            }
          }
          return await sock.sendMessage(jid, { text: contenido, footer: pie || ajustes.nombre, buttonsFormat: ajustes.botonesFormato, buttons: aBotonesWa(lista, ctx.prefijo) }, { quoted: m })
        } catch (error) {
          console.error(`Botones: ${error.message}`)
        }
      }
      return sock.sendMessage(jid, { text: contenido + textoAlterno(lista, ctx.prefijo) }, { quoted: m })
    })
  }

  u.mensajes++
  if (Date.now() - u.ultimoXp > 10000) {
    u.ultimoXp = Date.now()
    if (ganarXp(u, 3) && u.registrado) {
      await ctx.responder(ok(dice('nivelUp', { nombre: u.nombre, nivel: u.nivel })))
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
  if (habilidad.soloDueno && !esDueno) return ctx.responder(mal(dice('soloDueno')))
  if (habilidad.soloGrupo && !grupo) return ctx.responder(mal(dice('soloGrupo')))
  if (habilidad.soloPrivado && grupo) return ctx.responder(mal(dice('soloPrivado')))
  if (habilidad.soloAdmin && !esAdmin && !esDueno) {
    return ctx.responder(mal(dice('soloAdmin')))
  }
  if (habilidad.registro && !u.registrado) {
    return ctx.responder(mal(dice('registro', { prefijo })))
  }

  try {
    await habilidad.ejecutar(sock, m, ctx)
  } catch (error) {
    console.error(`Error en ${habilidad.nombre}:`, error)
    await ctx.responder(mal(dice('fallo')))
  }
}
