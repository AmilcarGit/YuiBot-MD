// Código Oficial de YuiBot-MD.by AmilcarGit
import ajustes from '../ajustes.js'
import { api, activa } from './api.js'
import { exportar, fusionar, guardar } from './memoria.js'

let espera = ajustes.sincroMs

async function ciclo() {
  try {
    const respuesta = await api.sync(exportar())
    if (respuesta?.usuarios) {
      fusionar(respuesta.usuarios)
      guardar()
    }
    espera = ajustes.sincroMs
  } catch (error) {
    espera = Math.min(espera * 2, 600000)
    console.error(`Sincronización fallida: ${error.message}`)
  }
}

function programar() {
  setTimeout(async () => {
    await ciclo()
    programar()
  }, espera).unref()
}

export function iniciarSincro() {
  if (!activa()) return
  programar()
}
