// Código Oficial de YuiBot-MD.by AmilcarGit
import { caja } from '../../estilo/index.js'
import { conBotones } from '../../nucleo/botones.js'

export const VERDADES = ['¿Cuál ha sido tu mayor vergüenza en público?', '¿A quién de este chat le escribirías primero si estuvieras aburrido?', '¿Qué es lo más raro que has buscado en internet?', '¿Cuál es tu mayor miedo irracional?', '¿Qué canción te da vergüenza admitir que te gusta?', '¿Alguna vez fingiste estar enfermo para faltar? ¿Cuándo?', '¿Cuál fue tu primer amor platónico?', '¿Qué es lo más tonto que has hecho por impresionar a alguien?', '¿Qué secreto inofensivo nunca le has contado a nadie?', '¿Qué hábito tuyo crees que es el más extraño?', '¿Qué mensaje enviaste a la persona equivocada?', '¿Cuál es la mentira más grande que dijiste de niño?', '¿Qué serie o anime has visto más de tres veces?', '¿Qué es lo primero que harías si fueras invisible por un día?', '¿Qué es lo más caro que rompiste sin que nadie lo supiera?']
export const RETOS = ['Manda una nota de voz cantando el coro de tu canción favorita.', 'Cambia tu foto de perfil por una foto graciosa durante una hora.', 'Escribe un poema de cuatro líneas sobre la última persona que te escribió.', 'Haz una imitación de tu personaje favorito y mándala en audio.', 'Envía un sticker raro al último chat que tengas abierto.', 'Cuenta un chiste y espera que alguien se ría (si nadie, otro chiste).', 'Habla solo con emojis durante los próximos cinco mensajes.', 'Escribe tu nombre con los codos y manda la foto.', 'Di un trabalenguas tres veces seguidas en nota de voz.', 'Dedica una canción a alguien del grupo y explica por qué.', 'Pon tu estado "Estoy jugando verdad o reto con Yui" por una hora.', 'Haz diez sentadillas y cuenta en voz alta en un audio.', 'Describe tu día usando solo nombres de anime.', 'Dile un cumplido sincero a la persona que te retó.', 'Escribe una frase al revés y que los demás la adivinen.']
const elegir = lista => lista[Math.floor(Math.random() * lista.length)]

export default {
  nombre: 'verdadoreto',
  alias: ['verdad', 'reto', 'vor', 'truthordare'],
  categoria: 'juegos',
  ayuda: 'Verdad o reto: .verdad · .reto · .verdadoreto (elige al azar)',
  async ejecutar(sock, m, ctx) {
    const palabra = String(ctx.texto || '').trim().slice(ctx.prefijo.length).split(/\s+/)[0].toLowerCase()
    const tipo = palabra === 'verdad' ? 'verdad' : palabra === 'reto' ? 'reto' : Math.random() < 0.5 ? 'verdad' : 'reto'
    const texto = tipo === 'verdad' ? caja('Verdad', ['🔮 ' + elegir(VERDADES)]) : caja('Reto', ['🎯 ' + elegir(RETOS)])
    await conBotones(ctx, texto, [{ texto: '🔮 Verdad', cmd: 'verdad' }, { texto: '🎯 Reto', cmd: 'reto' }, { texto: '🎲 Sorpresa', cmd: 'verdadoreto' }])
  }
}
