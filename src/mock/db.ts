// Solo para pruebas locales (MOCK=1): base de datos en memoria.
import { useEffect, useState } from 'react'
export type ConId<T> = T & { id: string; creado?: number }
const data: Record<string, Record<string, Record<string, unknown>>> = {}
const subs = new Set<() => void>()
const emit = () => subs.forEach(f => f())
let n = 0
export const setUid = () => {}
export function useCol<T>(name: string): ConId<T>[] | null {
  const leer = () => Object.entries(data[name] || {}).map(([id, v]) => ({ id, ...v }) as ConId<T>)
  const [rows, setRows] = useState(leer)
  useEffect(() => { const f = () => setRows(leer()); subs.add(f); return () => { subs.delete(f) } }, [name])
  return rows
}
export function crear(name: string, d: Record<string, unknown>) { const id = 'id' + (++n); crearConId(name, id, d); return id }
export function crearConId(name: string, id: string, d: Record<string, unknown>) { (data[name] ||= {})[id] = { ...d, creado: Date.now() + n++ }; emit() }
export function actualizar(name: string, id: string, d: Record<string, unknown>) {
  const cur = { ...(data[name]?.[id] || {}) } as Record<string, unknown>
  for (const [k, v] of Object.entries(d)) {
    if (k.includes('.')) { const [a, b] = k.split('.'); cur[a] = { ...(cur[a] as object || {}), [b]: v } } else cur[k] = v
  }
  data[name][id] = cur; emit()
}
export function borrar(name: string, id: string) { delete data[name]?.[id]; emit() }
