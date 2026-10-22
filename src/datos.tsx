import { createContext, useContext, type ReactNode } from 'react'
import { useCol, type ConId } from './db'
import type { Cosecha, Foto, Labor, Lote, Mov, Nota, Producto, Temporada } from './domain/tipos'

type Datos = { temporadas: ConId<Temporada>[]; lotes: ConId<Lote>[]; notas: ConId<Nota>[]; fotos: ConId<Foto>[]; movs: ConId<Mov>[]; cosechas: ConId<Cosecha>[]; labores: ConId<Labor>[]; productos: ConId<Producto>[]; listo: boolean }
const Ctx = createContext<Datos>({ temporadas: [], lotes: [], notas: [], fotos: [], movs: [], cosechas: [], labores: [], productos: [], listo: false })

export function DatosProvider({ children }: { children: ReactNode }) {
  const temporadas = useCol<Temporada>('temporadas')
  const lotes = useCol<Lote>('lotes')
  const notas = useCol<Nota>('notas')
  const fotos = useCol<Foto>('fotos')
  const movs = useCol<Mov>('movs')
  const cosechas = useCol<Cosecha>('cosechas')
  const labores = useCol<Labor>('labores')
  const productos = useCol<Producto>('productos')
  const v: Datos = { temporadas: temporadas || [], lotes: lotes || [], notas: notas || [], fotos: fotos || [], movs: movs || [], cosechas: cosechas || [], labores: labores || [], productos: productos || [], listo: !!(temporadas && lotes) }
  return <Ctx.Provider value={v}>{children}</Ctx.Provider>
}
export const useDatos = () => useContext(Ctx)
