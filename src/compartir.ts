import type { ConId } from './db'
import type { Foto } from './domain/tipos'
import { blobLocal } from './fotos'

export async function copiar(texto: string) {
  try { await navigator.clipboard.writeText(texto); return true } catch {
    // Respaldo para celulares que no dejan usar el portapapeles moderno
    const t = document.createElement('textarea'); t.value = texto; t.style.position = 'fixed'; t.style.opacity = '0'
    document.body.appendChild(t); t.select()
    const ok = document.execCommand('copy'); t.remove(); return ok
  }
}

async function archivo(f: ConId<Foto>, i: number) {
  let b = await blobLocal(f.id)
  if (!b && f.url) { const r = await fetch(f.url); if (r.ok) b = await r.blob() }
  return b ? new File([b], `girasoles-${i + 1}.jpg`, { type: 'image/jpeg' }) : null
}

/**
 * Abre el menú de compartir del celular (WhatsApp, etc.) con el texto y las fotos.
 * El texto también queda copiado, por si la app que se escoge no lo pega sola.
 * Devuelve 'fotos', 'texto' (se compartió sin fotos), 'copiado' (no hay menú de compartir) o 'cancelado'.
 */
export async function compartir(texto: string, fotos: ConId<Foto>[]): Promise<'fotos' | 'texto' | 'copiado' | 'cancelado'> {
  await copiar(texto)
  if (!navigator.share) return 'copiado'
  let files: File[] = []
  try { files = (await Promise.all(fotos.slice(0, 6).map(archivo))).filter((x): x is File => !!x) } catch { files = [] }
  try {
    if (files.length && navigator.canShare?.({ files })) { await navigator.share({ text: texto, files }); return 'fotos' }
    await navigator.share({ text: texto }); return 'texto'
  } catch (e) {
    return (e as Error)?.name === 'AbortError' ? 'cancelado' : 'copiado'
  }
}

export const whatsapp = (tel: string, texto: string) => `https://wa.me/${tel}?text=${encodeURIComponent(texto)}`
