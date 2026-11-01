// Pantalla de bienvenida de la consola: una flor que florece y el panel del bot.
// Se adapta sola al tamaño de la terminal (columnas y filas): de pantallas grandes a un celular en Termux.
// Sin color si la salida no es una terminal (pm2, archivos) o si existe NO_COLOR; sin animación en esos casos.
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

function lineasPanel({ datos, color, grande, ancho }) {
  const c = (t, k, b) => pintar(t, k, color, b)
  const etiqueta = (e, v) => `${c(e + ':', PALETA.cian)} ${v}`
  const info = [
    etiqueta('Versión', `v${datos.version}`),
    etiqueta('Prefijos', `${datos.prefijos.join(' ')}${datos.sinPrefijo ? ' (o sin prefijo)' : ''}`),
    etiqueta('Comandos', String(datos.comandos)),
    etiqueta('IA', datos.ia ? 'activada' : 'desactivada'),
    etiqueta('Node', datos.node),
  ]
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

function armar({ diseno, datos, color, t }) {
  const { radio, tallo, lado, grande } = diseno
  const flor = lineasFlor({ radio, t, color, tallo })
  const anchoFlor = (radio * 2 + 1) * 2
  if (lado) {
    const panelAncho = grande ? 36 : 30
    const panel = lineasPanel({ datos, color, grande, ancho: panelAncho })
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
  const panel = lineasPanel({ datos, color, grande: false, ancho: 30 })
  const ancho = Math.max(anchoFlor, ...panel.map(largo))
  return { lineas: [...flor.map((l) => centrar(l, ancho)), '', ...panel.map((l) => centrar(l, ancho))], ancho }
}

/** Elige el diseño más grande que cabe en `columnas`×`filas`. */
function elegirDiseno({ columnas, filas, datos, color }) {
  for (const d of DISENOS) {
    const { lineas, ancho } = armar({ diseno: d, datos, color: false, t: 1 })
    if (ancho <= columnas - 1 && lineas.length <= filas - 3) return d
  }
  return null // solo texto
}

function textoMinimo({ datos, color, columnas }) {
  const max = Math.max(1, columnas - 1)
  const c = (t, k, b) => pintar(t, k, color, b)
  const cabe = (variantes) => variantes.find((v) => largo(v) <= max) || Array.from(variantes[variantes.length - 1]).slice(0, max).join('')
  const lineas = [
    c(cabe([`✿ ${datos.nombre} ✿`, datos.nombre, 'YuiBot']), PALETA.rosa, true),
    cabe([`v${datos.version} · ${datos.comandos} comandos · ${datos.prefijos.join(' ')}`, `v${datos.version} · ${datos.comandos} cmds`, `v${datos.version}`]),
    c(cabe(['Conectando con WhatsApp…', 'Conectando…', '…']), PALETA.rosaTexto),
  ]
  return lineas.map((l) => centrar(l, max))
}

/** Pantalla completa (arreglo de líneas) para un instante t de la floración. */
function construirPantalla({ columnas = 80, filas = 24, color = true, t = 1, datos }) {
  const diseno = elegirDiseno({ columnas, filas, datos, color })
  if (!diseno) return { lineas: textoMinimo({ datos, color, columnas }), diseno: null }
  const { lineas, ancho } = armar({ diseno, datos, color, t })
  const margen = ' '.repeat(Math.max(0, Math.floor((columnas - 1 - ancho) / 2)))
  return { lineas: lineas.map((l) => margen + l), diseno }
}

const FASES = [0.12, 0.3, 0.5, 0.7, 0.88, 1]
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
      for (const t of FASES) {
        const { lineas } = construirPantalla({ columnas, filas, color, t, datos })
        if (alto) salida.write(`\x1b[${alto}A`)
        salida.write(lineas.map((l) => '\x1b[2K' + l).join('\n') + '\n')
        alto = lineas.length
        if (t < 1) await dormir(pausa)
      }
    } finally { salida.write('\x1b[?25h\n') }
    return { animado: true }
  } catch { return { animado: false } }
}

module.exports = { dibujarFlor, construirPantalla, elegirDiseno, mostrar, largo, DISENOS, FASES }
