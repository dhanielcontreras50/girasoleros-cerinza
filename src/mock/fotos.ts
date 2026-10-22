// Solo para pruebas locales (MOCK=1)
import { crearConId, borrar } from './db'
export async function agregarFotos(_u: string, loteId: string, etapa: string, files: File[]) {
  for (const f of files) crearConId('fotos', 'f' + Math.random(), { loteId, etapa, fecha: '2026-10-22', estado: 'subida', url: URL.createObjectURL(f) })
  return files.length
}
export const subirPendientes = async () => {}
export const useFotoLocal = () => undefined
export const usePendientes = () => 2
export async function borrarFoto(id: string) { borrar('fotos', id) }
