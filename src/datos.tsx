import { createContext, useContext, type ReactNode } from 'react'
import { useCol, type ConId } from './db'
import type { AjustesAgenda, DiaEspecial, Reserva, Cosecha, Foto, Labor, Lote, Mov, Nota, Paquete, Producto, Receta, Tanda, Temporada, TGasto, TVenta } from './domain/tipos'

type Datos = { temporadas: ConId<Temporada>[]; lotes: ConId<Lote>[]; notas: ConId<Nota>[]; fotos: ConId<Foto>[]; movs: ConId<Mov>[]; cosechas: ConId<Cosecha>[]; labores: ConId<Labor>[]; productos: ConId<Producto>[]; recetas: ConId<Receta>[]; paquetes: ConId<Paquete>[]; tandas: ConId<Tanda>[]; tventas: ConId<TVenta>[]; tgastos: ConId<TGasto>[]; reservas: ConId<Reserva>[]; especiales: ConId<DiaEspecial>[]; ajustes: ConId<AjustesAgenda>[]; listo: boolean }
const Ctx = createContext<Datos>({ temporadas: [], lotes: [], notas: [], fotos: [], movs: [], cosechas: [], labores: [], productos: [], recetas: [], paquetes: [], tandas: [], tventas: [], tgastos: [], reservas: [], especiales: [], ajustes: [], listo: false })

export function DatosProvider({ children }: { children: ReactNode }) {
  const temporadas = useCol<Temporada>('temporadas')
  const lotes = useCol<Lote>('lotes')
  const notas = useCol<Nota>('notas')
  const fotos = useCol<Foto>('fotos')
  const movs = useCol<Mov>('movs')
  const cosechas = useCol<Cosecha>('cosechas')
  const labores = useCol<Labor>('labores')
  const productos = useCol<Producto>('productos')
  const recetas = useCol<Receta>('recetas')
  const paquetes = useCol<Paquete>('paquetes')
  const tandas = useCol<Tanda>('tandas')
  const tventas = useCol<TVenta>('tventas')
  const tgastos = useCol<TGasto>('tgastos')
  const reservas = useCol<Reserva>('reservas')
  const especiales = useCol<DiaEspecial>('dias')
  const ajustes = useCol<AjustesAgenda>('ajustes')
  const v: Datos = { temporadas: temporadas || [], lotes: lotes || [], notas: notas || [], fotos: fotos || [], movs: movs || [], cosechas: cosechas || [], labores: labores || [], productos: productos || [], recetas: recetas || [], paquetes: paquetes || [], tandas: tandas || [], tventas: tventas || [], tgastos: tgastos || [], reservas: reservas || [], especiales: especiales || [], ajustes: ajustes || [], listo: !!(temporadas && lotes) }
  return <Ctx.Provider value={v}>{children}</Ctx.Provider>
}
export const useDatos = () => useContext(Ctx)
