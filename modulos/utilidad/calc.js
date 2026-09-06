//CÓDIGO ORIGINAL DE YUIBOT-MD
const MAX_LENGTH = 180

function evaluar(expresion) {
  let texto = String(expresion || '').trim()
    .replace(/[×✕]/g, '*')
    .replace(/÷/g, '/')
    .replace(/[−–—]/g, '-')
    .replace(/π/g, 'Math.PI')
    .replace(/\^/g, '**')
    .replace(/√\s*(\d+(?:\.\d+)?)/g, 'Math.sqrt($1)')
    .replace(/(\d+(?:\.\d+)?)%/g, '($1/100)')

  if (!texto || texto.length > MAX_LENGTH) throw new Error('Escribe una operación válida de hasta 180 caracteres.')
  if (!/^[0-9+\-*/().,%\sA-Za-z_*]+$/.test(texto)) throw new Error('La operación contiene caracteres no permitidos.')
  if (/[;{}\[\]`$\\:'"]/.test(texto)) throw new Error('La operación contiene caracteres no permitidos.')

  texto = texto.replace(/\bpi\b/gi, 'Math.PI').replace(/\be\b/g, 'Math.E')
  texto = texto.replace(/\bsqrt\s*\(/gi, 'Math.sqrt(')
  texto = texto.replace(/\babs\s*\(/gi, 'Math.abs(')
  texto = texto.replace(/\bsin\s*\(/gi, 'Math.sin(')
  texto = texto.replace(/\bcos\s*\(/gi, 'Math.cos(')
  texto = texto.replace(/\btan\s*\(/gi, 'Math.tan(')
  texto = texto.replace(/\blog\s*\(/gi, 'Math.log10(')
  texto = texto.replace(/\bln\s*\(/gi, 'Math.log(')
  texto = texto.replace(/\bfloor\s*\(/gi, 'Math.floor(')
  texto = texto.replace(/\bceil\s*\(/gi, 'Math.ceil(')
  texto = texto.replace(/\bround\s*\(/gi, 'Math.round(')

  if (!/^(?:Math\.(?:PI|E|sqrt|abs|sin|cos|tan|log10|log|floor|ceil|round)|[0-9+\-*/().,%\s])+$/i.test(texto)) {
    throw new Error('Solo se permiten operaciones matemáticas básicas y funciones seguras.')
  }

  const resultado = Function(`"use strict"; return (${texto})`)()
  if (!Number.isFinite(resultado)) throw new Error('El resultado no es válido.')
  return resultado
}

function formato(numero) {
  if (Number.isInteger(numero) && Math.abs(numero) < 1e15) return numero.toLocaleString('es-PE')
  return Number(numero.toPrecision(12)).toLocaleString('es-PE', { maximumFractionDigits: 12 })
}

module.exports = {
  name: 'calc',
  aliases: [],
  description: 'Calculadora avanzada',
  category: 'utilidad',
  async execute(sock, msg, args, { config }) {
    const jid = msg.key.remoteJid
    if (!args.length) {
      return sock.sendMessage(jid, { text: `╭─ ✦ 📦 CALC ✦\n│ Uso: *${config.PREFIXES[0]}calc 25 × 4*\n│ Funciones: sqrt, abs, sin, cos, tan, log, ln\n│ Extras: π, e, ^, %\n╰─ 🍃 YuiBot-MD` }, { quoted: msg })
    }
    try {
      const expresion = args.join(' ')
      const resultado = evaluar(expresion)
      await sock.sendMessage(jid, { text: `╭─ ✦ 📦 CALC ✦\n│ 🧮 Operación: *${expresion}*\n│ ✅ Resultado: *${formato(resultado)}*\n╰─ 🍃 ${config.BOT_NAME}` }, { quoted: msg })
    } catch (error) {
      await sock.sendMessage(jid, { text: `❌ ${error.message}` }, { quoted: msg })
    }
  },
}