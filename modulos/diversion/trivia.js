const { agregarMonedasConBoost } = require('../../lib/db')

const PREGUNTAS = [
  { pregunta: '¿Cuál es el planeta más grande del sistema solar?', opciones: ['Marte', 'Júpiter', 'Saturno', 'Tierra'], correcta: 1 },
  { pregunta: '¿En qué país se originó el anime?', opciones: ['China', 'Corea del Sur', 'Japón', 'Tailandia'], correcta: 2 },
  { pregunta: '¿Cuántos huesos tiene el cuerpo humano adulto?', opciones: ['186', '206', '226', '246'], correcta: 1 },
  { pregunta: '¿Cuál es el río más largo de Sudamérica?', opciones: ['Nilo', 'Amazonas', 'Yangtsé', 'Misisipi'], correcta: 1 },
  { pregunta: '¿Qué gas constituye la mayor parte de la atmósfera terrestre?', opciones: ['Oxígeno', 'Nitrógeno', 'CO₂', 'Hidrógeno'], correcta: 1 },
  { pregunta: '¿Quién pintó la Mona Lisa?', opciones: ['Van Gogh', 'Picasso', 'Da Vinci', 'Miguel Ángel'], correcta: 2 },
  { pregunta: '¿Cuál es la lengua materna con más hablantes nativos?', opciones: ['Inglés', 'Español', 'Mandarín', 'Hindi'], correcta: 2 },
  { pregunta: '¿Cuál es el símbolo químico del oro?', opciones: ['Ag', 'Au', 'Gd', 'Go'], correcta: 1 },
  { pregunta: '¿Cuántos continentes se consideran tradicionalmente?', opciones: ['5', '6', '7', '8'], correcta: 2 },
  { pregunta: '¿Cuál es la capital de Australia?', opciones: ['Sídney', 'Melbourne', 'Canberra', 'Perth'], correcta: 2 },
  { pregunta: '¿Qué órgano bombea la sangre por el cuerpo?', opciones: ['Pulmón', 'Hígado', 'Corazón', 'Riñón'], correcta: 2 },
  { pregunta: '¿Cuál es el océano más grande?', opciones: ['Atlántico', 'Índico', 'Ártico', 'Pacífico'], correcta: 3 },
  { pregunta: '¿Quién escribió Don Quijote de la Mancha?', opciones: ['Cervantes', 'Shakespeare', 'Dante', 'Goethe'], correcta: 0 },
  { pregunta: '¿Cuánto es 12 × 8?', opciones: ['86', '96', '108', '112'], correcta: 1 },
  { pregunta: '¿Cuál es el planeta conocido como planeta rojo?', opciones: ['Venus', 'Marte', 'Mercurio', 'Neptuno'], correcta: 1 },
  { pregunta: '¿Qué elemento químico tiene número atómico 1?', opciones: ['Helio', 'Hidrógeno', 'Oxígeno', 'Carbono'], correcta: 1 },
  { pregunta: '¿Cuál es la velocidad aproximada de la luz en el vacío?', opciones: ['300 km/s', '3 000 km/s', '300 000 km/s', '3 000 000 km/s'], correcta: 2 },
  { pregunta: '¿Cuál es el país más grande del mundo por superficie?', opciones: ['Canadá', 'China', 'Rusia', 'EE. UU.'], correcta: 2 },
  { pregunta: '¿Qué instrumento mide la temperatura?', opciones: ['Barómetro', 'Termómetro', 'Higrómetro', 'Anemómetro'], correcta: 1 },
  { pregunta: '¿Cuál es la capital de Japón?', opciones: ['Kioto', 'Osaka', 'Tokio', 'Nara'], correcta: 2 },
  { pregunta: '¿Qué planeta tiene los anillos más visibles?', opciones: ['Marte', 'Saturno', 'Venus', 'Mercurio'], correcta: 1 },
  { pregunta: '¿Cuál es el mamífero más grande?', opciones: ['Elefante africano', 'Ballena azul', 'Jirafa', 'Orca'], correcta: 1 },
  { pregunta: '¿Qué vitamina produce principalmente la piel con la luz solar?', opciones: ['A', 'B12', 'C', 'D'], correcta: 3 },
  { pregunta: '¿Cuál es el número primo más pequeño?', opciones: ['0', '1', '2', '3'], correcta: 2 },
  { pregunta: '¿Qué metal es líquido a temperatura ambiente?', opciones: ['Hierro', 'Mercurio', 'Aluminio', 'Cobre'], correcta: 1 },
  { pregunta: '¿Cuál es la capital de Perú?', opciones: ['Cusco', 'Arequipa', 'Lima', 'Trujillo'], correcta: 2 },
  { pregunta: '¿Qué país tiene forma aproximada de bota?', opciones: ['España', 'Italia', 'Grecia', 'Portugal'], correcta: 1 },
  { pregunta: '¿Cuál es el idioma oficial de Brasil?', opciones: ['Español', 'Portugués', 'Francés', 'Inglés'], correcta: 1 },
  { pregunta: '¿Qué planeta está más cerca del Sol?', opciones: ['Venus', 'Mercurio', 'Tierra', 'Marte'], correcta: 1 },
  { pregunta: '¿Cuál es el símbolo químico del oxígeno?', opciones: ['O', 'Ox', 'Og', 'C'], correcta: 0 },
  { pregunta: '¿Cuántos lados tiene un hexágono?', opciones: ['5', '6', '7', '8'], correcta: 1 },
  { pregunta: '¿Cuál es la raíz cuadrada de 144?', opciones: ['10', '11', '12', '14'], correcta: 2 },
  { pregunta: '¿Quién formuló la teoría de la relatividad?', opciones: ['Newton', 'Einstein', 'Tesla', 'Bohr'], correcta: 1 },
  { pregunta: '¿Qué órgano humano filtra principalmente la sangre para formar orina?', opciones: ['Corazón', 'Riñón', 'Pulmón', 'Estómago'], correcta: 1 },
  { pregunta: '¿Cuál es el desierto cálido más grande del mundo?', opciones: ['Gobi', 'Sahara', 'Atacama', 'Kalahari'], correcta: 1 },
  { pregunta: '¿Cuál es la capital de Francia?', opciones: ['Roma', 'París', 'Madrid', 'Berlín'], correcta: 1 },
  { pregunta: '¿Qué planeta es el más caliente del sistema solar?', opciones: ['Mercurio', 'Venus', 'Marte', 'Júpiter'], correcta: 1 },
  { pregunta: '¿Cuántos minutos tiene una hora?', opciones: ['30', '45', '60', '90'], correcta: 2 },
  { pregunta: '¿Qué animal es conocido por cambiar de color?', opciones: ['Camaleón', 'Tigre', 'Delfín', 'Pingüino'], correcta: 0 },
  { pregunta: '¿Cuál es el océano que separa América de Europa y África?', opciones: ['Pacífico', 'Atlántico', 'Índico', 'Ártico'], correcta: 1 },
  { pregunta: '¿Qué ciencia estudia los seres vivos?', opciones: ['Geología', 'Biología', 'Astronomía', 'Física'], correcta: 1 },
  { pregunta: '¿Cuál es el satélite natural de la Tierra?', opciones: ['Fobos', 'Luna', 'Europa', 'Titán'], correcta: 1 },
  { pregunta: '¿Qué país construyó las pirámides de Guiza?', opciones: ['México', 'Egipto', 'Grecia', 'Irak'], correcta: 1 },
  { pregunta: '¿Cuántos grados tiene un ángulo recto?', opciones: ['45°', '90°', '180°', '360°'], correcta: 1 },
  { pregunta: '¿Cuál es el símbolo químico de la plata?', opciones: ['Pt', 'Ag', 'Au', 'Al'], correcta: 1 },
  { pregunta: '¿Quién escribió Romeo y Julieta?', opciones: ['Shakespeare', 'Cervantes', 'Homero', 'Virgilio'], correcta: 0 },
  { pregunta: '¿Qué planeta tiene la Gran Mancha Roja?', opciones: ['Saturno', 'Júpiter', 'Urano', 'Neptuno'], correcta: 1 },
  { pregunta: '¿Cuál es el país con mayor población de Sudamérica?', opciones: ['Argentina', 'Colombia', 'Brasil', 'Perú'], correcta: 2 },
  { pregunta: '¿Qué aparato se utiliza para observar objetos muy pequeños?', opciones: ['Telescopio', 'Microscopio', 'Periscopio', 'Radar'], correcta: 1 },
  { pregunta: '¿Cuál es el hueso más largo del cuerpo humano?', opciones: ['Fémur', 'Tibia', 'Húmero', 'Radio'], correcta: 0 },
  { pregunta: '¿Qué parte de la planta realiza principalmente la fotosíntesis?', opciones: ['Raíz', 'Hoja', 'Semilla', 'Flor'], correcta: 1 },
  { pregunta: '¿Cuál es la capital de Canadá?', opciones: ['Toronto', 'Vancouver', 'Ottawa', 'Montreal'], correcta: 2 },
  { pregunta: '¿Qué fuerza atrae los objetos hacia la Tierra?', opciones: ['Fricción', 'Gravedad', 'Electricidad', 'Magnetismo'], correcta: 1 },
  { pregunta: '¿Cuántos planetas hay en el sistema solar?', opciones: ['7', '8', '9', '10'], correcta: 1 },
  { pregunta: '¿Cuál es el continente más grande?', opciones: ['África', 'Europa', 'Asia', 'América'], correcta: 2 },
  { pregunta: '¿Qué sangre se considera donante universal de glóbulos rojos?', opciones: ['AB+', 'A+', 'O−', 'B−'], correcta: 2 },
  { pregunta: '¿Qué órgano controla gran parte de las funciones del cuerpo?', opciones: ['Cerebro', 'Bazo', 'Páncreas', 'Riñón'], correcta: 0 },
  { pregunta: '¿Cuál es el país de origen de los Juegos Olímpicos antiguos?', opciones: ['Italia', 'Grecia', 'Egipto', 'Turquía'], correcta: 1 },
  { pregunta: '¿Qué número representa la letra X en números romanos?', opciones: ['5', '10', '50', '100'], correcta: 1 },
  { pregunta: '¿Cuál es el metal más abundante en la corteza terrestre?', opciones: ['Hierro', 'Aluminio', 'Cobre', 'Oro'], correcta: 1 },
  { pregunta: '¿Qué planeta gira prácticamente de lado?', opciones: ['Urano', 'Marte', 'Venus', 'Mercurio'], correcta: 0 },
  { pregunta: '¿Qué ciencia estudia los astros y el universo?', opciones: ['Astronomía', 'Anatomía', 'Ecología', 'Botánica'], correcta: 0 },
  { pregunta: '¿Cuál es el animal terrestre más grande?', opciones: ['Rinoceronte', 'Elefante africano', 'Hipopótamo', 'Jirafa'], correcta: 1 },
  { pregunta: '¿Qué molécula contiene la información genética?', opciones: ['ATP', 'ADN', 'CO₂', 'ARNt'], correcta: 1 },
  { pregunta: '¿Cuál es la capital de Italia?', opciones: ['Milán', 'Venecia', 'Roma', 'Nápoles'], correcta: 2 },
  { pregunta: '¿Cuánto es 15²?', opciones: ['125', '200', '225', '250'], correcta: 2 },
  { pregunta: '¿Qué gas necesitan principalmente las plantas para la fotosíntesis?', opciones: ['Oxígeno', 'Nitrógeno', 'Dióxido de carbono', 'Helio'], correcta: 2 },
  { pregunta: '¿Cuál es el punto más alto de la Tierra sobre el nivel del mar?', opciones: ['K2', 'Everest', 'Aconcagua', 'Mont Blanc'], correcta: 1 },
  { pregunta: '¿Qué país es famoso por la Torre Eiffel?', opciones: ['Francia', 'Bélgica', 'Suiza', 'Austria'], correcta: 0 },
  { pregunta: '¿Qué planeta es conocido como gigante gaseoso y tiene grandes anillos?', opciones: ['Saturno', 'Marte', 'Venus', 'Mercurio'], correcta: 0 },
  { pregunta: '¿Qué parte del cuerpo humano contiene la retina?', opciones: ['Oído', 'Ojo', 'Nariz', 'Piel'], correcta: 1 },
  { pregunta: '¿Cuál es la capital de España?', opciones: ['Barcelona', 'Madrid', 'Sevilla', 'Valencia'], correcta: 1 },
  { pregunta: '¿Qué tipo de animal es una rana?', opciones: ['Reptil', 'Anfibio', 'Mamífero', 'Ave'], correcta: 1 },
  { pregunta: '¿Cuál es el resultado de 144 ÷ 12?', opciones: ['10', '11', '12', '14'], correcta: 2 },
  { pregunta: '¿Qué planeta tiene mayor tamaño después de Júpiter?', opciones: ['Saturno', 'Urano', 'Neptuno', 'Tierra'], correcta: 0 },
  { pregunta: '¿Cuál es el símbolo químico del hierro?', opciones: ['Fe', 'Ir', 'H', 'Hi'], correcta: 0 },
  { pregunta: '¿Qué capa de la atmósfera contiene la mayor parte del ozono?', opciones: ['Troposfera', 'Estratosfera', 'Mesosfera', 'Exosfera'], correcta: 1 },
  { pregunta: '¿Cuál es la capital de Argentina?', opciones: ['Córdoba', 'Rosario', 'Buenos Aires', 'Mendoza'], correcta: 2 },
  { pregunta: '¿Qué instrumento mide la presión atmosférica?', opciones: ['Termómetro', 'Barómetro', 'Anemómetro', 'Pluviómetro'], correcta: 1 },
  { pregunta: '¿Quién fue conocido por desarrollar las leyes del movimiento y la gravitación?', opciones: ['Newton', 'Darwin', 'Faraday', 'Pasteur'], correcta: 0 },
  { pregunta: '¿Cuál es el continente más pequeño por superficie?', opciones: ['Europa', 'Oceanía', 'Antártida', 'África'], correcta: 1 },
  { pregunta: '¿Qué planeta tiene una temperatura superficial extremadamente alta debido a su densa atmósfera?', opciones: ['Venus', 'Marte', 'Urano', 'Neptuno'], correcta: 0 },
  { pregunta: '¿Cuál es la capital de Alemania?', opciones: ['Múnich', 'Hamburgo', 'Berlín', 'Frankfurt'], correcta: 2 },
  { pregunta: '¿Qué órgano produce insulina?', opciones: ['Páncreas', 'Hígado', 'Corazón', 'Pulmón'], correcta: 0 },
  { pregunta: '¿Cuántos cromosomas tiene normalmente una célula somática humana?', opciones: ['23', '44', '46', '48'], correcta: 2 },
  { pregunta: '¿Qué océano rodea la Antártida?', opciones: ['Océano Austral', 'Atlántico', 'Índico', 'Pacífico'], correcta: 0 },
  { pregunta: '¿Cuál es el símbolo químico del sodio?', opciones: ['S', 'So', 'Na', 'Sd'], correcta: 2 },
  { pregunta: '¿Qué fenómeno explica el cambio aparente de frecuencia de una onda por movimiento relativo?', opciones: ['Efecto Doppler', 'Efecto fotoeléctrico', 'Efecto Compton', 'Principio de Arquímedes'], correcta: 0 },
  { pregunta: '¿Cuál es la capital de México?', opciones: ['Guadalajara', 'Monterrey', 'Ciudad de México', 'Puebla'], correcta: 2 },
  { pregunta: '¿Qué unidad se utiliza para medir la corriente eléctrica?', opciones: ['Voltio', 'Ohmio', 'Amperio', 'Julio'], correcta: 2 },
  { pregunta: '¿Qué científico propuso la selección natural como mecanismo de evolución?', opciones: ['Darwin', 'Einstein', 'Mendel', 'Copérnico'], correcta: 0 },
  { pregunta: '¿Cuál es el planeta más alejado del Sol entre los ocho planetas?', opciones: ['Urano', 'Neptuno', 'Saturno', 'Marte'], correcta: 1 },
  { pregunta: '¿Qué órgano es responsable principalmente del intercambio de oxígeno y dióxido de carbono?', opciones: ['Corazón', 'Pulmones', 'Riñones', 'Hígado'], correcta: 1 },
  { pregunta: '¿Qué país tiene como capital a Seúl?', opciones: ['Japón', 'Corea del Sur', 'Vietnam', 'Mongolia'], correcta: 1 },
  { pregunta: '¿Cuál es el resultado de 2⁸?', opciones: ['128', '256', '512', '64'], correcta: 1 },
  { pregunta: '¿Qué rama de la física estudia el calor y la energía?', opciones: ['Óptica', 'Termodinámica', 'Acústica', 'Mecánica cuántica'], correcta: 1 },
  { pregunta: '¿Cuál es el símbolo químico del carbono?', opciones: ['Ca', 'C', 'Co', 'Cr'], correcta: 1 },
  { pregunta: '¿Qué planeta tiene el día más largo aproximadamente?', opciones: ['Venus', 'Marte', 'Júpiter', 'Mercurio'], correcta: 0 },
  { pregunta: '¿Cuál es la capital de Chile?', opciones: ['Valparaíso', 'Santiago', 'Concepción', 'Antofagasta'], correcta: 1 },
  { pregunta: '¿Qué estructura celular contiene el material genético en las células eucariotas?', opciones: ['Ribosoma', 'Núcleo', 'Membrana', 'Lisosoma'], correcta: 1 },
  { pregunta: '¿Cuál es el resultado de 17 × 6?', opciones: ['92', '102', '112', '122'], correcta: 1 },
  { pregunta: '¿Qué científico descubrió la penicilina?', opciones: ['Fleming', 'Curie', 'Pasteur', 'Tesla'], correcta: 0 },
  { pregunta: '¿Cuál es el país más pequeño del mundo por superficie?', opciones: ['Mónaco', 'Vaticano', 'San Marino', 'Liechtenstein'], correcta: 1 },
  { pregunta: '¿Qué fenómeno ocurre cuando la Luna se interpone entre el Sol y la Tierra?', opciones: ['Eclipse lunar', 'Eclipse solar', 'Solsticio', 'Equinoccio'], correcta: 1 },
]

module.exports = {
  name: 'trivia',
  aliases: ['quiz'],
  description: 'Responde una pregunta de trivia y gana monedas',
  category: 'diversion',

  async execute(sock, msg, args, { config }) {
    const jid = msg.key.remoteJid
    const remitenteOriginal = msg.key.participantAlt || msg.key.participant || jid

    const item = PREGUNTAS[Math.floor(Math.random() * PREGUNTAS.length)]

    let texto = `🧠 *TRIVIA*\n\n${item.pregunta}\n\n`
    item.opciones.forEach((opcion, i) => {
      texto += `${i + 1}. ${opcion}\n`
    })
    texto += `\n╰─➤ _Responde con el número correcto (30 segundos)_ 🥀`

    await sock.sendMessage(jid, { text: texto }, { quoted: msg })

    const respuesta = await new Promise((resolve) => {
      const escuchar = (upsert) => {
        const nuevoMsg = upsert.messages?.[0]
        if (!nuevoMsg?.message) return
        const remitenteNuevo = nuevoMsg.key.participantAlt || nuevoMsg.key.participant || nuevoMsg.key.remoteJid
        if (nuevoMsg.key.remoteJid !== jid || remitenteNuevo !== remitenteOriginal) return

        const texto = nuevoMsg.message.conversation || nuevoMsg.message.extendedTextMessage?.text || ''
        const numero = parseInt(texto.trim(), 10)
        if (numero >= 1 && numero <= item.opciones.length) {
          sock.ev.off('messages.upsert', escuchar)
          resolve(numero)
        }
      }
      sock.ev.on('messages.upsert', escuchar)
      setTimeout(() => {
        sock.ev.off('messages.upsert', escuchar)
        resolve(null)
      }, 30000)
    })

    const numeroRemitente = remitenteOriginal.split('@')[0].split(':')[0]

    if (respuesta === null) {
      return sock.sendMessage(
        jid,
        { text: `⌛ Se acabó el tiempo. La respuesta correcta era: *${item.opciones[item.correcta]}*` },
        { quoted: msg }
      )
    }

    if (respuesta - 1 === item.correcta) {
      const recompensa = config.ECONOMIA?.TRIVIA_RECOMPENSA ?? 50
      const balance = agregarMonedasConBoost(numeroRemitente, recompensa)
      return sock.sendMessage(
        jid,
        { text: `✅ ¡Correcto! Ganaste *${recompensa}* monedas.\n💰 Balance: ${balance} monedas.` },
        { quoted: msg }
      )
    }

    await sock.sendMessage(
      jid,
      { text: `❌ Incorrecto. La respuesta correcta era: *${item.opciones[item.correcta]}*` },
      { quoted: msg }
    )
  },
}
