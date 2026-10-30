// Respaldo de data/ en GitHub (con un GitHub falso en memoria) y lector de .env.
const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('fs')
const os = require('os')
const path = require('path')
const crypto = require('crypto')
const R = require('../lib/respaldoNube')
const { leerEnv, cargarEnv } = require('../lib/entorno')

const TOKEN = 'github_pat_SECRETO123'
const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'respaldo-'))
const ajustesOk = (extra = {}) => R.leerAjustes({ RESPALDO_REPO: 'amilcar/datos', RESPALDO_TOKEN: TOKEN, ...extra })

/** GitHub falso: guarda blobs, árboles, commits y una rama. */
function githubFalso({ privado = true, vacio = false, conflicto = 0 } = {}) {
  const blobs = new Map(); const trees = new Map(); const commits = new Map()
  let rama = null; let n = 0; let conflictos = conflicto
  const sha = () => crypto.createHash('sha1').update(String(++n)).digest('hex')
  const gitSha = (buf) => crypto.createHash('sha1').update(Buffer.concat([Buffer.from(`blob ${buf.length}\0`), buf])).digest('hex')
  const llamadas = []
  const res = (status, datos) => ({ ok: status < 300, status, json: async () => datos })
  function inicial(archivos = {}) {
    const entradas = Object.entries(archivos).map(([p, c]) => { const b = Buffer.from(c); const s = gitSha(b); blobs.set(s, b); return { path: p, type: 'blob', sha: s } })
    const ts = sha(); trees.set(ts, entradas)
    const cs = sha(); commits.set(cs, { tree: ts }); rama = cs
  }
  if (!vacio) inicial({ 'LEEME.md': 'hola' })
  const fetchFn = async (url, op) => {
    const u = url.replace('https://api.github.com', ''); const m = op.method
    llamadas.push(`${m} ${u}`)
    assert.ok(op.headers.Authorization === `Bearer ${TOKEN}`)
    const body = op.body ? JSON.parse(op.body) : null
    if (u === '/repos/amilcar/datos') return res(200, { private: privado, default_branch: 'main' })
    if (u === '/repos/amilcar/datos/git/ref/heads/main') return rama ? res(200, { object: { sha: rama } }) : res(409, { message: 'Git Repository is empty.' })
    if (u === '/repos/amilcar/datos/contents/LEEME.md' && m === 'PUT') { inicial({ 'LEEME.md': 'x' }); return res(201, {}) }
    let g
    if ((g = u.match(/git\/commits\/(\w+)$/)) && m === 'GET') return res(200, { tree: { sha: commits.get(g[1]).tree } })
    if ((g = u.match(/git\/trees\/(\w+)\?recursive=1$/))) return res(200, { tree: trees.get(g[1]) })
    if (u.endsWith('/git/blobs') && m === 'POST') { const b = Buffer.from(body.content, 'base64'); const s = gitSha(b); blobs.set(s, b); return res(201, { sha: s }) }
    if ((g = u.match(/git\/blobs\/(\w+)$/))) return res(200, { content: blobs.get(g[1]).toString('base64'), encoding: 'base64' })
    if (u.endsWith('/git/trees') && m === 'POST') {
      const base = new Map(trees.get(body.base_tree).map((t) => [t.path, t]))
      for (const t of body.tree) base.set(t.path, { path: t.path, type: 'blob', sha: t.sha })
      const s = sha(); trees.set(s, [...base.values()]); return res(201, { sha: s })
    }
    if (u.endsWith('/git/commits') && m === 'POST') { const s = sha(); commits.set(s, { tree: body.tree, parents: body.parents }); return res(201, { sha: s }) }
    if (u.includes('/git/refs/heads/main') && m === 'PATCH') {
      if (conflictos-- > 0) return res(422, { message: 'Update is not a fast forward' })
      rama = body.sha; return res(200, {})
    }
    return res(404, { message: 'Not Found' })
  }
  const archivos = () => Object.fromEntries(trees.get(commits.get(rama).tree).map((t) => [t.path, blobs.get(t.sha).toString()]))
  return { fetchFn, llamadas, archivos, commitsTotales: () => commits.size }
}

test('.env: lee claves, comillas y comentarios, y no pisa lo que ya existe', () => {
  const v = leerEnv('# hola\nA=1\nB="dos palabras"\nexport C=\'x\'\nD = 4 # comentario\n\nmala línea\nE=\n')
  assert.deepEqual(v, { A: '1', B: 'dos palabras', C: 'x', D: '4', E: '' })
  const dir = tmp(); const ruta = path.join(dir, '.env'); fs.writeFileSync(ruta, 'X=archivo\nY=nuevo\n')
  const destino = { X: 'entorno' }
  cargarEnv(ruta, destino)
  assert.deepEqual(destino, { X: 'entorno', Y: 'nuevo' })
  assert.deepEqual(cargarEnv(path.join(dir, 'no-existe')), {})
})

test('ajustes: solo se activa con repo válido y token; mínimo 5 minutos', () => {
  assert.equal(R.leerAjustes({}).activo, false)
  assert.equal(R.leerAjustes({ RESPALDO_REPO: 'a/b' }).motivo, 'falta RESPALDO_TOKEN')
  assert.equal(R.leerAjustes({ RESPALDO_REPO: 'malo', RESPALDO_TOKEN: 'x' }).activo, false)
  const a = R.leerAjustes({ RESPALDO_REPO: 'https://github.com/yo/datos.git', RESPALDO_TOKEN: 't', RESPALDO_CADA_MIN: '1' })
  assert.deepEqual([a.activo, a.repo, a.minutos], [true, 'yo/datos', 5])
  assert.equal(R.leerAjustes({ RESPALDO_REPO: 'a/b', RESPALDO_TOKEN: 't' }).minutos, 60)
  assert.deepEqual(R.leerAjustes({ RESPALDO_REPO: 'a/b', RESPALDO_TOKEN: 't' }).excluir, ['api-proveedores.json'])
})

test('el token nunca aparece en los mensajes de error', () => {
  assert.ok(!R.tapar(`fallo con ${TOKEN} y ghp_abcDEF123`, TOKEN).includes('SECRETO'))
  assert.ok(!R.tapar('x ghp_abcDEF123', '').includes('abcDEF'))
})

test('sube solo lo que cambió, en un commit, y sin cambios no crea nada', async () => {
  const dir = tmp(); const gh = githubFalso()
  fs.writeFileSync(path.join(dir, 'usuarios.json'), JSON.stringify({ 5191: { monedas: 5 } }))
  fs.writeFileSync(path.join(dir, 'trabajos.json'), '{"usuarios":{}}')
  fs.writeFileSync(path.join(dir, 'api-proveedores.json'), '{"llave":"secreta"}')
  fs.writeFileSync(path.join(dir, '.tmp-basura.json'), '{}')
  const r1 = await R.subir({ ajustes: ajustesOk(), fetchFn: gh.fetchFn, dir })
  assert.deepEqual(r1.subidos.sort(), ['trabajos.json', 'usuarios.json'])
  assert.ok(!('data/api-proveedores.json' in gh.archivos()), 'las llaves de API no se suben')
  assert.equal(gh.archivos()['data/usuarios.json'], JSON.stringify({ 5191: { monedas: 5 } }))
  const commits = gh.commitsTotales()
  const r2 = await R.subir({ ajustes: ajustesOk(), fetchFn: gh.fetchFn, dir })
  assert.equal(r2.sinCambios, true)
  assert.equal(gh.commitsTotales(), commits, 'no hay commit nuevo')
  fs.writeFileSync(path.join(dir, 'trabajos.json'), '{"usuarios":{"1":{}}}')
  const r3 = await R.subir({ ajustes: ajustesOk(), fetchFn: gh.fetchFn, dir })
  assert.deepEqual(r3.subidos, ['trabajos.json'])
})

test('un JSON dañado se salta y no se sube', async () => {
  const dir = tmp(); const gh = githubFalso()
  fs.writeFileSync(path.join(dir, 'usuarios.json'), '{"a":1}')
  fs.writeFileSync(path.join(dir, 'roto.json'), '{"a":')
  const r = await R.subir({ ajustes: ajustesOk(), fetchFn: gh.fetchFn, dir })
  assert.deepEqual(r.subidos, ['usuarios.json'])
  assert.ok(r.saltados[0].includes('roto.json'))
})

test('se niega a subir a un repositorio público', async () => {
  const dir = tmp(); const gh = githubFalso({ privado: false })
  fs.writeFileSync(path.join(dir, 'usuarios.json'), '{"a":1}')
  await assert.rejects(() => R.subir({ ajustes: ajustesOk(), fetchFn: gh.fetchFn, dir }), /PÚBLICO/)
  assert.ok(!gh.llamadas.some((l) => l.startsWith('POST')), 'no subió nada')
})

test('repo recién creado y vacío: crea el primer commit y sube', async () => {
  const dir = tmp(); const gh = githubFalso({ vacio: true })
  fs.writeFileSync(path.join(dir, 'usuarios.json'), '{"a":1}')
  const r = await R.subir({ ajustes: ajustesOk(), fetchFn: gh.fetchFn, dir })
  assert.deepEqual(r.subidos, ['usuarios.json'])
  assert.ok(gh.llamadas.includes('PUT /repos/amilcar/datos/contents/LEEME.md'))
})

test('si la rama cambió justo antes (422) reintenta una vez', async () => {
  const dir = tmp(); const gh = githubFalso({ conflicto: 1 })
  fs.writeFileSync(path.join(dir, 'usuarios.json'), '{"a":1}')
  const r = await R.subir({ ajustes: ajustesOk(), fetchFn: gh.fetchFn, dir })
  assert.equal(r.subidos.length, 1)
  const gh2 = githubFalso({ conflicto: 5 })
  await assert.rejects(() => R.subir({ ajustes: ajustesOk(), fetchFn: gh2.fetchFn, dir }), /422/)
})

test('un error de GitHub sale sin el token', async () => {
  const dir = tmp()
  fs.writeFileSync(path.join(dir, 'usuarios.json'), '{"a":1}')
  const fetchFn = async () => ({ ok: false, status: 401, json: async () => ({ message: `Bad credentials ${TOKEN}` }) })
  await assert.rejects(() => R.subir({ ajustes: ajustesOk(), fetchFn, dir }), (e) => e.message.includes('401') && !e.message.includes('SECRETO'))
})

test('restaurar baja el respaldo, guarda copia de lo anterior y valida el JSON', async () => {
  const origen = tmp(); const gh = githubFalso()
  fs.writeFileSync(path.join(origen, 'usuarios.json'), '{"u":{"monedas":99}}')
  fs.mkdirSync(path.join(origen, 'sub')); fs.writeFileSync(path.join(origen, 'sub', 'otro.json'), '{"x":1}')
  await R.subir({ ajustes: ajustesOk(), fetchFn: gh.fetchFn, dir: origen })

  const nuevo = tmp(); const backups = tmp()
  assert.equal(R.dataVacia(nuevo), true)
  fs.writeFileSync(path.join(nuevo, 'usuarios.json'), '{"viejo":{}}')
  const r = await R.restaurar({ ajustes: ajustesOk(), fetchFn: gh.fetchFn, dir: nuevo, carpetaBackups: backups })
  assert.deepEqual(r.restaurados.sort(), ['sub/otro.json', 'usuarios.json'])
  assert.equal(fs.readFileSync(path.join(nuevo, 'usuarios.json'), 'utf8'), '{"u":{"monedas":99}}')
  assert.equal(fs.readFileSync(path.join(nuevo, 'sub', 'otro.json'), 'utf8'), '{"x":1}')
  assert.ok(r.copia && fs.readFileSync(path.join(r.copia, 'usuarios.json'), 'utf8') === '{"viejo":{}}')
  assert.ok(!fs.readdirSync(nuevo).some((n) => n.startsWith('.tmp-')))
})

test('restaurar con un archivo dañado en la nube no toca nada local', async () => {
  const gh = githubFalso()
  const dir = tmp(); fs.writeFileSync(path.join(dir, 'usuarios.json'), '{"a":1}')
  await R.subir({ ajustes: ajustesOk(), fetchFn: gh.fetchFn, dir })
  // dañar el respaldo en la nube
  const arbol = gh.archivos(); assert.ok(arbol['data/usuarios.json'])
  const roto = githubFalso(); // repo con un data/ inválido
  const fetchRoto = async (url, op) => {
    const r = await roto.fetchFn(url, op)
    if (/git\/trees\/\w+\?recursive=1$/.test(url)) { const d = await r.json(); return { ok: true, status: 200, json: async () => ({ tree: [...d.tree, { path: 'data/malo.json', type: 'blob', sha: 'malo' }] }) } }
    if (/git\/blobs\/malo$/.test(url)) return { ok: true, status: 200, json: async () => ({ content: Buffer.from('{').toString('base64'), encoding: 'base64' }) }
    return r
  }
  const local = tmp(); fs.writeFileSync(path.join(local, 'usuarios.json'), '{"intacto":true}')
  await assert.rejects(() => R.restaurar({ ajustes: ajustesOk(), fetchFn: fetchRoto, dir: local, carpetaBackups: tmp() }))
  assert.equal(fs.readFileSync(path.join(local, 'usuarios.json'), 'utf8'), '{"intacto":true}')
})

test('restaurarSiVacia solo actúa con data vacía y con el respaldo activo', async () => {
  const gh = githubFalso(); const origen = tmp()
  fs.writeFileSync(path.join(origen, 'usuarios.json'), '{"u":{}}')
  await R.subir({ ajustes: ajustesOk(), fetchFn: gh.fetchFn, dir: origen })
  const log = () => {}
  assert.equal(await R.restaurarSiVacia({ ajustes: R.leerAjustes({}), log, dir: tmp() }), null, 'apagado')
  const conDatos = tmp(); fs.writeFileSync(path.join(conDatos, 'usuarios.json'), '{"a":{}}')
  assert.equal(await R.restaurarSiVacia({ ajustes: ajustesOk(), fetchFn: gh.fetchFn, log, dir: conDatos, carpetaBackups: tmp() }), null, 'ya hay datos')
  const vacia = tmp()
  const r = await R.restaurarSiVacia({ ajustes: ajustesOk(), fetchFn: gh.fetchFn, log, dir: vacia, carpetaBackups: tmp() })
  assert.deepEqual(r.restaurados, ['usuarios.json'])
  const falla = await R.restaurarSiVacia({ ajustes: ajustesOk(), fetchFn: async () => { throw new Error(`caído ${TOKEN}`) }, log: (t) => assert.ok(!t.includes('SECRETO')), dir: tmp(), carpetaBackups: tmp() })
  assert.equal(falla, null, 'un fallo no rompe el arranque')
})

test('el programador avisa una sola vez si falla y otra cuando se recupera', async () => {
  const dir = tmp(); fs.writeFileSync(path.join(dir, 'usuarios.json'), '{"a":1}')
  const avisos = []
  let caido = true
  const gh = githubFalso()
  const fetchFn = async (u, o) => { if (caido) throw new Error('sin internet'); return gh.fetchFn(u, o) }
  const ajustes = ajustesOk({ RESPALDO_CADA_MIN: '5' })
  const orig = global.setInterval
  let ciclo
  global.setInterval = (f) => { ciclo = f; return { unref() {} } }
  try {
    const parar = R.iniciar({ ajustes, log: () => {}, avisar: async (t) => avisos.push(t), primerRetrasoMs: 1e9, fetchFn, dir })
    await ciclo(); await ciclo()
    assert.equal(avisos.length, 1, 'un solo aviso de fallo')
    assert.ok(!avisos[0].includes('SECRETO'))
    caido = false
    await ciclo()
    assert.equal(avisos.length, 2, 'aviso de recuperación')
    assert.ok(avisos[1].includes('volvió'))
    parar()
  } finally { global.setInterval = orig }
})

test('.respaldonube: apagado, estado y confirmación antes de restaurar', async () => {
  const cmd = require('../modulos/owner/respaldonube')
  assert.equal(cmd.ownerOnly, true)
  const enviados = []
  const sock = { sendMessage: async (j, c) => { enviados.push(c.text) } }
  const msg = { key: { remoteJid: 'a@s.whatsapp.net' } }
  const config = { PREFIXES: ['.'] }
  const guardado = { r: process.env.RESPALDO_REPO, t: process.env.RESPALDO_TOKEN }
  delete process.env.RESPALDO_REPO; delete process.env.RESPALDO_TOKEN
  try {
    await cmd.execute(sock, msg, [], { config })
    assert.ok(enviados[0].includes('RESPALDO_REPO=usuario/repo-privado'))
    process.env.RESPALDO_REPO = 'amilcar/datos'; process.env.RESPALDO_TOKEN = TOKEN
    await cmd.execute(sock, msg, ['restaurar'], { config })
    assert.ok(enviados[1].includes('restaurar confirmar'))
    await cmd.execute(sock, msg, ['estado'], { config })
    assert.ok(enviados[2].includes('amilcar/datos') && !enviados[2].includes('SECRETO'))
    await cmd.execute(sock, msg, [], { config, esSubBot: true })
    assert.ok(enviados[3].includes('bot principal'))
  } finally {
    for (const [k, v] of [['RESPALDO_REPO', guardado.r], ['RESPALDO_TOKEN', guardado.t]]) { if (v === undefined) delete process.env[k]; else process.env[k] = v }
  }
})
