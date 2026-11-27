// Código Oficial de YuiBot-MD.by AmilcarGit
import { buscarSoundcloud, esEnlaceSoundcloud, soundcloudDl } from '../../nucleo/delirius.js'
import { crearMusica } from './_musica.js'
export default crearMusica({ nombre: 'soundcloud', alias: ['sc', 'scdl'], titulo: 'SoundCloud', emoji: '🟠', ejemplo: 'lofi chill', esEnlace: esEnlaceSoundcloud, buscar: buscarSoundcloud, bajar: soundcloudDl, respaldo: 'Algunas canciones de SoundCloud no se pueden bajar; prueba con {p}spotify o {p}play.' })
