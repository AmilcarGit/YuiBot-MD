// Código Oficial de YuiBot-MD.by AmilcarGit
import { buscarSpotify, esEnlaceSpotify, spotifyDl } from '../../nucleo/delirius.js'
import { crearMusica } from './_musica.js'
export default crearMusica({ nombre: 'spotify', alias: ['sp', 'spotifydl', 'spoti'], titulo: 'Spotify', emoji: '🟢', ejemplo: 'Bad Bunny DtMF', esEnlace: esEnlaceSpotify, buscar: buscarSpotify, bajar: spotifyDl })
