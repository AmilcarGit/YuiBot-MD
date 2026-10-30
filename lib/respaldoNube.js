// Respaldo automático de data/ en un repositorio PRIVADO de GitHub (opción A).
//
//  · Se activa solo si en el .env hay RESPALDO_REPO y RESPALDO_TOKEN (nadie más puede activarlo).
//  · Cada RESPALDO_CADA_MIN minutos (60 por defecto) sube SOLO los archivos que cambiaron, en un solo commit.
//  · Se niega a subir nada si el repositorio es público (los datos tienen números de teléfono).
//  · Al arrancar con data/ vacío (instalación nueva) restaura el último respaldo.
//  · Nunca imprime el token; los errores salen con el token tapado.
//
// Usa la API de Git de GitHub (blobs → árbol → commit → rama), así que no necesita git instalado
// ni tiene el límite de 1 MB de la API de contenidos.
const fs = require('fs')
const path = require('path')
const crypto = require('crypto')
const { fetchSeguro } = require('./http')

const RAIZ = path.join(__dirname, '..')
const DATA = path.join(RAIZ, 'data')
const BACKUPS = path.join(RAIZ, 'backups')
const API = 'https://api.github.com'
const MAX_ARCHIVO = 50 * 1024 * 1024
const MIN_MINUTOS = 5

// ── Ajustes (solo desde el entorno / .env) ────────────────────────────
function leerAjustes(env = process.env) {
  const repo = String(env.RESPALDO_REPO || '').trim().replace(/^https?:\/\/github\.com\//i, '').replace(/\.git$/i, '').replace(/\/+$/, '')
  const token = String(env.RESPALDO_TOKEN || '').trim()
  const valido = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repo)
  const minutos = Math.max(MIN_MINUTOS, Number(env.RESPALDO_CADA_MIN) || 60)
  const excluir = String(env.RESPALDO_EXCLUIR ?? 'api-proveedores.json,sync-clave.json').split(',').map((s) => s.trim()).filter(Boolean)
  return {
    activo: Boolean(valido && token),
    repo: valido ? repo : '',
    token,
    cadaMs: minutos * 60 * 1000,
    minutos,
    rama: String(env.RESPALDO_RAMA || '').trim(),
    excluir,
    motivo: !repo && !token ? 'sin configurar' : !valido ? 'RESPALDO_REPO debe ser usuario/repositorio' : !token ? 'falta RESPALDO_TOKEN' : '',
  }
}

const tapar = (texto, token) => {
  let t = String(texto ?? '')
  if (token) t = t.split(token).join('***')
  return t.replace(/(github_pat_|ghp_|gho_|ghs_)[A-Za-z0-9_]+/g, '$1***')
}

// ── Cliente mínimo de GitHub ──────────────────────────────────────────
function crearCliente(ajustes, fetchFn = fetchSeguro) {
  async function pedir(metodo, ruta, cuerpo) {
    const res = await fetchFn(`${API}${ruta}`, {
      method: metodo,
      headers: {
        Authorization: `Bearer ${ajustes.token}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        'User-Agent': 'YuiBot-MD-respaldo',
        ...(cuerpo ? { 'Content-Type': 'application/json' } : {}),
      },
      body: cuerpo ? JSON.stringify(cuerpo) : undefined,
    })
    let datos = null
    try { datos = await res.json() } catch { /* sin cuerpo */ }
    if (!res.ok) {
      const e = new Error(tapar(`GitHub respondió ${res.status}${datos?.message ? `: ${datos.message}` : ''}`, ajustes.token))
      e.status = res.status
      throw e
    }
    return datos
  }
  return { pedir }
}

/** Revisa el repo (que sea privado), elige la rama y crea el primer commit si el repo está vacío. */
async function prepararRepo(cli, ajustes) {
  const r = `/repos/${ajustes.repo}`
  const info = await cli.pedir('GET', r)
  if (info.private !== true) {
    const e = new Error('El repositorio de respaldo es PÚBLICO. No subo nada: ponlo en privado (Settings → Danger zone → Change visibility).')
    e.codigo = 'PUBLICO'
    throw e
  }
  const rama = ajustes.rama || info.default_branch || 'main'
  const leerRef = () => cli.pedir('GET', `${r}/git/ref/heads/${encodeURIComponent(rama)}`)
  try {
    return { rama, ref: await leerRef() }
  } catch (e) {
    if (e.status !== 404 && e.status !== 409) throw e
  }
  // Repo vacío: la API de contenidos sí puede crear el primer commit.
  const leeme = '# Respaldo de YuiBot-MD\n\nRepositorio privado con copias automáticas de la carpeta `data/`. No lo hagas público: contiene números de teléfono.\n'
  await cli.pedir('PUT', `${r}/contents/LEEME.md`, { message: 'Inicio del respaldo', content: Buffer.from(leeme).toString('base64'), ...(ajustes.rama ? { branch: ajustes.rama } : {}) })
  return { rama, ref: await leerRef() }
}

// ── Archivos locales ──────────────────────────────────────────────────
const shaGit = (buf) => crypto.createHash('sha1').update(Buffer.concat([Buffer.from(`blob ${buf.length}\0`), buf])).digest('hex')

function listarLocales(dir, excluir = []) {
  const salida = []
  const recorrer = (d, prefijo) => {
    if (!fs.existsSync(d)) return
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      if (e.name.startsWith('.tmp-') || e.name.startsWith('.')) continue
      const rel = prefijo ? `${prefijo}/${e.name}` : e.name
      if (e.isDirectory()) { recorrer(path.join(d, e.name), rel); continue }
      if (!e.isFile() || excluir.includes(e.name) || excluir.includes(rel)) continue
      salida.push(rel)
    }
  }
  recorrer(dir, '')
  return salida.sort()
}

/** Lee un archivo y verifica que un .json sea válido (no se respalda un archivo dañado). */
function leerSeguro(dir, rel) {
  const ruta = path.join(dir, rel)
  const st = fs.statSync(ruta)
  if (st.size > MAX_ARCHIVO) return { saltado: 'muy grande' }
  const buf = fs.readFileSync(ruta)
  if (rel.endsWith('.json')) { try { JSON.parse(buf.toString('utf8')) } catch { return { saltado: 'JSON dañado' } } }
  return { buf }
}

// ── Subir ─────────────────────────────────────────────────────────────
/**
 * Sube a GitHub lo que cambió. → { subidos:[…], sinCambios:boolean, saltados:[…], commit }
 */
async function subir({ ajustes = leerAjustes(), fetchFn, dir = DATA, ahora = new Date() } = {}) {
  if (!ajustes.activo) throw new Error(`Respaldo apagado (${ajustes.motivo || 'sin configurar'}).`)
  const cli = crearCliente(ajustes, fetchFn)
  const r = `/repos/${ajustes.repo}`

  const locales = {}
  const saltados = []
  for (const rel of listarLocales(dir, ajustes.excluir)) {
    const l = leerSeguro(dir, rel)
    if (l.saltado) saltados.push(`${rel} (${l.saltado})`)
    else locales[`data/${rel}`] = l.buf
  }
  if (!Object.keys(locales).length) return { subidos: [], sinCambios: true, saltados, vacio: true }

  for (let intento = 0; intento < 2; intento++) {
    const { rama, ref } = await prepararRepo(cli, ajustes)
    const base = ref.object.sha
    const commitBase = await cli.pedir('GET', `${r}/git/commits/${base}`)
    const arbol = await cli.pedir('GET', `${r}/git/trees/${commitBase.tree.sha}?recursive=1`)
    const remoto = new Map((arbol.tree || []).filter((t) => t.type === 'blob').map((t) => [t.path, t.sha]))

    const cambios = Object.keys(locales).filter((p) => remoto.get(p) !== shaGit(locales[p]))
    if (!cambios.length) return { subidos: [], sinCambios: true, saltados }

    const entradas = []
    for (const p of cambios) {
      const blob = await cli.pedir('POST', `${r}/git/blobs`, { content: locales[p].toString('base64'), encoding: 'base64' })
      entradas.push({ path: p, mode: '100644', type: 'blob', sha: blob.sha })
    }
    const arbolNuevo = await cli.pedir('POST', `${r}/git/trees`, { base_tree: commitBase.tree.sha, tree: entradas })
    const marca = ahora.toISOString().replace('T', ' ').slice(0, 16)
    const commit = await cli.pedir('POST', `${r}/git/commits`, { message: `respaldo ${marca} UTC (${cambios.length} archivo${cambios.length === 1 ? '' : 's'})`, tree: arbolNuevo.sha, parents: [base] })
    try {
      await cli.pedir('PATCH', `${r}/git/refs/heads/${encodeURIComponent(rama)}`, { sha: commit.sha, force: false })
    } catch (e) {
      if (e.status === 422 && intento === 0) continue // alguien subió justo antes: se reintenta una vez sobre lo nuevo
      throw e
    }
    return { subidos: cambios.map((p) => p.replace(/^data\//, '')), sinCambios: false, saltados, commit: commit.sha.slice(0, 7) }
  }
  throw new Error('No se pudo actualizar la rama del respaldo.')
}

// ── Restaurar ─────────────────────────────────────────────────────────
function escribirAtomico(ruta, buf) {
  fs.mkdirSync(path.dirname(ruta), { recursive: true })
  const tmp = path.join(path.dirname(ruta), `.tmp-${path.basename(ruta)}-${process.pid}-${Date.now()}`)
  fs.writeFileSync(tmp, buf)
  fs.renameSync(tmp, ruta)
}

function copiaDeSeguridad(dir, carpetaBackups) {
  if (!fs.existsSync(dir) || !fs.readdirSync(dir).length) return null
  fs.mkdirSync(carpetaBackups, { recursive: true })
  const destino = path.join(carpetaBackups, `data-antes-de-restaurar-${new Date().toISOString().replace(/[:.]/g, '-')}`)
  fs.cpSync(dir, destino, { recursive: true })
  const viejas = fs.readdirSync(carpetaBackups).filter((n) => n.startsWith('data-antes-de-restaurar-')).sort()
  while (viejas.length > 3) fs.rmSync(path.join(carpetaBackups, viejas.shift()), { recursive: true, force: true })
  return destino
}

/** Baja el último respaldo a data/. Antes guarda una copia de lo que había. → { restaurados, copia } */
async function restaurar({ ajustes = leerAjustes(), fetchFn, dir = DATA, carpetaBackups = BACKUPS } = {}) {
  if (!ajustes.activo) throw new Error(`Respaldo apagado (${ajustes.motivo || 'sin configurar'}).`)
  const cli = crearCliente(ajustes, fetchFn)
  const r = `/repos/${ajustes.repo}`
  const { ref } = await prepararRepo(cli, ajustes)
  const commit = await cli.pedir('GET', `${r}/git/commits/${ref.object.sha}`)
  const arbol = await cli.pedir('GET', `${r}/git/trees/${commit.tree.sha}?recursive=1`)
  const archivos = (arbol.tree || []).filter((t) => t.type === 'blob' && t.path.startsWith('data/') && !t.path.split('/').some((p) => p.startsWith('.')))
  if (!archivos.length) return { restaurados: [], copia: null, vacio: true }

  // Primero se baja y valida TODO en memoria: si algo falla, no se toca data/.
  const bajados = []
  for (const a of archivos) {
    const rel = a.path.slice('data/'.length)
    if (rel.includes('..') || path.isAbsolute(rel)) continue
    const blob = await cli.pedir('GET', `${r}/git/blobs/${a.sha}`)
    const buf = Buffer.from(blob.content || '', blob.encoding === 'base64' ? 'base64' : 'utf8')
    if (rel.endsWith('.json')) JSON.parse(buf.toString('utf8')) // si está dañado lanza y se cancela todo
    bajados.push([rel, buf])
  }
  const copia = copiaDeSeguridad(dir, carpetaBackups)
  for (const [rel, buf] of bajados) escribirAtomico(path.join(dir, rel), buf)
  return { restaurados: bajados.map(([rel]) => rel), copia }
}

/** data/ está "vacío" si no hay usuarios.json o no tiene ningún usuario. */
function dataVacia(dir = DATA) {
  const ruta = path.join(dir, 'usuarios.json')
  if (!fs.existsSync(ruta)) return true
  try { return Object.keys(JSON.parse(fs.readFileSync(ruta, 'utf8')) || {}).length === 0 } catch { return false }
}

// ── Estado y programador ──────────────────────────────────────────────
const estado = { ultimoOk: null, ultimoError: null, ultimosArchivos: 0, ultimoCommit: null, ejecutando: false, avisado: false, programado: false }
let temporizador = null

async function respaldarAhora(opciones = {}) {
  if (estado.ejecutando) return { ocupado: true }
  estado.ejecutando = true
  try {
    const r = await subir(opciones)
    estado.ultimoOk = Date.now()
    estado.ultimoError = null
    if (!r.sinCambios) { estado.ultimosArchivos = r.subidos.length; estado.ultimoCommit = r.commit }
    estado.avisado = false
    return r
  } catch (e) {
    estado.ultimoError = tapar(e.message, (opciones.ajustes || leerAjustes()).token)
    throw e
  } finally {
    estado.ejecutando = false
  }
}

/**
 * Arranca el respaldo automático. `avisar(texto)` se usa UNA vez cuando empieza a fallar
 * (y otra vez cuando se recupera), para no llenar el chat.
 */
function iniciar({ ajustes = leerAjustes(), log = console.log, avisar = null, primerRetrasoMs = 2 * 60 * 1000, fetchFn, dir } = {}) {
  if (!ajustes.activo) return () => {}
  if (temporizador) clearInterval(temporizador)
  estado.programado = true
  const ciclo = async () => {
    const habiaFallado = estado.avisado
    try {
      const r = await respaldarAhora({ ajustes, fetchFn, dir })
      if (r.ocupado) return
      if (!r.sinCambios) log(`☁️ [RESPALDO] ${r.subidos.length} archivo(s) subido(s) a ${ajustes.repo} (${r.commit}).`)
      if (habiaFallado) { try { await avisar?.('✅ El respaldo de datos volvió a funcionar.') } catch { /* sin chat */ } }
    } catch (e) {
      log(`⚠️ [RESPALDO] ${tapar(e.message, ajustes.token)}`)
      if (!estado.avisado) { estado.avisado = true; try { await avisar?.(`⚠️ El respaldo de datos falló:\n${tapar(e.message, ajustes.token)}\n\nSigo intentando; si se arregla te aviso.`) } catch { /* sin chat */ } }
    }
  }
  const primero = setTimeout(ciclo, primerRetrasoMs)
  temporizador = setInterval(ciclo, ajustes.cadaMs)
  primero.unref?.(); temporizador.unref?.()
  return () => { clearTimeout(primero); clearInterval(temporizador); temporizador = null; estado.programado = false }
}

/** Al arrancar: si data/ está vacía y el respaldo está activo, restaura el último. */
async function restaurarSiVacia({ ajustes = leerAjustes(), log = console.log, ...resto } = {}) {
  if (!ajustes.activo || !dataVacia(resto.dir)) return null
  try {
    const r = await restaurar({ ajustes, ...resto })
    if (r.restaurados.length) log(`☁️ [RESPALDO] Datos restaurados desde ${ajustes.repo}: ${r.restaurados.length} archivo(s).`)
    return r
  } catch (e) {
    log(`⚠️ [RESPALDO] No pude restaurar: ${tapar(e.message, ajustes.token)}`)
    return null
  }
}

module.exports = { leerAjustes, tapar, crearCliente, prepararRepo, shaGit, listarLocales, subir, restaurar, dataVacia, estado, respaldarAhora, iniciar, restaurarSiVacia }
