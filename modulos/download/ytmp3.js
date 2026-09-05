//CÓDIGO ORIGINAL DE YUIBOT-MD
const { pedirAudio, pedirBusqueda } = require('../../lib/youtube')
const fs = require('fs')
const os = require('os')
const path = require('path')
const crypto = require('crypto')
const { spawn } = require('child_process')

async function descargarBuffer(url, intentos = 3) {
  let ultimoError = null

  for (let intento = 1; intento <= intentos; intento++) {
    try {
      const controlador = new AbortController()
      const temporizador = setTimeout(() => controlador.abort(), 60000)
      const respuesta = await fetch(url, {
        signal: controlador.signal,
        headers: { 'User-Agent': 'Mozilla/5.0' }
      })
      clearTimeout(temporizador)

      if (!respuesta.ok) throw new Error(`HTTP ${respuesta.status}`)

      const buffer = Buffer.from(await respuesta.arrayBuffer())
      if (!buffer.length) throw new Error('Respuesta vacía')
      return buffer
    } catch (error) {
      ultimoError = error
      if (intento < intentos) await new Promise((resolve) => setTimeout(resolve, 1500 * intento))
    }
  }

  throw ultimoError || new Error('No se pudo descargar el archivo')
}

function ejecutarProceso(comando, argumentos) {
  return new Promise((resolve, reject) => {
    const proceso = spawn(comando, argumentos, { stdio: ['ignore', 'pipe', 'pipe'] })
    let stdout = ''
    let stderr = ''
    proceso.stdout.on('data', (data) => { stdout += data.toString() })
    proceso.stderr.on('data', (data) => { stderr += data.toString() })
    proceso.on('error', reject)
    proceso.on('close', (codigo) => {
      if (codigo === 0) return resolve({ stdout, stderr })
      reject(new Error(stderr.trim() || `El proceso terminó con código ${codigo}`))
    })
  })
}

async function normalizarAudio(buffer) {
  const base = path.join(os.tmpdir(), `yui-play-${crypto.randomUUID()}`)
  const entrada = `${base}.input`
  const salida = `${base}.mp3`

  try {
    fs.writeFileSync(entrada, buffer)
    await ejecutarProceso('ffmpeg', [
      '-y',
      '-i', entrada,
      '-vn',
      '-c:a', 'libmp3lame',
      '-b:a', '192k',
      '-ar', '44100',
      '-ac', '2',
      '-id3v2_version', '3',
      salida
    ])

    const resultado = fs.readFileSync(salida)
    if (!resultado.length) throw new Error('La conversión produjo un archivo vacío')
    return resultado
  } finally {
    for (const archivo of [entrada, salida]) {
      try { fs.unlinkSync(archivo) } catch {}
    }
  }
}

async function obtenerAudioDescargable(url, intentos = 3) {
  let ultimoError = null

  for (let intento = 1; intento <= intentos; intento++) {
    try {
      const data = await pedirAudio(url)
      const audioUrl = data?.datos?.url
      if (!audioUrl) throw new Error('La API no devolvió una URL válida para el audio')

      const buffer = await descargarBuffer(audioUrl, 2)
      const audioNormalizado = await normalizarAudio(buffer)
      return { data, buffer: audioNormalizado }
    } catch (error) {
      ultimoError = error
      if (intento < intentos) await new Promise((resolve) => setTimeout(resolve, 2000 * intento))
    }
  }

  throw ultimoError || new Error('No se pudo obtener el audio')
}

module.exports = {
  name: 'ytmp3',
  aliases: ['play', 'ytaudio'],
  description: 'Descarga audio (MP3) de YouTube por enlace o nombre',
  category: 'download',

  async execute(sock, msg, args) {
    const jid = msg.key.remoteJid
    const entrada = args.join(' ').trim()

    if (!entrada) {
      return sock.sendMessage(jid, { text: `❌ Escribe el nombre de una canción o un enlace de YouTube.\n\n📌 Ejemplos:\n.play Bad Bunny Monaco\n.play https://www.youtube.com/watch?v=ZFG0mHN-BNA` }, { quoted: msg })
    }

    try {
      let youtubeUrl = entrada
      let resultadoBusqueda = null
      const esUrlYoutube = entrada.includes('youtube.com/') || entrada.includes('youtu.be/')

      if (!esUrlYoutube) {
        await sock.sendMessage(jid, { text: `🔎 Buscando en YouTube...\n\n> ${entrada}` }, { quoted: msg })
        const dataBusqueda = await pedirBusqueda(entrada)
        const videos = dataBusqueda?.datos?.results?.videos || []
        if (!videos.length) return sock.sendMessage(jid, { text: `❌ No encontré resultados para:\n\n> ${entrada}` }, { quoted: msg })
        resultadoBusqueda = videos[0]
        if (!resultadoBusqueda?.url) return sock.sendMessage(jid, { text: '❌ El primer resultado no tiene un enlace válido de YouTube.' }, { quoted: msg })
        youtubeUrl = resultadoBusqueda.url
      }

      if (!youtubeUrl.includes('youtube.com/') && !youtubeUrl.includes('youtu.be/')) {
        return sock.sendMessage(jid, { text: '❌ El enlace no parece ser un enlace válido de YouTube.' }, { quoted: msg })
      }

      const tituloBusqueda = resultadoBusqueda?.title || youtubeUrl
      await sock.sendMessage(jid, { text: `⏳ Descargando audio...\n\n🎵 ${tituloBusqueda}` }, { quoted: msg })

      const { data, buffer } = await obtenerAudioDescargable(youtubeUrl, 3)
      const filename = `${(data.titulo || resultadoBusqueda?.title || 'youtube').replace(/[\\/:*?"<>|]/g, '_')}.mp3`
      const pesoMB = buffer.length / (1024 * 1024)

      await sock.sendMessage(jid, { audio: buffer, mimetype: 'audio/mpeg', fileName: filename, ptt: false }, { quoted: msg })

      const caption = `╭━━━〔 🎵 YOUTUBE AUDIO 〕━━━╮\n┃ 🎵 ${data.titulo || resultadoBusqueda?.title || 'Sin título'}\n┃ 👤 ${data.canal || resultadoBusqueda?.channel || 'Desconocido'}\n┃ ⏱️ ${data.duracion || resultadoBusqueda?.duration || 'Desconocida'}\n┃ 🎧 Calidad: ${data.datos.calidad || '192 kbps'}\n┃ 💾 Tamaño: ${pesoMB.toFixed(1)} MB\n╰━━━━━━━━━━━━━━━━━━━━━━╯`

      await sock.sendMessage(jid, { text: caption }, { quoted: msg })
    } catch (error) {
      console.error('[PLAY/YTMP3]', error)
      await sock.sendMessage(jid, { text: `❌ No se pudo descargar el audio.\n\n> ${error.message || 'Error desconocido'}` }, { quoted: msg })
    }
  }
}