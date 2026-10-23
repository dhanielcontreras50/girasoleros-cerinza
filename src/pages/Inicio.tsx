import { useDatos } from '../datos'
import { diaDe, ETAPAS, etapaActual, inicios, promInicio, TERMINADO, TODAS } from '../domain/etapas'
import { dias, fcorta, flarga, hoy } from '../domain/fechas'
import type { Lote } from '../domain/tipos'
import type { ConId } from '../db'
import { ir } from '../ruta'
import { Flor } from '../ui'
import { totales } from '../domain/cuentas'
import { Kpis, Movimientos } from './comun'
import type { Foto } from '../domain/tipos'
import { Cuadricula, FotoImg, fotoFondo, portadaLote, Visor } from './Galeria'
import { useState } from 'react'

export function Diferencia({ v, prom: r, palabra = "" }: { v: number | null; prom: number | null; palabra?: string }) {
  if (v === null || r === null) return null
  const d = Math.round(v - r)
  if (d === 0) return <span className="diff eq">igual al promedio</span>
  return <span className={'diff ' + (d > 0 ? 'late' : 'early')}>{d > 0 ? '+' : '−'}{Math.abs(d)} d {palabra}</span>
}

export function LoteCard({ l, lotes, temporada, fotos = [] }: { l: ConId<Lote>; lotes: ConId<Lote>[]; temporada?: string; fotos?: ConId<Foto>[] }) {
  const portada = portadaLote(l, fotos)
  const st = inicios(l), d = diaDe(l), i = etapaActual(l)
  const pctv = Math.max(0, Math.min(100, d / Math.max(st[TERMINADO].day, 1) * 100))
  const et = i < 0 ? 'Por sembrar' : i >= TERMINADO ? 'Ciclo terminado' : ETAPAS[i].n
  const sig = i >= 0 && i < TERMINADO ? TODAS[i + 1] : null
  return (
    <button className={'card lotecard' + (portada ? ' concover' : '')} onClick={() => ir('cultivo/lote/' + l.id)}>
      {portada && <FotoImg f={portada} className="cover" />}
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
  const { lotes, temporadas, movs, fotos, listo } = useDatos()
  const [ver, setVer] = useState<number | null>(null)
  const fondo = fotoFondo(fotos)
  const mejores = fotos.filter(f => f.favorita).sort((a, b) => a.fecha === b.fecha ? (b.creado || 0) - (a.creado || 0) : a.fecha < b.fecha ? 1 : -1).slice(0, 6)
  const tn = (id: string) => { const t = temporadas.find(x => x.id === id); return t ? `${t.nombre} ${t.anio}` : '' }
  const tem = [...temporadas].sort((a, b) => a.inicio < b.inicio ? 1 : -1)[0]
  const tt = totales(movs.filter(m => m.temporadaId === tem?.id))
  const activos = lotes.filter(l => etapaActual(l) < TERMINADO).sort((a, b) => a.fechaSiembra < b.fechaSiembra ? -1 : 1)
  return (
    <div className="stack-lg">
      {fondo ? <div className="hero"><FotoImg f={fondo} alt="" /><div className="brand"><Flor /><div><div className="eyebrow">{flarga(hoy())}</div><h1>Girasoleros Cerinza</h1></div></div></div>
        : <div className="brand"><Flor /><div><div className="eyebrow">{flarga(hoy())}</div><h1>Girasoleros Cerinza</h1></div></div>}
      <section className="stack"><h2>Lotes en curso</h2>
        {!listo ? <div className="empty">Cargando…</div> : activos.length ? activos.map(l => <LoteCard key={l.id} l={l} lotes={lotes} fotos={fotos} temporada={tn(l.temporadaId)} />)
          : <div className="empty">Aún no hay lotes sembrados. Ve a <b>Siembras</b>, crea la temporada y agrega el lote con su fecha de siembra.
            <div style={{ marginTop: 10 }}><button className="btn small" onClick={() => ir('cultivo/siembras')}>Ir a Siembras</button></div></div>}
      </section>
      {fotos.length > 0 && <section className="stack"><div className="row between"><h2>Mejores fotos</h2><button className="link" onClick={() => ir('cultivo/galeria')}>Ver galería</button></div>
        {mejores.length ? <div className="photos" style={{ marginTop: 0 }}><Cuadricula lista={mejores} onVer={setVer} /></div>
          : <div className="empty">Abre una foto y márcala con ☆ para que aparezca aquí. <button className="link" onClick={() => ir('cultivo/galeria')}>Ir a la galería</button></div>}
      </section>}
      {ver !== null && <Visor lista={mejores} inicio={ver} onCerrar={() => setVer(null)} />}
      {tem && <section className="stack"><div className="row between"><h2>{tem.nombre} {tem.anio}</h2><span className="muted">{tt.personas} turistas</span></div><Kpis t={tt} /></section>}
      <section className="stack"><div className="row between"><h2>Últimos registros</h2><button className="link" onClick={() => ir('cultivo/cuentas')}>Ver todo</button></div>
        <Movimientos movs={[...movs].sort((a, b) => a.fecha < b.fecha ? 1 : -1).slice(0, 5)} vacio="Aún no hay registros. Usa el botón + de abajo." /></section>
    </div>
  )
}
