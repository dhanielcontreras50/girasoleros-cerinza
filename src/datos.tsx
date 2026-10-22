import { createContext, useContext, type ReactNode } from 'react'
import { useCol, type ConId } from './db'
import type { Foto, Lote, Nota, Temporada } from './domain/tipos'

type Datos = { temporadas: ConId<Temporada>[]; lotes: ConId<Lote>[]; notas: ConId<Nota>[]; fotos: ConId<Foto>[]; listo: boolean }
const Ctx = createContext<Datos>({ temporadas: [], lotes: [], notas: [], fotos: [], listo: false })

export function DatosProvider({ children }: { children: ReactNode }) {
  const temporadas = useCol<Temporada>('temporadas')
  const lotes = useCol<Lote>('lotes')
  const notas = useCol<Nota>('notas')
  const fotos = useCol<Foto>('fotos')
  const v: Datos = { temporadas: temporadas || [], lotes: lotes || [], notas: notas || [], fotos: fotos || [], listo: !!(temporadas && lotes) }
  return <Ctx.Provider value={v}>{children}</Ctx.Provider>
}
export const useDatos = () => useContext(Ctx)
