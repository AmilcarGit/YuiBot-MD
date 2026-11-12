// Pantalla de bienvenida de la consola: una flor que florece (o, en Navidad, un árbol que se enciende bajo la nieve) y el panel del bot.
// La figura sale del tema activo (lib/tema.js).
// Se adapta sola al tamaño de la terminal (columnas y filas): de pantallas grandes a un celular en Termux.
// Sin color si la salida no es una terminal (pm2, archivos) o si existe NO_COLOR; sin animación en esos casos.
const tema = require('./tema')
const ANSI = /\x1b\[[0-9;?]*[A-Za-z]/g
const largo = (t) => Array.from(String(t).replace(ANSI, '')).length
const centrar = (t, ancho) => ' '.repeat(Math.max(0, Math.floor((ancho - largo(t)) / 2))) + t

// Letras grandes (5 filas) solo para las pantallas anchas.
const LETRAS = {
  Y: ['█   █', ' █ █ ', '  █  ', '  █  ', '  █  '],
  U: ['█   █', '█   █', '█   █', '█   █', ' ███ '],
  I: ['█████', '  █  ', '  █  ', '  █  ', '█████'],
  B: ['████ ', '█   █', '████ ', '█   █', '████ '],
  O: [' ███ ', '█   █', '█   █', '█   █', ' ███ '],
  T: ['█████', '  █  ', '  █  ', '  █  ', '  █  '],
}
const letrasGrandes = (palabra) => Array.from({ length: 5 }, (_, f) => Array.from(palabra).map((l) => LETRAS[l][f]).join(' '))

const PETALOS = 8
const PALETA = { rosa: 205, rosaClaro: 213, punta: 219, lila: 177, centro: 220, centroOscuro: 214, tallo: 35, hoja: 78, rosaTexto: 211, gris: 245, cian: 123 }

/** Cuadrícula de la flor: matriz de {c: color 256 | null} (cada píxel se pinta con dos columnas "██"). t: 0 (capullo) → 1 (abierta). */
function dibujarFlor({ radio, t = 1 }) {
  const n = radio * 2 + 1
  // Pétalos redondos: círculos repartidos alrededor del centro que se separan y crecen al abrirse.
  const dist = Math.max(0.5, radio * 0.68 * t), rp = Math.max(0.95, radio * 0.31 * (0.55 + 0.45 * t))
  const centrosP = Array.from({ length: PETALOS }, (_, k) => { const a = (k / PETALOS) * 2 * Math.PI - Math.PI / 2; return { x: radio + Math.cos(a) * dist, y: radio + Math.sin(a) * dist, k } })
  const rc = Math.max(0.9, radio * 0.25 * (0.5 + 0.5 * t))
  const filas = []
  for (let y = 0; y < n; y++) {
    const fila = []
    for (let x = 0; x < n; x++) {
      let c = null
      if (Math.hypot(x - radio, y - radio) <= rc) c = (x + y) % 2 ? PALETA.centro : PALETA.centroOscuro
      else {
        let mejor = null
        for (const p of centrosP) { const d = Math.hypot(x - p.x, y - p.y); if (d <= rp && (!mejor || d < mejor.d)) mejor = { d, k: p.k } }
        if (mejor) c = mejor.k % 2 ? (mejor.d > rp * 0.55 ? PALETA.rosaClaro : PALETA.rosa) : (mejor.d > rp * 0.55 ? PALETA.punta : PALETA.rosaClaro)
        if (mejor && t > 0.8 && mejor.k % 2 === 0 && mejor.d < rp * 0.35) c = PALETA.lila
        if (!mejor && Math.hypot(x - radio, y - radio) <= dist * 0.92) c = PALETA.rosa // base de los pétalos: sin huecos junto al centro
      }
      fila.push({ c })
    }
    filas.push(fila)
  }
  return filas
}

function pintar(texto, codigo, color, negrita = false) {
  if (!color) return texto
  return `\x1b[${negrita ? '1;' : ''}38;5;${codigo}m${texto}\x1b[0m`
}

/** La flor como líneas de texto (con tallo y hojas si hay espacio). */
function lineasFlor({ radio, t, color, tallo }) {
  const n = radio * 2 + 1
  const lineas = dibujarFlor({ radio, t }).map((fila) => fila.map((p) => (p.c == null ? '  ' : pintar('██', p.c, color))).join(''))
  if (tallo) {
    const col = radio * 2 // posición de la columna central (2 columnas por píxel)
    for (let i = 0; i < tallo; i++) {
      const hoja = i === 1 && t > 0.6
      const izq = hoja ? pintar('❧', PALETA.hoja, color) : ' '
      const der = hoja ? pintar('☙', PALETA.hoja, color) : ' '
      lineas.push(' '.repeat(Math.max(0, col - 1)) + izq + pintar('║', PALETA.tallo, color) + der + ' '.repeat(Math.max(0, n * 2 - col - 2)))
    }
  }
  return lineas
}


// ── Árbol de Navidad (tema navidad) ──
const PALETA_NAV = { verde: [22, 28, 34, 40], tronco: 94, estrella: 226, rojo: 196, dorado: 220, nieve: 255, texto: 223, verdeTxt: 41, rojoTxt: 203 }
const ADORNOS = [196, 220, 45, 213, 231, 208]
const hash = (a, b = 0) => { let h = (a * 2654435761 + b * 40503) >>> 0; h ^= h >>> 15; h = Math.imul(h, 2246822519) >>> 0; return (h ^ (h >>> 13)) >>> 0 }

/** Cuadrícula del árbol: cada celda {c: color|null, ch?: carácter propio}. t: 0 → 1 se va dibujando de arriba abajo; frame hace parpadear luces y caer la nieve. */
function dibujarArbol({ radio, t = 1, frame = 0, tronco = 2 }) {
  const n = radio * 2 + 1
  const g = Array.from({ length: n + tronco }, () => Array.from({ length: n }, () => ({ c: null })))
  const visibles = Math.ceil(Math.max(0.05, Math.min(1, t)) * n)
  const h = Math.max(2, Math.ceil((n - 1) / 3))
  for (let y = 0; y < n && y < visibles; y++) {
    if (y === 0) { g[0][radio] = { c: PALETA_NAV.estrella, ch: '★ ' }; continue }
    const piso = Math.min(2, Math.floor((y - 1) / h)); const local = (y - 1) % h
    const medio = Math.max(0, Math.round(radio * ((piso + 0.45 + 0.55 * ((local + 1) / h)) / 3)))
    for (let x = radio - medio; x <= radio + medio; x++) {
      if (x < 0 || x >= n) continue
      g[y][x] = { c: PALETA_NAV.verde[(piso + ((x + y) % 2)) % PALETA_NAV.verde.length] }
      const k = hash(x + 1, y + 7)
      if (t >= 0.6 && k % 7 === 0) { // adorno: se enciende y parpadea
        const color = ADORNOS[k % ADORNOS.length]
        g[y][x] = { c: (frame + k) % 3 === 0 ? 240 : color, ch: '● ' }
      }
    }
  }
  if (t >= 0.9) for (let y = n; y < n + tronco; y++) for (const x of [radio - 1, radio, radio + 1].slice(0, radio >= 3 ? 3 : 1)) g[y][x] = { c: PALETA_NAV.tronco }
  // nieve: copos que bajan una fila por cuadro
  const copos = Math.round(n * 0.9)
  for (let k = 0; k < copos; k++) {
    const x = hash(k, 3) % n; const y = (hash(k, 5) + frame) % (n + tronco)
    if (g[y][x].c == null) g[y][x] = { c: PALETA_NAV.nieve, ch: k % 3 ? '· ' : '* ' }
  }
  return g
}

function lineasArbol({ radio, t, color, tallo, frame = 0 }) {
  const g = dibujarArbol({ radio, t, frame, tronco: Math.max(1, Math.min(2, tallo || 1)) })
  return g.map((fila) => fila.map((p) => (p.c == null ? '  ' : pintar(p.ch || '██', p.c, color))).join(''))
}

function lineasPanel({ datos, color, grande, ancho, navidad = false }) {
  const c = (t, k, b) => pintar(t, k, color, b)
  const etiqueta = (e, v) => `${c(e + ':', PALETA.cian)} ${v}`
  const info = [
    etiqueta('Versión', `v${datos.version}`),
    etiqueta('Prefijos', `${datos.prefijos.join(' ')}${datos.sinPrefijo ? ' (o sin prefijo)' : ''}`),
    etiqueta('Comandos', String(datos.comandos)),
    etiqueta('IA', datos.ia ? 'activada' : 'desactivada'),
    etiqueta('Node', datos.node),
  ]
  if (navidad) {
    const titulo = grande
      ? [...letrasGrandes('YUIBOT').map((l, i) => c(l, i % 2 ? PALETA_NAV.verdeTxt : PALETA_NAV.rojoTxt, true)), c('❄ ─────  M D  ───── ❄', PALETA_NAV.dorado, true)]
      : [c(`❄ ${datos.nombre} ❄`, PALETA_NAV.rojoTxt, true)]
    const regla = c('─'.repeat(Math.max(8, Math.min(ancho, 34))), PALETA_NAV.dorado)
    const dias = tema.cuentaRegresiva().replace(/[*]/g, '').replace(/[\u{1F000}-\u{1FFFF}\u{2600}-\u{27BF}\uFE0F]/gu, '').trim()
    return [...titulo, c('❄ ¡Felices fiestas! ❄', PALETA_NAV.estrella, true), ...(dias ? [c(dias, PALETA_NAV.texto)] : []), '', ...info, regla, c('❄ Conectando con WhatsApp…', PALETA_NAV.texto)]
  }
  const titulo = grande
    ? [...letrasGrandes('YUIBOT').map((l, i) => c(l, i % 2 ? PALETA.rosaClaro : PALETA.rosa, true)), c('✦ ─────  M D  ───── ✦', PALETA.lila, true)]
    : [c(`✿ ${datos.nombre} ✿`, PALETA.rosa, true)]
  const regla = c('─'.repeat(Math.max(8, Math.min(ancho, 34))), PALETA.lila)
  return [...titulo, '', ...info, regla, c('✿ Conectando con WhatsApp…', PALETA.rosaTexto)]
}

/** Define cada tamaño posible, del más grande al más pequeño. */
const DISENOS = [
  { radio: 7, tallo: 3, lado: true, grande: true },
  { radio: 6, tallo: 2, lado: true, grande: false },
  { radio: 5, tallo: 2, lado: true, grande: false },
  { radio: 6, tallo: 2, lado: false, grande: false },
  { radio: 4, tallo: 2, lado: false, grande: false },
  { radio: 3, tallo: 1, lado: false, grande: false },
  { radio: 2, tallo: 0, lado: false, grande: false },
]

function armar({ diseno, datos, color, t, navidad = false, frame = 0 }) {
  const { radio, tallo, lado, grande } = diseno
  const flor = navidad ? lineasArbol({ radio, t, color, tallo, frame }) : lineasFlor({ radio, t, color, tallo })
  const anchoFlor = (radio * 2 + 1) * 2
  if (lado) {
    const panelAncho = grande ? 36 : 30
    const panel = lineasPanel({ datos, color, grande, ancho: panelAncho, navidad })
    const alto = Math.max(flor.length, panel.length)
    const saltoF = Math.floor((alto - flor.length) / 2), saltoP = Math.floor((alto - panel.length) / 2)
    const lineas = []
    for (let i = 0; i < alto; i++) {
      const f = flor[i - saltoF] ?? ' '.repeat(anchoFlor)
      const p = panel[i - saltoP] ?? ''
      lineas.push(f + '   ' + p)
    }
    return { lineas, ancho: anchoFlor + 3 + Math.max(...panel.map(largo)) }
  }
  const panel = lineasPanel({ datos, color, grande: false, ancho: 30, navidad })
  const ancho = Math.max(anchoFlor, ...panel.map(largo))
  return { lineas: [...flor.map((l) => centrar(l, ancho)), '', ...panel.map((l) => centrar(l, ancho))], ancho }
}

/** Elige el diseño más grande que cabe en `columnas`×`filas`. */
function elegirDiseno({ columnas, filas, datos, color, navidad = false }) {
  for (const d of DISENOS) {
    const { lineas, ancho } = armar({ diseno: d, datos, color: false, t: 1, navidad })
    if (ancho <= columnas - 1 && lineas.length <= filas - 3) return d
  }
  return null // solo texto
}

function textoMinimo({ datos, color, columnas, navidad = false }) {
  const max = Math.max(1, columnas - 1)
  const c = (t, k, b) => pintar(t, k, color, b)
  const cabe = (variantes) => variantes.find((v) => largo(v) <= max) || Array.from(variantes[variantes.length - 1]).slice(0, max).join('')
  const lineas = [
    c(cabe(navidad ? [`❄ ${datos.nombre} ❄`, datos.nombre, 'YuiBot'] : [`✿ ${datos.nombre} ✿`, datos.nombre, 'YuiBot']), navidad ? PALETA_NAV.rojoTxt : PALETA.rosa, true),
    cabe([`v${datos.version} · ${datos.comandos} comandos · ${datos.prefijos.join(' ')}`, `v${datos.version} · ${datos.comandos} cmds`, `v${datos.version}`]),
    c(cabe(['Conectando con WhatsApp…', 'Conectando…', '…']), navidad ? PALETA_NAV.texto : PALETA.rosaTexto),
  ]
  return lineas.map((l) => centrar(l, max))
}

/** Pantalla completa (arreglo de líneas) para un instante t de la floración. */
function construirPantalla({ columnas = 80, filas = 24, color = true, t = 1, datos, frame = 0, navidad = tema.activo() === 'navidad' }) {
  const diseno = elegirDiseno({ columnas, filas, datos, color, navidad })
  if (!diseno) return { lineas: textoMinimo({ datos, color, columnas, navidad }), diseno: null }
  const { lineas, ancho } = armar({ diseno, datos, color, t, navidad, frame })
  const margen = ' '.repeat(Math.max(0, Math.floor((columnas - 1 - ancho) / 2)))
  return { lineas: lineas.map((l) => margen + l), diseno }
}

const FASES = [0.12, 0.3, 0.5, 0.7, 0.88, 1]
// Navidad: el árbol se dibuja y luego se enciende con nieve cayendo (t=1, frames 1…8).
const FASES_NAVIDAD = [0.15, 0.3, 0.45, 0.6, 0.75, 0.9, 1, 1, 1, 1, 1, 1, 1, 1]
const dormir = (ms) => new Promise((r) => setTimeout(r, ms))

/**
 * Muestra la bienvenida. En una terminal con color florece en ~0,7 s; si no, imprime solo el cuadro final.
 * Nunca lanza errores: una pantalla bonita no puede impedir que el bot arranque.
 */
async function mostrar({ datos, salida = process.stdout, animado = true, env = process.env, pausa = 110 } = {}) {
  try {
    const esTTY = Boolean(salida.isTTY)
    const color = esTTY && !('NO_COLOR' in env) && env.TERM !== 'dumb'
    const columnas = Number(salida.columns) || 80, filas = Number(salida.rows) || 24
    const animar = animado && color && !env.YUI_SIN_ANIMACION && !env.CI
    const imprimir = (lineas) => salida.write(lineas.join('\n') + '\n')
    if (!animar) { salida.write('\n'); imprimir(construirPantalla({ columnas, filas, color, t: 1, datos }).lineas); salida.write('\n'); return { animado: false } }

    salida.write('\n\x1b[?25l') // oculta el cursor mientras florece
    let alto = 0
    try {
      const navidad = tema.activo() === 'navidad'
      const fases = navidad ? FASES_NAVIDAD : FASES
      for (let i = 0; i < fases.length; i++) {
        const t = fases[i]
        const { lineas } = construirPantalla({ columnas, filas, color, t, datos, frame: i, navidad })
        if (alto) salida.write(`\x1b[${alto}A`)
        salida.write(lineas.map((l) => '\x1b[2K' + l).join('\n') + '\n')
        alto = lineas.length
        if (i < fases.length - 1) await dormir(navidad ? Math.round(pausa * 0.75) : pausa)
      }
    } finally { salida.write('\x1b[?25h\n') }
    return { animado: true }
  } catch { return { animado: false } }
}

module.exports = { dibujarArbol, FASES_NAVIDAD, dibujarFlor, construirPantalla, elegirDiseno, mostrar, largo, DISENOS, FASES }
