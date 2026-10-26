// Tarjeta de perfil (imagen). Solo usa texto y formas dibujadas: los emojis
// no se ven en el canvas de muchos equipos (Termux), así que no se usan aquí.
const fetch = require('./http').fetchSeguro // timeout por defecto (ver lib/http.js)
const { createCanvas, loadImage } = require('./canvas')

const ANCHO = 1100
const ALTO = 620
const COLOR_ACENTO = ['#ff5f8f', '#a66bff']
const MAX_INSIGNIAS = 7

async function cargarImagenDesdeUrl(url) {
  const resp = await fetch(url)
  if (!resp.ok) throw new Error(`No se pudo descargar imagen: HTTP ${resp.status}`)
  return loadImage(Buffer.from(await resp.arrayBuffer()))
}

// Rectángulo redondeado con curvas propias (no depende de ctx.roundRect).
function rectRedondo(ctx, x, y, w, h, r) {
  const radio = Math.max(0, Math.min(r, w / 2, h / 2))
  ctx.beginPath()
  ctx.moveTo(x + radio, y)
  ctx.lineTo(x + w - radio, y)
  ctx.quadraticCurveTo(x + w, y, x + w, y + radio)
  ctx.lineTo(x + w, y + h - radio)
  ctx.quadraticCurveTo(x + w, y + h, x + w - radio, y + h)
  ctx.lineTo(x + radio, y + h)
  ctx.quadraticCurveTo(x, y + h, x, y + h - radio)
  ctx.lineTo(x, y + radio)
  ctx.quadraticCurveTo(x, y, x + radio, y)
  ctx.closePath()
}

// Imagen que cubre todo el recuadro sin deformarse (como background-size: cover).
function dibujarCover(ctx, img, x, y, w, h) {
  const escala = Math.max(w / img.width, h / img.height)
  const dw = img.width * escala
  const dh = img.height * escala
  ctx.drawImage(img, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh)
}

function recortarTexto(ctx, texto, anchoMax) {
  let t = String(texto)
  if (ctx.measureText(t).width <= anchoMax) return t
  while (t.length > 1 && ctx.measureText(`${t}…`).width > anchoMax) t = t.slice(0, -1)
  return `${t}…`
}

// Reduce la fuente hasta que el texto quepa (nombres largos).
function ajustarFuente(ctx, texto, anchoMax, tamanoMax, tamanoMin, peso = 'bold') {
  for (let tam = tamanoMax; tam >= tamanoMin; tam -= 2) {
    ctx.font = `${peso} ${tam}px sans-serif`
    if (ctx.measureText(texto).width <= anchoMax) return
  }
}

function estrella(ctx, cx, cy, puntas, rExt, rInt) {
  ctx.beginPath()
  for (let i = 0; i < puntas * 2; i++) {
    const r = i % 2 === 0 ? rExt : rInt
    const ang = (Math.PI / puntas) * i - Math.PI / 2
    const px = cx + Math.cos(ang) * r
    const py = cy + Math.sin(ang) * r
    if (i === 0) ctx.moveTo(px, py)
    else ctx.lineTo(px, py)
  }
  ctx.closePath()
}

function poligono(ctx, cx, cy, lados, r, giro = -Math.PI / 2) {
  ctx.beginPath()
  for (let i = 0; i < lados; i++) {
    const ang = giro + (Math.PI * 2 * i) / lados
    const px = cx + Math.cos(ang) * r
    const py = cy + Math.sin(ang) * r
    if (i === 0) ctx.moveTo(px, py)
    else ctx.lineTo(px, py)
  }
  ctx.closePath()
}

function insignia(ctx, cx, cy, r, color, indice) {
  ctx.save()
  ctx.shadowColor = color
  ctx.shadowBlur = 14
  ctx.beginPath()
  ctx.arc(cx, cy, r, 0, Math.PI * 2)
  ctx.fillStyle = 'rgba(20,12,36,0.92)'
  ctx.fill()
  ctx.restore()

  ctx.lineWidth = 4
  ctx.strokeStyle = color
  ctx.beginPath()
  ctx.arc(cx, cy, r, 0, Math.PI * 2)
  ctx.stroke()

  ctx.fillStyle = color
  const forma = indice % 3
  if (forma === 0) estrella(ctx, cx, cy + 1, 5, r * 0.58, r * 0.26)
  else if (forma === 1) poligono(ctx, cx, cy, 4, r * 0.55)
  else poligono(ctx, cx, cy, 6, r * 0.52)
  ctx.fill()
}

function pastillaTexto(ctx, texto, x, y, { alto = 40, relleno, color = '#ffffff', fuente = 'bold 20px sans-serif' }) {
  ctx.font = fuente
  const ancho = ctx.measureText(texto).width + 36
  ctx.fillStyle = relleno
  rectRedondo(ctx, x, y, ancho, alto, alto / 2)
  ctx.fill()
  ctx.fillStyle = color
  ctx.textAlign = 'left'
  ctx.fillText(texto, x + 18, y + alto / 2 + 7)
  return ancho
}

function formatear(n) {
  const v = Number(n) || 0
  if (v >= 1e6) return `${(v / 1e6).toFixed(1)}M`
  if (v >= 1e4) return `${(v / 1e3).toFixed(1)}K`
  return String(Math.round(v))
}

/**
 * @param {object} d
 * numero, nombre, genero, edad, avatar (url), background (url), botName,
 * nivel, xp, progreso, necesario, rango, posicion, mensajes, monedas,
 * reputacion, racha, insignias [{color}], totalLogros, logrosObtenidos
 */
async function generarTarjetaPerfil(d) {
  const canvas = createCanvas(ANCHO, ALTO)
  const ctx = canvas.getContext('2d')

  // ── Fondo ───────────────────────────────────────────────────────────
  try {
    dibujarCover(ctx, await cargarImagenDesdeUrl(d.background), 0, 0, ANCHO, ALTO)
  } catch (error) {
    console.error('[PERFIL] No se pudo cargar el fondo, se usa uno degradado:', error.message)
    const g = ctx.createLinearGradient(0, 0, ANCHO, ALTO)
    g.addColorStop(0, '#10091c')
    g.addColorStop(0.55, '#2a1248')
    g.addColorStop(1, '#07181c')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, ANCHO, ALTO)
  }
  ctx.fillStyle = 'rgba(8,4,20,0.72)'
  ctx.fillRect(0, 0, ANCHO, ALTO)
  const brillo = ctx.createRadialGradient(240, 210, 10, 240, 210, 420)
  brillo.addColorStop(0, 'rgba(166,107,255,0.35)')
  brillo.addColorStop(1, 'rgba(166,107,255,0)')
  ctx.fillStyle = brillo
  ctx.fillRect(0, 0, ANCHO, ALTO)

  // ── Panel de cristal ────────────────────────────────────────────────
  ctx.fillStyle = 'rgba(255,255,255,0.07)'
  rectRedondo(ctx, 28, 28, ANCHO - 56, ALTO - 56, 34)
  ctx.fill()
  const borde = ctx.createLinearGradient(0, 0, ANCHO, 0)
  borde.addColorStop(0, COLOR_ACENTO[0])
  borde.addColorStop(1, COLOR_ACENTO[1])
  ctx.strokeStyle = borde
  ctx.lineWidth = 3
  rectRedondo(ctx, 28, 28, ANCHO - 56, ALTO - 56, 34)
  ctx.stroke()

  // ── Avatar con anillo de progreso de nivel ──────────────────────────
  const ax = 200
  const ay = 235
  const radio = 105
  const fraccion = Math.max(0, Math.min(1, (d.progreso || 0) / Math.max(1, d.necesario || 1)))

  ctx.lineWidth = 12
  ctx.strokeStyle = 'rgba(255,255,255,0.15)'
  ctx.beginPath()
  ctx.arc(ax, ay, radio + 18, 0, Math.PI * 2)
  ctx.stroke()
  if (fraccion > 0) {
    const anillo = ctx.createLinearGradient(ax - radio, ay - radio, ax + radio, ay + radio)
    anillo.addColorStop(0, COLOR_ACENTO[0])
    anillo.addColorStop(1, COLOR_ACENTO[1])
    ctx.strokeStyle = anillo
    ctx.lineCap = 'round'
    ctx.beginPath()
    ctx.arc(ax, ay, radio + 18, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * fraccion)
    ctx.stroke()
    ctx.lineCap = 'butt'
  }

  ctx.save()
  ctx.beginPath()
  ctx.arc(ax, ay, radio, 0, Math.PI * 2)
  ctx.closePath()
  ctx.clip()
  try {
    dibujarCover(ctx, await cargarImagenDesdeUrl(d.avatar), ax - radio, ay - radio, radio * 2, radio * 2)
  } catch (error) {
    console.error('[PERFIL] No se pudo cargar el avatar:', error.message)
    ctx.fillStyle = '#2a1248'
    ctx.fillRect(ax - radio, ay - radio, radio * 2, radio * 2)
  }
  ctx.restore()

  // Chapa con el nivel
  const bx = ax + 78
  const by = ay + 92
  ctx.fillStyle = '#12091f'
  ctx.beginPath()
  ctx.arc(bx, by, 36, 0, Math.PI * 2)
  ctx.fill()
  ctx.lineWidth = 4
  ctx.strokeStyle = COLOR_ACENTO[0]
  ctx.stroke()
  ctx.fillStyle = '#ffffff'
  ctx.textAlign = 'center'
  ctx.font = 'bold 12px sans-serif'
  ctx.fillText('NIVEL', bx, by - 8)
  ctx.font = 'bold 26px sans-serif'
  ctx.fillText(String(d.nivel ?? 0), bx, by + 20)

  // Posición global debajo del avatar
  if (d.posicion) {
    ctx.font = 'bold 24px sans-serif'
    ctx.fillStyle = '#ffd36e'
    ctx.fillText(`TOP #${d.posicion}`, ax, ay + radio + 70)
  }

  // ── Datos principales (derecha) ─────────────────────────────────────
  const x0 = 380
  const anchoTexto = ANCHO - x0 - 70
  ctx.textAlign = 'left'
  ctx.fillStyle = '#ffffff'
  const nombre = String(d.nombre || 'Sin registrar').toUpperCase()
  ajustarFuente(ctx, nombre, anchoTexto, 54, 28)
  ctx.fillText(recortarTexto(ctx, nombre, anchoTexto), x0, 118)

  const ancho1 = pastillaTexto(ctx, String(d.rango || 'Novato').toUpperCase(), x0, 142, { relleno: COLOR_ACENTO[1] })
  ctx.font = '22px sans-serif'
  ctx.fillStyle = 'rgba(255,255,255,0.8)'
  const detalle = d.genero ? `${d.genero}${d.edad ? ` · ${d.edad} años` : ''}  ·  +${d.numero}` : `+${d.numero}`
  ctx.fillText(recortarTexto(ctx, detalle, anchoTexto - ancho1 - 20), x0 + ancho1 + 20, 170)

  // Barra de XP
  const by0 = 222
  ctx.font = 'bold 20px sans-serif'
  ctx.fillStyle = 'rgba(255,255,255,0.75)'
  ctx.fillText('EXPERIENCIA', x0, by0 - 12)
  ctx.textAlign = 'right'
  ctx.fillText(`${formatear(d.progreso)} / ${formatear(d.necesario)} XP`, x0 + anchoTexto, by0 - 12)
  ctx.textAlign = 'left'
  ctx.fillStyle = 'rgba(255,255,255,0.14)'
  rectRedondo(ctx, x0, by0, anchoTexto, 26, 13)
  ctx.fill()
  if (fraccion > 0) {
    const relleno = ctx.createLinearGradient(x0, 0, x0 + anchoTexto, 0)
    relleno.addColorStop(0, COLOR_ACENTO[0])
    relleno.addColorStop(1, COLOR_ACENTO[1])
    ctx.fillStyle = relleno
    rectRedondo(ctx, x0, by0, Math.max(26, anchoTexto * fraccion), 26, 13)
    ctx.fill()
  }

  // Estadísticas
  const stats = [
    ['MENSAJES', formatear(d.mensajes)],
    ['MONEDAS', formatear(d.monedas)],
    ['REPUTACIÓN', formatear(d.reputacion)],
    ['RACHA', `${d.racha || 0} d`],
  ]
  const gap = 16
  const wTile = (anchoTexto - gap * 3) / 4
  stats.forEach(([etiqueta, valor], i) => {
    const tx = x0 + i * (wTile + gap)
    ctx.fillStyle = 'rgba(255,255,255,0.09)'
    rectRedondo(ctx, tx, 280, wTile, 96, 20)
    ctx.fill()
    ctx.textAlign = 'center'
    ctx.fillStyle = '#ffffff'
    ctx.font = 'bold 34px sans-serif'
    ctx.fillText(recortarTexto(ctx, valor, wTile - 16), tx + wTile / 2, 330)
    ctx.fillStyle = 'rgba(255,255,255,0.65)'
    ctx.font = 'bold 15px sans-serif'
    ctx.fillText(etiqueta, tx + wTile / 2, 358)
  })

  // Insignias
  ctx.textAlign = 'left'
  ctx.fillStyle = 'rgba(255,255,255,0.75)'
  ctx.font = 'bold 20px sans-serif'
  ctx.fillText('LOGROS', x0, 424)
  ctx.textAlign = 'right'
  ctx.fillText(`${d.logrosObtenidos || 0} / ${d.totalLogros || 0}`, x0 + anchoTexto, 424)
  ctx.textAlign = 'left'
  const lista = (d.insignias || []).slice(0, MAX_INSIGNIAS)
  if (!lista.length) {
    ctx.fillStyle = 'rgba(255,255,255,0.45)'
    ctx.font = 'italic 20px sans-serif'
    ctx.fillText('Aún sin logros: sigue participando', x0, 475)
  }
  lista.forEach((ins, i) => insignia(ctx, x0 + 36 + i * 80, 482, 32, ins.color || '#ffffff', i))
  if ((d.insignias || []).length > MAX_INSIGNIAS) {
    ctx.fillStyle = '#ffffff'
    ctx.font = 'bold 26px sans-serif'
    ctx.textAlign = 'right'
    ctx.fillText(`+${d.insignias.length - MAX_INSIGNIAS}`, x0 + anchoTexto, 492)
    ctx.textAlign = 'left'
  }

  // Pie
  if (d.botName) {
    ctx.textAlign = 'right'
    ctx.font = 'italic 20px sans-serif'
    ctx.fillStyle = 'rgba(255,255,255,0.55)'
    ctx.fillText(d.botName, ANCHO - 56, ALTO - 50)
  }

  return canvas.toBuffer('image/jpeg', { quality: 0.92 })
}

module.exports = { generarTarjetaPerfil, _internos: { formatear, recortarTexto, rectRedondo } }
