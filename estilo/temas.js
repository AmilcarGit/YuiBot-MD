// ✏️ ESTILO DE YUI — aquí cambias letras, emojis, marcos y festividades.
// Es el único archivo que necesitas tocar para cambiar cómo se ve el bot.
//
// MODO (variable TEMA en .env, o `.tema` desde WhatsApp):
//   auto    -> usa la festividad cuyas fechas coinciden con hoy (si no hay, "normal")
//   normal  -> siempre el estilo normal
//   navidad -> siempre Navidad
//   (o la clave de cualquier tema que agregues abajo)
//
// fuente: 'script' (𝓛𝓮𝓽𝓻𝓪𝓼), 'negrita' (𝐋𝐞𝐭𝐫𝐚𝐬), 'mini' (ʟᴇᴛʀᴀꜱ) o null (negrita normal de WhatsApp)
// emojis: los "colores" del bot; WhatsApp no permite colorear texto, así que se usan emojis.
// marco: cómo se dibujan las cajas de los mensajes.
// voz: frases extra de Yui SOLO para ese tema (reemplazan a las de voz.js con la misma clave).
//
// 🎃 ¿Quieres otra festividad (Halloween, Año Nuevo...)? Copia el bloque `navidad`,
// cámbiale la clave, el nombre, las fechas y los emojis. ¡Listo!

export const modo = () => process.env.TEMA || 'auto'

// Zona horaria con la que se decide la fecha de las festividades.
export const ZONA = 'America/Lima'

export const temas = {
  normal: {
    nombre: 'Normal',
    fuente: 'negrita',
    emojis: {
      titulo: '🌸', item: '✦', ok: '✨', error: '💦', aviso: '🌙',
      dinero: '🪙', xp: '⭐', nivel: '🎀', racha: '🔥', regalo: '🎁',
      trabajo: '⚒️', juego: '🎲', persona: '🌷', logro: '🏆'
    },
    iconos: { general: '🌸', economia: '💰', juegos: '🎮', descargas: '📥', grupo: '👥', subbots: '🤖', dueno: '👑' },
    marco: { cabeza: ['╭━━〔 ', ' 〕━━⬣'], lado: '┃ ', pie: '╰━━━━━━━━━━━━━━⬣' },
    nieve: '🌸 ・ ✧ ・ 🌸 ・ ✧ ・ 🌸',
    adornos: ['🌸', '✨', '💖', '🌙', '⭐'],
    firma: '🌸 Yui siempre está contigo～'
  },

  navidad: {
    nombre: 'Navidad',
    fechas: { desde: '12-01', hasta: '01-06' }, // formato MM-DD
    fuente: 'script',
    emojis: {
      titulo: '🎄', item: '❄️', ok: '🎁', error: '🧦', aviso: '🔔',
      dinero: '🪙', xp: '⭐', nivel: '🎅', racha: '🕯️', regalo: '🎁',
      trabajo: '🛷', juego: '⛄', persona: '🦌', logro: '🏆'
    },
    iconos: { general: '🎄', economia: '🎁', juegos: '⛄', descargas: '📦', grupo: '🔔', subbots: '🦌', dueno: '🎅' },
    marco: { cabeza: ['╭❄️━〔 ', ' 〕━❄️⬣'], lado: '┃ ', pie: '╰━🎄━❄️━🎄━❄️━🎄━⬣' },
    nieve: '❄️ ・ 🎄 ・ ⭐ ・ 🎄 ・ ❄️',
    adornos: ['🎄', '❄️', '⭐', '🎁', '🔔', '☃️', '🦌', '🍪'],
    firma: '🎅 ¡Feliz Navidad de parte de Yui! 🎄',
    voz: {
      saludo: [
        '¡Feliz Navidad, {nombre}! Yui preparó chocolate caliente para ti ☕🎄',
        '¡Jo jo jo, {nombre}! Hoy la nieve brilla más con tu compañía ❄️✨'
      ],
      registrado: [
        '¡Mucho gusto, {nombre}! Soy Yui, y esta Navidad te regalo {monedas} monedas 🎁✨',
        '¡Bienvenido a la aldea navideña, {nombre}! Tu primer regalo: {monedas} monedas 🎄'
      ],
      nivelUp: [
        '¡{nombre} subió al nivel {nivel}! Hasta Santa se puso a aplaudir 🎅👏',
        '¡Nivel {nivel}, {nombre}! Una estrella más para tu árbol ⭐🎄'
      ],
      dailyOk: [
        '¡Tu regalo de hoy ya está bajo el árbol, {nombre}! 🎁✨',
        'Los duendes de Yui dejaron tu recompensa～ ¡Feliz día! 🧝❄️'
      ],
      gachaLegendaria: [
        '¡¡Una luz dorada cayó del cielo navideño!! ¡Apareció {personaje}! 🌟🎄',
        '¡Santa en persona te trajo a {personaje}! ¡Es legendaria! 🌟🎅'
      ],
      bienvenida: [
        '¡Feliz Navidad, {usuario}! Pasa, hay galletas y chocolate caliente 🍪☕',
        '¡Bienvenido, {usuario}! Esta aldea nevada te estaba esperando ❄️🎄'
      ],
      tiendaCompra: [
        '¡{objeto} envuelto para regalo y todo! Gracias por comprar en la tiendita de Yui 🎁',
        '¡Listo! {objeto} ya es tuyo, con moño rojo incluido 🎀🎄'
      ]
    }
  }
}
