import { useEffect, useState, type CSSProperties } from 'react'
import { actualizar, type ConId } from '../db'
import { useDatos } from '../datos'
import { TODAS } from '../domain/etapas'
import { fcorta } from '../domain/fechas'
import type { Foto, Lote, Paquete, Receta } from '../domain/tipos'
import { gramos } from '../domain/tostadas'
import { borrarFoto, useFotoLocal } from '../fotos'
import { ir } from '../ruta'
import { toast } from '../ui'

type F = ConId<Foto>

/** Muestra una foto, ya sea desde la nube o desde el celular si aún no sube. */
export function FotoImg({ f, alt = '', className, style }: { f: F; alt?: string; className?: string; style?: CSSProperties }) {
  const local = useFotoLocal(f.id, f.estado === 'pendiente' || !f.url)
  const src = f.url || local
  if (!src) return <div className={'ph ' + (className || '')} style={style} />
  return <img src={src} alt={alt} loading="lazy" className={className} style={style} />
}

export const esCultivo = (f: Foto) => !f.recetaId
export const esTostada = (f: Foto) => !!f.recetaId
const recientes = (x: F[]) => [...x].sort((a, b) => (b.favorita ? 1 : 0) - (a.favorita ? 1 : 0) || (b.creado || 0) - (a.creado || 0))

/** Portada de una receta: la escogida, si no su favorita más reciente, si no su última foto. */
export function portadaReceta(r: ConId<Receta>, fotos: F[]) {
  return (r.portadaId && fotos.find(f => f.id === r.portadaId)) || recientes(fotos.filter(f => f.recetaId === r.id))[0]
}
/** Portada de una presentación: la escogida, si no la mejor foto de esa presentación, si no la de la receta. */
export function portadaPaquete(p: ConId<Paquete>, r: ConId<Receta> | undefined, fotos: F[]) {
  return (p.portadaId && fotos.find(f => f.id === p.portadaId)) || recientes(fotos.filter(f => f.paqueteId === p.id))[0] || (r ? portadaReceta(r, fotos) : undefined)
}

/** Foto de fondo de Inicio: la última que se escogió. */
export const fotoFondo = (fotos: F[]) => fotos.filter(f => (f.fondo || 0) > 0).sort((a, b) => (b.fondo || 0) - (a.fondo || 0))[0]

/** Portada de un lote: la escogida o, si no hay, su favorita más reciente. */
export function portadaLote(l: ConId<Lote>, fotos: F[]) {
  const p = l.portadaId && fotos.find(f => f.id === l.portadaId)
  if (p) return p
  return fotos.filter(f => f.loteId === l.id && f.favorita).sort((a, b) => (b.creado || 0) - (a.creado || 0))[0]
}

const nEtapa = (k: string) => TODAS.find(e => e.k === k)?.n || ''

/** Visor a pantalla completa: se pasa de una foto a otra deslizando. */
export function Visor({ lista, inicio, onCerrar }: { lista: F[]; inicio: number; onCerrar: () => void }) {
  const { lotes, fotos, recetas, paquetes } = useDatos()
  const [i, setI] = useState(inicio)
  const [x0, setX0] = useState<number | null>(null)
  const [seguro, setSeguro] = useState(false)
  // Se guarda la lista al abrir, para que quitar una estrella no saque la foto del visor.
  const [ids] = useState(() => lista.map(f => f.id))
  const vivas = ids.map(id => fotos.find(g => g.id === id)).filter(Boolean) as F[]
  useEffect(() => { if (!vivas.length) onCerrar() }, [vivas.length, onCerrar])
  if (!vivas.length) return null
  const k = Math.min(i, vivas.length - 1), f = vivas[k]
  const l = lotes.find(x => x.id === f.loteId)
  const esFondo = fotoFondo(fotos)?.id === f.id
  const esPortada = l?.portadaId === f.id
  const rec = recetas.find(x => x.id === f.recetaId), paq = paquetes.find(x => x.id === f.paqueteId)
  const paqsRec = rec ? paquetes.filter(p => p.recetaId === rec.id).sort((a, b) => b.gramos - a.gramos) : []
  const titulo = rec ? `${rec.nombre}${paq ? ' · ' + gramos(paq.gramos) : ''}` : `${l?.nombre || ''} · ${nEtapa(f.etapa)}`
  const mover = (d: number) => { setSeguro(false); setI(Math.max(0, Math.min(vivas.length - 1, k + d))) }

  return (
    <div className="viewer" role="dialog" aria-modal="true" aria-label="Foto"
      onClick={e => { if (e.target === e.currentTarget) onCerrar() }}
      onTouchStart={e => setX0(e.touches[0].clientX)}
      onTouchEnd={e => { if (x0 === null) return; const dx = e.changedTouches[0].clientX - x0; if (Math.abs(dx) > 50) mover(dx < 0 ? 1 : -1); setX0(null) }}>
      <div className="visor">
        <div className="vtop"><span>{titulo} · {fcorta(f.fecha)}</span><span>{k + 1} / {vivas.length}</span></div>
        <div className="vimg">
          <FotoImg f={f} alt={titulo} />
          {k > 0 && <button className="vnav prev" aria-label="Foto anterior" onClick={() => mover(-1)}>‹</button>}
          {k < vivas.length - 1 && <button className="vnav next" aria-label="Foto siguiente" onClick={() => mover(1)}>›</button>}
        </div>
        <div className="vbtns">
          <button className={f.favorita ? 'on' : ''} aria-pressed={!!f.favorita} onClick={() => { actualizar('fotos', f.id, { favorita: !f.favorita }); toast(f.favorita ? 'Quitada de favoritas' : 'Agregada a la galería') }}>{f.favorita ? '★ Favorita' : '☆ Favorita'}</button>
          {rec && <>
            <button className={rec.portadaId === f.id ? 'on' : ''} aria-pressed={rec.portadaId === f.id} onClick={() => {
              const si = rec.portadaId === f.id; actualizar('recetas', rec.id, { portadaId: si ? null : f.id }); toast(si ? 'Portada quitada' : `Portada de ${rec.nombre}`)
            }}>{rec.portadaId === f.id ? '✓ Portada de la receta' : 'Portada de la receta'}</button>
            {paq && <button className={paq.portadaId === f.id ? 'on' : ''} aria-pressed={paq.portadaId === f.id} onClick={() => {
              const si = paq.portadaId === f.id; actualizar('paquetes', paq.id, { portadaId: si ? null : f.id }); toast(si ? 'Portada quitada' : `Portada de ${gramos(paq.gramos)}`)
            }}>{paq.portadaId === f.id ? `✓ Portada de ${gramos(paq.gramos)}` : `Portada de ${gramos(paq.gramos)}`}</button>}
          </>}
          {!rec && <button className={esFondo ? 'on' : ''} aria-pressed={esFondo} onClick={() => {
            if (esFondo) { fotos.filter(g => g.fondo).forEach(g => actualizar('fotos', g.id, { fondo: 0 })); toast('Inicio queda sin foto de fondo') }
            else { actualizar('fotos', f.id, { fondo: Date.now() }); toast('Ahora es el fondo de Inicio') }
          }}>{esFondo ? '✓ Fondo de Inicio' : 'Fondo de Inicio'}</button>}
          {l && <button className={esPortada ? 'on' : ''} aria-pressed={esPortada} onClick={() => {
            actualizar('lotes', l.id, { portadaId: esPortada ? null : f.id }); toast(esPortada ? 'Portada quitada' : `Portada de ${l.nombre}`)
          }}>{esPortada ? '✓ Portada del lote' : 'Portada del lote'}</button>}
        </div>
        {rec && <label className="vsel">Esta foto es de
          <select value={f.paqueteId || ''} onChange={e => { actualizar('fotos', f.id, { paqueteId: e.target.value || null }); toast('Guardado') }}>
            <option value="">{rec.nombre} (en general)</option>{paqsRec.map(p => <option key={p.id} value={p.id}>Presentación de {gramos(p.gramos)}</option>)}</select></label>}
        <div className="vbtns">
          <button onClick={onCerrar}>Cerrar</button>
          <button className="neg" onClick={() => {
            if (!seguro) { setSeguro(true); return }
            if (esPortada && l) actualizar('lotes', l.id, { portadaId: null })
            if (rec?.portadaId === f.id) actualizar('recetas', rec.id, { portadaId: null })
            if (paq?.portadaId === f.id) actualizar('paquetes', paq.id, { portadaId: null })
            borrarFoto(f.id, f.path, f.estado === 'subida'); setSeguro(false); toast('Foto borrada')
          }}>{seguro ? '¿Seguro? Toca para borrar' : 'Borrar'}</button>
        </div>
      </div>
    </div>
  )
}

/** Para escoger fotos: favoritas primero. Con max=1 se escoge una sola. */
export function FotoPicker({ titulo, sel, max, filtro = () => true, onGuardar, onCerrar }: { titulo: string; sel: string[]; max: number; filtro?: (f: F) => boolean; onGuardar: (ids: string[]) => void; onCerrar: () => void }) {
  const { fotos: todas, lotes } = useDatos()
  const fotos = todas.filter(filtro)
  const [ids, setIds] = useState(sel.filter(id => fotos.some(f => f.id === id)))
  const orden = [...fotos].sort((x, y) => (+!!y.favorita - +!!x.favorita) || (y.creado || 0) - (x.creado || 0))
  const tocar = (id: string) => {
    if (max === 1) { setIds(ids[0] === id ? [] : [id]); return }
    if (ids.includes(id)) setIds(ids.filter(x => x !== id))
    else if (ids.length < max) setIds([...ids, id])
    else toast(`Máximo ${max} fotos`)
  }
  return (
    <div className="sheet" onClick={e => { if (e.target === e.currentTarget) onCerrar() }}>
      <div role="dialog" aria-modal="true" aria-label={titulo} className="stack">
        <h2 style={{ margin: 0 }}>{titulo}</h2>
        <small className="muted">{max === 1 ? 'Toca la foto que quieres mandar.' : `Toca hasta ${max} fotos. Se mandan en el orden en que las escojas.`} Las ★ son tus favoritas.</small>
        {orden.length ? <div className="photos" style={{ marginTop: 0 }}>{orden.map(f => {
          const k = ids.indexOf(f.id), l = lotes.find(x => x.id === f.loteId)
          return <button key={f.id} className={'thumb pick' + (k >= 0 ? ' on' : '')} aria-pressed={k >= 0} aria-label={`Foto de ${l?.nombre || ''} del ${f.fecha}`} onClick={() => tocar(f.id)}>
            <FotoImg f={f} />{f.favorita && <span className="star">★</span>}{k >= 0 && <span className="num">{max === 1 ? '✓' : k + 1}</span>}</button>
        })}</div> : <div className="empty">Todavía no hay fotos. Tómalas desde cada etapa del lote, en Siembras.</div>}
        <div className="two"><button className="btn ghost" onClick={onCerrar}>Cancelar</button><button className="btn" onClick={() => { onGuardar(ids); onCerrar() }}>Listo</button></div>
      </div>
    </div>
  )
}

/** Fila de miniaturas de las fotos escogidas. */
export function Escogidas({ lista }: { lista: F[] }) {
  return <div className="escogidas">{lista.map(f => <FotoImg key={f.id} f={f} />)}</div>
}

/** Cuadrícula de fotos con estrella en las favoritas. */
export function Cuadricula({ lista, onVer }: { lista: F[]; onVer: (i: number) => void }) {
  return <>{lista.map((f, i) => (
    <button key={f.id} className={'thumb' + (f.estado === 'pendiente' ? ' pend' : '')} onClick={() => onVer(i)} aria-label={`Ver foto del ${fcorta(f.fecha)}`}>
      <FotoImg f={f} />{f.favorita && <span className="star" aria-label="Favorita">★</span>}
    </button>))}</>
}

export default function Galeria() {
  const { fotos, lotes, temporadas, listo } = useDatos()
  const [solo, setSolo] = useState(true)
  const [tem, setTem] = useState('')
  const [lote, setLote] = useState('')
  const [etapa, setEtapa] = useState('')
  const [ver, setVer] = useState<number | null>(null)
  const lotesDe = lotes.filter(l => !tem || l.temporadaId === tem).sort((a, b) => a.nombre.localeCompare(b.nombre))
  const ids = new Set(lotesDe.map(l => l.id))
  const lista = fotos
    .filter(f => (!solo || f.favorita) && ids.has(f.loteId) && (!lote || f.loteId === lote) && (!etapa || f.etapa === etapa))
    .sort((a, b) => a.fecha === b.fecha ? (b.creado || 0) - (a.creado || 0) : a.fecha < b.fecha ? 1 : -1)
  const temps = [...temporadas].sort((a, b) => a.inicio < b.inicio ? 1 : -1)

  return (
    <div className="stack-lg">
      <div>
        <button className="back" onClick={() => ir('cultivo/inicio')}>← Inicio</button>
        <h1>Galería</h1>
        <p className="muted" style={{ margin: '4px 0 0', fontSize: '.9rem' }}>Toca una foto y márcala con ☆ para guardarla entre las mejores. Desde ahí también la pones de fondo en Inicio o de portada de su lote.</p>
      </div>
      <div className="stack">
        <div className="seg" role="group" aria-label="Qué fotos ver">
          <button className={solo ? 'on' : ''} aria-pressed={solo} onClick={() => setSolo(true)}>★ Mejores fotos</button>
          <button className={!solo ? 'on' : ''} aria-pressed={!solo} onClick={() => setSolo(false)}>Todas</button>
        </div>
        <div className="two">
          <label>Temporada<select value={tem} onChange={e => { setTem(e.target.value); setLote('') }}>
            <option value="">Todas</option>{temps.map(t => <option key={t.id} value={t.id}>{t.nombre} {t.anio}</option>)}</select></label>
          <label>Lote<select value={lote} onChange={e => setLote(e.target.value)}>
            <option value="">Todos</option>{lotesDe.map(l => <option key={l.id} value={l.id}>{l.nombre}</option>)}</select></label>
        </div>
        <label>Etapa<select value={etapa} onChange={e => setEtapa(e.target.value)}>
          <option value="">Todas</option>{TODAS.map(e => <option key={e.k} value={e.k}>{e.n}</option>)}</select></label>
      </div>
      {!listo ? <div className="empty">Cargando…</div> : lista.length ? <>
        <div className="muted" style={{ fontSize: '.88rem' }}>{lista.length} {lista.length === 1 ? 'foto' : 'fotos'}</div>
        <div className="photos" style={{ marginTop: -12 }}><Cuadricula lista={lista} onVer={setVer} /></div>
      </> : <div className="empty">{solo
        ? (fotos.length ? <>Aún no hay fotos marcadas con ☆ aquí. <button className="link" onClick={() => setSolo(false)}>Ver todas las fotos</button> y escoge las mejores.</> : 'Todavía no hay fotos. Tómalas desde cada etapa del lote, en Siembras.')
        : 'No hay fotos con estos filtros.'}</div>}
      {ver !== null && <Visor lista={lista} inicio={ver} onCerrar={() => setVer(null)} />}
    </div>
  )
}
