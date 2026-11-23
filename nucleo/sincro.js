// Código Oficial de YuiBot-MD.by AmilcarGit
// Sincroniza a los jugadores registrados con YuiBot-datos (ranking global y panel web).
// El bot manda DELTAS (lo ganado/gastado desde la última vez); el servidor suma, aplica topes y devuelve el total.
import fs from 'fs'
import path from 'path'
import crypto from 'crypto'
import ajustes from '../ajustes.js'
import { api, activa } from './api.js'
import { todosUsuarios, guardar } from './memoria.js'
import { nivelDe } from './juego.js'

const MAX_USUARIOS = 100
// Aunque no haya cambios, cada tanto se consulta al servidor para enterarse de lo hecho en la web de Yui.
const LATIDO_MS = 600000
// Topes por sincronización (los mismos que aplica el servidor); lo que sobre se envía en la siguiente.
const TOPE = { monedas: 100000, xp: 2000, mensajes: 500, trabajosVeces: 100, trabajosGanado: 100000 }
const CAMPOS = ['monedas', 'xp', 'mensajes', 'trabajosGanado', 'trabajosVeces']

const limitar = (n, min, max) => Math.min(max, Math.max(min, Math.trunc(Number(n) || 0)))
export const telefonoValido = id => /^\d{6,14}$/.test(String(id))
const enmascarar = n => (n.length >= 6 ? `${n.slice(0, 3)}•••${n.slice(-3)}` : '•••')

const suma = o => Object.values(o || {}).reduce((a, b) => a + (Number(b) || 0), 0)

function valores(u) {
  return {
    monedas: u.monedas || 0,
    xp: u.xp || 0,
    mensajes: u.mensajes || 0,
    trabajosGanado: u.trabajosGanado || 0,
    trabajosVeces: suma(u.veces),
    veces: { ...(u.veces || {}) },
    semana: u.semana || '',
    xpSemana: u.xpSemana || 0
  }
}

// Lo que no es un contador: se manda completo y gana el más reciente. Sin nombre: la API solo guarda datos de juego.
function registro(u) {
  return {
    racha: u.racha || 0,
    mejorRacha: u.racha || 0,
    ultimoDaily: u.ultimoDaily || 0,
    ultimoXp: u.ultimoXp || 0,
    ultimoTrabajo: u.ultimoTrabajo || 0,
    esperaTrabajo: u.esperaTrabajo || 0,
    ultimoAdivina: u.ultimoAdivina || 0,
    coleccion: { ...(u.coleccion || {}) },
    trabajo: u.trabajo || '',
    semana: u.semana || '',
    inventario: Object.keys(u.inventario || {}).filter(k => u.inventario[k]),
    logros: Object.fromEntries((u.logros || []).map(id => [id, 1]))
  }
}

const huella = r => crypto.createHash('sha1').update(JSON.stringify(r)).digest('hex')

/** Arma lo que hay que enviar. `estado.usuarios[numero]` es lo último que el servidor confirmó de cada persona. */
export function construirEnvio(usuarios, estado, ahora = Date.now(), limite = MAX_USUARIOS) {
  const envio = {}
  const enviados = {}

  for (const [numero, u] of Object.entries(usuarios)) {
    if (!u.registrado || !telefonoValido(numero)) continue
    if (Object.keys(envio).length >= limite) break

    const foto = estado.usuarios[numero]
    const actual = valores(u)
    const r = registro(u)
    const h = huella(r)
    const d = {}
    const t = { ganado: 0, veces: {} }

    if (!foto) {
      // Primera vez: lo que ya tenía antes de conectarse (el servidor lo acepta una sola vez como "semilla").
      for (const c of CAMPOS) d[c] = actual[c]
      d.xpSemana = actual.xpSemana
      t.ganado = actual.trabajosGanado
      t.veces = { ...actual.veces }
    } else {
      d.monedas = limitar(actual.monedas - foto.monedas, -TOPE.monedas, TOPE.monedas)
      for (const c of ['xp', 'mensajes', 'trabajosGanado', 'trabajosVeces']) d[c] = limitar(actual[c] - (foto[c] || 0), 0, TOPE[c])
      d.xpSemana = limitar(foto.semana === actual.semana ? actual.xpSemana - (foto.xpSemana || 0) : actual.xpSemana, 0, TOPE.xp)
      t.ganado = d.trabajosGanado
      for (const [k, v] of Object.entries(actual.veces)) {
        const n = limitar(v - (foto.veces?.[k] || 0), 0, TOPE.trabajosVeces)
        if (n) t.veces[k] = n
      }
    }

    // `actualizado` es la hora del último cambio REAL del bot: así una consulta sin cambios nunca pisa lo hecho en la web.
    const cambioRegistro = !foto || foto.h !== h
    const cambio = cambioRegistro || Object.values(d).some(Boolean)
    const latido = !foto || ahora - (foto.visto || 0) > LATIDO_MS
    if (!cambio && !latido) continue
    const hora = cambio ? ahora : foto.cambio || ahora

    const item = { u: { r: { ...r, actualizado: hora }, d }, vis: enmascarar(numero) }
    if (!foto) item.u.semilla = true
    if (t.ganado || Object.keys(t.veces).length) item.t = { r: { actualizado: hora }, d: t }

    envio[numero] = item
    enviados[numero] = { ...actual, h, cambio: cambioRegistro ? ahora : foto.cambio || ahora }
  }
  return { envio, enviados }
}

// `previo` es lo que el servidor tenía ANTES de sumar lo nuestro; si cambió desde la última vez, alguien más
// (la web de Yui u otra instalación) ganó o gastó, y el bot lo refleja. Lo que el servidor recortó por topes
// sigue pendiente en el bot y se sube en la siguiente sincronización (nada se pierde).
// Con un servidor viejo (sin `previo`) solo se suben los totales: el bot nunca pierde monedas.
function aplicarUsuario(u, enviado, srv, previo, anterior) {
  for (const c of ['monedas', 'xp']) {
    if (previo && Number.isFinite(Number(previo[c]))) {
      u[c] = Math.max(0, u[c] + Number(previo[c]) - (anterior?.[c] ?? 0))
    } else {
      const total = Number(srv[c])
      if (Number.isFinite(total) && total > enviado[c]) u[c] += total - enviado[c]
    }
  }
  u.nivel = Math.max(u.nivel || 1, nivelDe(u.xp))
  // Si el daily se cobró en otro lado, la racha también viene de allí.
  if ((Number(srv.ultimoDaily) || 0) > (u.ultimoDaily || 0) && Number.isFinite(Number(srv.racha))) u.racha = Number(srv.racha)
  for (const c of ['ultimoDaily', 'ultimoXp', 'ultimoAdivina']) u[c] = Math.max(u[c] || 0, Number(srv[c]) || 0)
  // El descanso del trabajo viaja junto con la hora del último cobro.
  if ((Number(srv.ultimoTrabajo) || 0) > (u.ultimoTrabajo || 0)) {
    u.ultimoTrabajo = Number(srv.ultimoTrabajo)
    u.esperaTrabajo = Number(srv.esperaTrabajo) || u.esperaTrabajo
    if (/^[a-z]{1,20}$/.test(srv.trabajo)) u.trabajo = srv.trabajo
  }
  if (!u.trabajo && typeof srv.trabajo === 'string' && /^[a-z]{1,20}$/.test(srv.trabajo)) u.trabajo = srv.trabajo

  if (Array.isArray(srv.inventario)) for (const id of srv.inventario) if (/^[\w-]{1,30}$/.test(id) && !u.inventario[id]) u.inventario[id] = true
  if (srv.logros && typeof srv.logros === 'object') for (const id of Object.keys(srv.logros)) if (/^[\w-]{1,30}$/.test(id) && !u.logros.includes(id)) u.logros.push(id)
  if (srv.coleccion && typeof srv.coleccion === 'object') {
    u.coleccion ??= {}
    for (const [id, n] of Object.entries(srv.coleccion)) if (/^[\wÀ-ÿ ,.-]{1,40}$/.test(id) && Number(n) > (u.coleccion[id] || 0)) u.coleccion[id] = Number(n)
  }
}

/** Aplica la respuesta del servidor. Devuelve 'reinicio' si la base fue reiniciada, si no 'ok'. */
export function aplicarRespuesta(usuarios, estado, envio, enviados, respuesta, ahora = Date.now()) {
  if (respuesta.epoca) estado.epoca = respuesta.epoca
  if (respuesta.reinicio) {
    estado.usuarios = {}
    return 'reinicio'
  }

  for (const numero of Object.keys(envio)) {
    const error = respuesta.errores?.[numero]
    const srv = respuesta.usuarios?.[numero]?.u
    if (error === 'ocupado') continue // otra sincronización a la vez: se reintenta en el próximo ciclo
    const foto = { ...enviados[numero], visto: ahora }
    if (srv && usuarios[numero]) {
      aplicarUsuario(usuarios[numero], enviados[numero], srv, respuesta.usuarios[numero].previo, estado.usuarios[numero])
      // La referencia es lo que el servidor tiene ahora; la diferencia con el bot se enviará después.
      foto.monedas = Number(srv.monedas) || 0
      foto.xp = Number(srv.xp) || 0
    }
    estado.usuarios[numero] = foto
  }
  return 'ok'
}

// ── Estado en disco y ciclo ────────────────────────────────────────
const archivo = () => path.resolve('data', 'datos.json')
const info = { ultimoOk: 0, ultimoError: '', enviados: 0 }
let estado = null
let pendiente = null
let espera = ajustes.sincroMs

function cargar() {
  try {
    const leido = JSON.parse(fs.readFileSync(archivo(), 'utf8'))
    return { id: '', clave: '', epoca: '', ...leido, usuarios: leido.usuarios || {} }
  } catch {
    return { id: '', clave: '', epoca: '', usuarios: {} }
  }
}

function guardarEstado() {
  fs.mkdirSync(path.dirname(archivo()), { recursive: true })
  const temporal = `${archivo()}.tmp`
  fs.writeFileSync(temporal, JSON.stringify(estado))
  fs.renameSync(temporal, archivo())
}

async function ciclo() {
  estado ??= cargar()
  if (!estado.id) {
    const nueva = await api.registrar()
    Object.assign(estado, { id: nueva.id, clave: nueva.clave, epoca: '', usuarios: {} })
    guardarEstado()
    console.log('YuiBot-datos: instalación registrada.')
  }

  for (let lote = 0; lote < 5; lote++) {
    if (!pendiente) {
      const { envio, enviados } = construirEnvio(todosUsuarios(), estado)
      if (!Object.keys(envio).length) break
      const cuerpo = { rid: crypto.randomUUID(), usuarios: envio }
      if (estado.epoca) cuerpo.epoca = estado.epoca
      pendiente = { cuerpo, envio, enviados }
    }
    // Si falla, `pendiente` se conserva y se reintenta igual (mismo rid): el servidor no suma dos veces.
    const respuesta = await api.sync({ id: estado.id, clave: estado.clave }, pendiente.cuerpo)
    const { envio, enviados } = pendiente
    pendiente = null
    const resultado = aplicarRespuesta(todosUsuarios(), estado, envio, enviados, respuesta)
    guardarEstado()
    guardar()
    info.enviados += Object.keys(envio).length
    if (resultado === 'reinicio') continue
    if (Object.keys(envio).length < MAX_USUARIOS) break
  }
  info.ultimoOk = Date.now()
  info.ultimoError = ''
}

async function intento() {
  try {
    await ciclo()
    espera = ajustes.sincroMs
  } catch (error) {
    info.ultimoError = error.message
    if (error.estado === 401) {
      // La API ya no conoce esta instalación: se registra de nuevo.
      estado = { id: '', clave: '', epoca: '', usuarios: {} }
      pendiente = null
      espera = 5000
    } else {
      espera = Math.min(espera * 2, error.estado === 403 ? 3600000 : 600000)
    }
    console.error(`YuiBot-datos: ${error.message}`)
  }
}

function programar() {
  setTimeout(async () => {
    await intento()
    programar()
  }, espera).unref()
}

/** Sincroniza ya (lo usa el comando .datos ahora). */
export const sincronizarAhora = intento

/** Credenciales de esta instalación (para pedir códigos de enlace). */
export const credenciales = () => (estado?.id ? { id: estado.id, clave: estado.clave } : null)

export const estadoSincro = () => ({
  activa: activa(),
  url: activa() ? new URL(ajustes.datosUrl).host : '',
  id: estado?.id || '',
  ...info
})

export function iniciarSincro() {
  if (!activa()) return
  setTimeout(intento, 3000).unref()
  programar()
}
