import { useEffect, useState } from 'react'
import { createStore, del, get, keys, set } from 'idb-keyval'
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage'
import { storage } from './firebase'
import { actualizar, crearConId } from './db'
import { iso, hoy } from './domain/fechas'
import { doc, collection } from 'firebase/firestore'
import { db } from './firebase'

// Las fotos se guardan primero en el celular (IndexedDB) y se suben a la nube cuando hay señal.
const cola = createStore('girasoleros-fotos', 'pendientes')
type Pendiente = { blob: Blob; uid: string; path: string }

const MAX = 1600 // lado mayor en píxeles: buena calidad sin llenar el celular
async function reducir(file: File): Promise<{ blob: Blob; w: number; h: number }> {
  const bmp = await createImageBitmap(file)
  const s = Math.min(1, MAX / Math.max(bmp.width, bmp.height))
  const w = Math.round(bmp.width * s), h = Math.round(bmp.height * s)
  const c = document.createElement('canvas'); c.width = w; c.height = h
  c.getContext('2d')!.drawImage(bmp, 0, 0, w, h)
  bmp.close()
  const blob = await new Promise<Blob>((res, rej) => c.toBlob(b => b ? res(b) : rej(new Error('No se pudo leer la foto')), 'image/jpeg', 0.82))
  return { blob, w, h }
}

let avisar: () => void = () => {}
export async function agregarFotos(uid: string, loteId: string, etapa: string, files: File[]) {
  let n = 0
  for (const f of files) {
    try {
      const { blob, w, h } = await reducir(f)
      const id = doc(collection(db, 'x')).id
      const path = `users/${uid}/fotos/${id}.jpg`
      await set(id, { blob, uid, path } satisfies Pendiente, cola)
      crearConId('fotos', id, { loteId, etapa, fecha: iso(hoy()), estado: 'pendiente', path, w, h })
      n++
    } catch (e) { console.error(e) }
  }
  avisar(); subirPendientes()
  return n
}

let subiendo = false
export async function subirPendientes() {
  if (subiendo || !navigator.onLine) return
  subiendo = true
  try {
    for (const k of await keys(cola)) {
      const p = await get<Pendiente>(k, cola)
      if (!p) continue
      try {
        const r = ref(storage, p.path)
        await uploadBytes(r, p.blob, { contentType: 'image/jpeg' })
        const url = await getDownloadURL(r)
        actualizar('fotos', String(k), { estado: 'subida', url })
        await del(k, cola)
        avisar()
      } catch (e) { console.warn('Foto sin subir todavía', e); break }
    }
  } finally { subiendo = false }
}
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => subirPendientes())
  setInterval(() => subirPendientes(), 60_000)
}

/** Vista previa local de una foto que aún no sube. */
export function useFotoLocal(id: string, activa: boolean) {
  const [url, setUrl] = useState<string>()
  useEffect(() => {
    if (!activa) return
    let u: string | undefined
    get<Pendiente>(id, cola).then(p => { if (p) { u = URL.createObjectURL(p.blob); setUrl(u) } })
    return () => { if (u) URL.revokeObjectURL(u) }
  }, [id, activa])
  return url
}

/** La foto guardada en el celular, si aún no sube. */
export async function blobLocal(id: string) { return (await get<Pendiente>(id, cola))?.blob }

export async function quitarDeCola(id: string) { await del(id, cola); avisar() }

/** Cuántas fotos faltan por subir. */
export function usePendientes() {
  const [n, setN] = useState(0)
  useEffect(() => {
    const leer = () => keys(cola).then(k => setN(k.length))
    avisar = leer; leer()
    const t = setInterval(leer, 5000)
    return () => clearInterval(t)
  }, [])
  return n
}

export async function borrarFoto(id: string, path?: string, subida?: boolean) {
  const { borrar } = await import('./db')
  borrar('fotos', id)
  await quitarDeCola(id)
  if (subida && path) {
    const { deleteObject } = await import('firebase/storage')
    deleteObject(ref(storage, path)).catch(console.warn)
  }
}
