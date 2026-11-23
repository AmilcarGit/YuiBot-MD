// ✏️ LA VOZ DE YUI — todas las frases del bot, con su personalidad de chica de anime.
// Cada clave es una lista: Yui elige una al azar. Agrega todas las variantes que quieras.
// Los {huecos} se rellenan solos (por ejemplo {nombre}, {monedas}, {tiempo}).
//
// Consejo: usa "～" (el de aquí) y no "~", y evita los guiones bajos y asteriscos
// dentro de las caritas, porque WhatsApp los convierte en cursiva, tachado o negrita.

export const voz = {
  // ── Avisos generales ──────────────────────────────────────────
  soloDueno: [
    'Ehh～ eso solo lo puede pedir mi dueño (｡•́︿•̀｡)',
    'Lo siento, ese comando es solo para mi dueño (>﹏<)'
  ],
  soloGrupo: [
    'Eso solo funciona en grupos, ¡vamos a uno juntos! (•̀ᴗ•́)و',
    'Necesito un grupo para eso～ ¡llévame a uno! ✨'
  ],
  soloPrivado: [
    'Mejor hablemos en privado para eso, ¿sí? (⁄ ⁄>⁄ ▽ ⁄<⁄ ⁄)',
    'Eso es un secretito, pídemelo por mensaje privado (〃▽〃)'
  ],
  soloAdmin: [
    'Solo los admins pueden usar eso, ¡lo siento! (｡•́︿•̀｡)',
    'Uuu～ eso es cosa de administradores (>﹏<)'
  ],
  registro: [
    'Primero necesito conocerte～ Regístrate con {prefijo}registrar tuNombre ✨',
    '¡Aún no nos presentamos! Usa {prefijo}registrar tuNombre y empezamos (•ᴗ•)'
  ],
  fallo: [
    '¡Kyaa! Algo salió mal, inténtalo otra vez (>﹏<)',
    'Ay no, se me enredaron los cables… ¿lo intentas de nuevo? (；ω；)'
  ],
  nivelUp: [
    '¡Felicidades, {nombre}! Subiste al nivel {nivel} (≧▽≦)',
    '¡Nivel {nivel}! Estoy tan orgullosa de ti, {nombre} (๑>◡<๑)',
    '¡Wooow, {nombre}! Ya eres nivel {nivel} ✨'
  ],

  // ── Menú ──────────────────────────────────────────────────────
  saludo: [
    '¡Hola, {nombre}! Soy Yui y estoy lista para ayudarte (≧◡≦)',
    '¡Bienvenido, {nombre}! ¿Qué hacemos hoy? (•̀ᴗ•́)و',
    '¡Kyaa, {nombre}! Qué alegría verte por aquí ✨'
  ],

  // ── Registro / perfil ─────────────────────────────────────────
  registrado: [
    '¡Mucho gusto, {nombre}! Soy Yui～ Te regalo {monedas} monedas de bienvenida ✨',
    '¡Ya somos amigos, {nombre}! Toma {monedas} monedas para empezar (≧▽≦)'
  ],
  yaRegistrado: [
    'Ya te conozco, {nombre}～ (｡•̀ᴗ-)✧',
    '¡Jeje, ya estás registrado, {nombre}! (〃▽〃)'
  ],
  usoRegistrar: [
    'Dime tu nombre así: {prefijo}registrar tuNombre (•ᴗ•)',
    '¿Cómo te llamas? Escribe {prefijo}registrar tuNombre ✨'
  ],

  // ── Recompensa diaria ─────────────────────────────────────────
  dailyEspera: [
    'Aún no es hora～ vuelve en {tiempo} (¬‿¬)',
    'Paciencia, {nombre}～ tu premio estará listo en {tiempo} (｡•̀ᴗ-)'
  ],
  dailyOk: [
    '¡Aquí está tu recompensa de hoy, {nombre}! ✨',
    '¡Yui te trajo tu premio diario! (≧▽≦)',
    'Un regalito para mi persona favorita (๑>◡<๑)'
  ],

  // ── Trabajo ───────────────────────────────────────────────────
  trabajoNoExiste: [
    'Mmm, no conozco ese trabajo (・・?)',
    'Ese oficio no está en mi lista (｡•́︿•̀｡)'
  ],
  trabajoNivel: [
    'Todavía no tienes el nivel para eso, necesitas nivel {nivel} (>﹏<)',
    'Aún no, {nombre}～ ese oficio pide nivel {nivel} (•́︿•̀)'
  ],
  trabajoNuevo: [
    '¡Desde ahora eres {trabajo}! ¡Ánimo! (ง •̀ω•́)ง',
    '¡Nuevo oficio: {trabajo}! Yui cree en ti ✨'
  ],
  trabajoElige: [
    'Elige tu oficio, ¡hay para todos! (•̀ᴗ•́)و',
    '¿En qué quieres trabajar? ✨'
  ],
  trabajoEspera: [
    '¡Descansa un poquito! Vuelve en {tiempo} (´｡• ᵕ •｡)',
    'Estás agotado～ regresa en {tiempo} y trabajamos de nuevo (｡•́︿•̀｡)'
  ],
  trabajoPago: [
    'Trabajaste de {trabajo} y ganaste {monto} monedas. ¡Buen trabajo! ✨',
    '¡Qué esfuerzo, {nombre}! Como {trabajo} ganaste {monto} monedas (≧▽≦)'
  ],

  // ── Gacha ─────────────────────────────────────────────────────
  gachaSinMonedas: [
    'Necesitas {costo} monedas para invocar (；ω；)',
    'Te faltan monedas～ invocar cuesta {costo} (>﹏<)'
  ],
  gachaComun: [
    'Respondió {personaje}. ¡Todos son importantes! (•ᴗ•)',
    'Apareció {personaje}～ ¡un nuevo amigo! ✨'
  ],
  gachaRara: [
    '¡Ooh! Apareció {personaje}, ¡es rara! (๑•̀ㅂ•́)و',
    '¡Kyaa! {personaje} respondió a tu llamado ✨'
  ],
  gachaEpica: [
    '¡¡Increíble!! {personaje} es épica (≧▽≦)',
    '¡Una luz morada! ¡Es {personaje}! 💜✨'
  ],
  gachaLegendaria: [
    '¡¡¡LEGENDARIA!!! ¡{personaje} cruzó el portal por ti! (☆▽☆)',
    '¡No lo puedo creer! ¡Es {personaje}! 🌟✨'
  ],

  // ── Tienda ────────────────────────────────────────────────────
  tiendaNoExiste: [
    'Ese objeto no está en mi tienda (・・?)',
    'Mmm, no tengo eso en el catálogo (｡•́︿•̀｡)'
  ],
  tiendaTienes: [
    '¡Ya tienes ese objeto! (〃▽〃)',
    'Jeje, eso ya lo compraste～'
  ],
  tiendaPobre: [
    'Te faltan monedas para eso (；ω；)',
    'Aún no te alcanza～ ¡sigue ahorrando! (•̀ᴗ•́)و'
  ],
  tiendaCompra: [
    '¡Compraste {objeto}! Gracias por venir (≧▽≦)',
    '¡Listo! {objeto} ya es tuyo ✨'
  ],
  tiendaLista: [
    '¡Bienvenido a la tiendita de Yui! (•̀ᴗ•́)و',
    '¡Pasa, pasa! Mira lo que tengo hoy ✨'
  ],

  // ── Ruleta ────────────────────────────────────────────────────
  ruletaUso: [
    'Se juega así: {uso} (•ᴗ•)',
    '¿Apostamos? Escribe {uso} ✨'
  ],
  ruletaPobre: [
    'No tienes tantas monedas (；ω；)',
    'Esa apuesta es muy grande para tu bolsillo (>﹏<)'
  ],
  ruletaGana: [
    '¡Ganaste {monto} monedas! ¡Qué suerte! (≧▽≦)',
    '¡Kyaa! ¡{monto} monedas para ti! ✨'
  ],
  ruletaPierde: [
    'Perdiste {monto} monedas… ¡la próxima será! (｡•́︿•̀｡)',
    'Uuu, la ruleta no estuvo de tu lado: -{monto} (>﹏<)'
  ],

  // ── Adivina el número ─────────────────────────────────────────
  adivinaInicio: [
    'Pensé un número del 1 al 10. Tienes 3 intentos: {prefijo}adivina número (•̀ᴗ•́)و',
    '¡Ya pensé uno! Del 1 al 10, tienes 3 intentos: {prefijo}adivina número ✨'
  ],
  adivinaSinPartida: [
    'No hay partida activa. Empieza con {prefijo}adivina (•ᴗ•)',
    'Primero dime que quieres jugar: {prefijo}adivina ✨'
  ],
  adivinaGana: [
    '¡Acertaste! Ganaste {premio} monedas (≧▽≦)',
    '¡Lo adivinaste! Toma {premio} monedas ✨'
  ],
  adivinaGanaSinPremio: [
    '¡Acertaste! Pero no hay premio todavía: {motivo} (•ᴗ•)'
  ],
  adivinaGanaEspera: [
    '¡Acertaste! El próximo premio estará listo en {tiempo} (•ᴗ•)',
    '¡Lo lograste! Pero el premio vuelve en {tiempo}～ ✨'
  ],
  adivinaPierde: [
    'Perdiste… el número era {numero} (｡•́︿•̀｡)',
    '¡Casi! Era el {numero}～ (>﹏<)'
  ],
  adivinaPista: [
    '{pista}. Te quedan {intentos} intentos (•̀ᴗ•́)',
    '{pista}～ quedan {intentos} intentos ✨'
  ],

  // ── Piedra, papel o tijera ────────────────────────────────────
  descargaUso: [
    'Dime qué buscar así: {uso} (•ᴗ•)',
    '¿Qué canción quieres? Escribe {uso} ✨'
  ],
  descargaEspera: [
    'Buscándolo para ti～ dame un momentito (๑>◡<๑)',
    'Ya voy por ello, ¡no tardo! ✨'
  ],
  descargaOcupada: [
    'Todavía estoy con tu descarga anterior, espera un poquito (>﹏<)',
    'Una a la vez, ¿sí? Termino la anterior y sigo contigo (｡•́︿•̀｡)'
  ],
  descargaNada: [
    'No encontré nada con eso (；ω；) prueba con otro nombre.',
    'Busqué y busqué, pero no salió nada… ¿lo intentas con otras palabras? (｡•́︿•̀｡)'
  ],
  descargaFallo: [
    'Uy～ no pude descargarlo ahora, la API está dormida o el enlace no sirve. Inténtalo en un rato (；ω；)',
    'Ay no, no logré traerlo (>﹏<) prueba otra vez en unos minutos.'
  ],
  pptUso: [
    'Juega así: {uso} (•ᴗ•)',
    '¿Jugamos? Escribe {uso} ✨'
  ],
  pptGana: [
    '¡Me ganaste! Jeje, bien jugado (≧▽≦)',
    '¡Kyaa, ganaste! ¡Revancha! (๑>◡<๑)'
  ],
  pptPierde: [
    '¡Gané yo! (☆▽☆)',
    'Jiji, esta vez gané yo～ ✨'
  ],
  pptEmpate: [
    '¡Empate! Pensamos igual (〃▽〃)',
    'Empatamos～ ¡otra ronda! (•̀ᴗ•́)و'
  ],

  // ── Ping ──────────────────────────────────────────────────────
  pingOk: [
    '¡Pong! Respondí en {ms} ms (≧▽≦)',
    '¡Aquí estoy! {ms} ms de velocidad ✨'
  ],

  // ── Grupo ─────────────────────────────────────────────────────
  interruptorUso: [
    'Úsalo así: {uso} (•ᴗ•)'
  ],
  interruptorOn: [
    '¡{nombre} activado! (≧▽≦)',
    '¡Listo, {nombre} está activado! ✨'
  ],
  interruptorOff: [
    '{nombre} desactivado～ (•ᴗ•)',
    'Entendido, {nombre} quedó desactivado ✨'
  ],
  bienvenida: [
    '¡Bienvenido, {usuario}! Qué alegría que llegaras (≧▽≦)',
    '¡Hola, {usuario}! Ponte cómodo, ya eres parte de la familia ✨',
    '¡Kyaa, llegó {usuario}! ¡Bienvenido! (๑>◡<๑)'
  ],
  antienlaces: [
    'Uuu～ aquí no se permiten enlaces de otros grupos (>﹏<)',
    'Ups, borré ese enlace: en este grupo no se comparten otros grupos (｡•́︿•̀｡)'
  ],

  // ── Sub-bots ──────────────────────────────────────────────────
  serbotGenerando: [
    'Un momentito, estoy generando tu código de vinculación… ✨',
    'Preparando tu código～ no te vayas (•̀ᴗ•́)و'
  ],
  serbotCodigo: [
    '¡Aquí está tu código! Escríbelo en WhatsApp para vincularte (≧▽≦)'
  ],
  subbotsVacio: [
    'Todavía no hay sub-bots activos (•ᴗ•)'
  ],

  // ── Dueño ─────────────────────────────────────────────────────
  reiniciando: [
    'Voy a reiniciarme, ¡vuelvo enseguida! (๑•̀ㅂ•́)و',
    'Reiniciando～ guardo todo y regreso ✨'
  ],
  dueno: [
    'Este es el contacto de mi creador (•ᴗ•)'
  ],
  temaCambiado: [
    '¡Listo! Ahora uso el estilo {tema} (≧▽≦)',
    'Estilo {tema} activado✨'
  ],
  temaInvalido: [
    'Ese estilo no existe. Opciones: {opciones} (｡•́︿•̀｡)'
  ],

  // ── Rankings ──────────────────────────────────────────────────
  topVacio: [
    'Aún no hay jugadores～ ¡sé el primero! (•̀ᴗ•́)و'
  ],

  // ── Yui en la web ─────────────────────────────────────────────
  webCodigo: [
    '¡Aquí tienes tu llave para hablar conmigo en la web! (๑>◡<๑)',
    'Te espero en la página～ usa este código para entrar ✨'
  ],
  webSinNumero: [
    'WhatsApp me esconde tu número real y así no puedo darte el código (；ω；) Prueba desde otro chat o dile al dueño que revise Yui-Bails.'
  ],
  webNoDisponible: [
    'Uy～ ahora no puedo hablar con la web, inténtalo en unos minutos (；ω；)',
    'No logro conectar con la página todavía… ¿lo intentas otra vez? (>﹏<)'
  ]
}
