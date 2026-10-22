import { plata } from '../../domain/fechas'
import { tTotales } from '../../domain/tostadas'
import { Kpis } from '../comun'
import { TMovimientos, useTDatos, useTPeriodo } from './comun'

export default function TCuentas() {
  const d = useTDatos(), p = useTPeriodo(d)
  const t = tTotales(d, p.enP)
  return (
    <div className="stack-lg"><h1>Cuentas</h1>{p.html}<Kpis t={t} />
      <div className="muted" style={{ fontSize: '.85rem' }}>Gastos = costo de los paquetes vendidos ({plata(t.cogs)}) + otros gastos ({plata(t.otros)}). En el periodo se invirtieron {plata(t.prod)} en producción.</div>
      <section className="stack"><h2>Movimientos</h2><p className="muted" style={{ margin: 0, fontSize: '.85rem' }}>Toca un registro para borrarlo.</p><TMovimientos filtro={x => p.enP(x.fecha)} /></section>
    </div>
  )
}
