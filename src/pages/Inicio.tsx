import { useDatos } from '../datos'
import { diaDe, ETAPAS, etapaActual, inicios, promInicio, TERMINADO, TODAS } from '../domain/etapas'
import { dias, fcorta, flarga, hoy } from '../domain/fechas'
import type { Lote } from '../domain/tipos'
import type { ConId } from '../db'
import { ir } from '../ruta'
import { Flor } from '../ui'

export function Diferencia({ v, prom: r, palabra = "" }: { v: number | null; prom: number | null; palabra?: string }) {
  if (v === null || r === null) return null
  const d = Math.round(v - r)
  if (d === 0) return <span className="diff eq">igual al promedio</span>
  return <span className={'diff ' + (d > 0 ? 'late' : 'early')}>{d > 0 ? '+' : '−'}{Math.abs(d)} d {palabra}</span>
}

export function LoteCard({ l, lotes, temporada }: { l: ConId<Lote>; lotes: ConId<Lote>[]; temporada?: string }) {
  const st = inicios(l), d = diaDe(l), i = etapaActual(l)
  const pctv = Math.max(0, Math.min(100, d / Math.max(st[TERMINADO].day, 1) * 100))
  const et = i < 0 ? 'Por sembrar' : i >= TERMINADO ? 'Ciclo terminado' : ETAPAS[i].n
  const sig = i >= 0 && i < TERMINADO ? TODAS[i + 1] : null
  return (
    <button className="card lotecard" onClick={() => ir('cultivo/lote/' + l.id)}>
      <div className="stack">
        <div className="row between"><div><div className="eyebrow">{temporada}</div><h3>{l.nombre} · {l.area.toLocaleString('es-CO')} m²</h3></div><span className={'chip ' + (i === 4 ? 'sun' : '')}>Día {Math.max(d, 0)}</span></div>
        <div>
          <div className="row between wrap"><b>{et}</b>{i > 0 && i < TERMINADO && st[i].real && <Diferencia v={st[i].day} prom={promInicio(lotes, i, l.id)} palabra="vs promedio" />}</div>
          <div className="bar" style={{ marginTop: 6 }}><i style={{ width: pctv + '%' }} /></div>
          <div className="ticks"><span>Siembra</span><span>Flor ~{fcorta(st[4].date)}</span><span>Cosecha</span></div>
        </div>
        {sig && <div className="muted" style={{ fontSize: '.9rem' }}>Sigue → {sig.n}: {fcorta(st[i + 1].date)} (en {Math.max(0, dias(hoy(), st[i + 1].date))} días, estimado)</div>}
      </div>
    </button>
  )
}

export default function Inicio() {
  const { lotes, temporadas, listo } = useDatos()
  const tn = (id: string) => { const t = temporadas.find(x => x.id === id); return t ? `${t.nombre} ${t.anio}` : '' }
  const activos = lotes.filter(l => etapaActual(l) < TERMINADO).sort((a, b) => a.fechaSiembra < b.fechaSiembra ? -1 : 1)
  return (
    <div className="stack-lg">
      <div className="brand"><Flor /><div><div className="eyebrow">{flarga(hoy())}</div><h1>Girasoleros Cerinza</h1></div></div>
      <section className="stack"><h2>Lotes en curso</h2>
        {!listo ? <div className="empty">Cargando…</div> : activos.length ? activos.map(l => <LoteCard key={l.id} l={l} lotes={lotes} temporada={tn(l.temporadaId)} />)
          : <div className="empty">Aún no hay lotes sembrados. Ve a <b>Siembras</b>, crea la temporada y agrega el lote con su fecha de siembra.
            <div style={{ marginTop: 10 }}><button className="btn small" onClick={() => ir('cultivo/siembras')}>Ir a Siembras</button></div></div>}
      </section>
    </div>
  )
}
