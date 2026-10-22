import { useState } from 'react'
import { crear } from '../../db'
import { hoy, iso, pct, plata } from '../../domain/fechas'
import type { CostosTanda } from '../../domain/tipos'
import { calcTanda, gramos, inventario, semillaReceta, TCATS, TGASTOS } from '../../domain/tostadas'
import { ir } from '../../ruta'
import { toast, valor } from '../../ui'
import { useTDatos } from './comun'

const TIPOS = [['produccion', 'Producción', 'Tostar una receta'], ['venta', 'Venta', 'Paquetes vendidos'], ['gasto', 'Otro gasto', 'Equipo, publicidad, permisos']] as const
type Tipo = typeof TIPOS[number][0]

function Produccion({ rec0, volver }: { rec0?: string; volver: () => void }) {
  const d = useTDatos()
  const recs = d.recetas.filter(r => r.activa)
  const [recId, setRecId] = useState(recs.find(r => r.id === rec0)?.id || recs[0]?.id)
  const r = d.recetas.find(x => x.id === recId)!
  const [sem, setSem] = useState(String(semillaReceta(r) || 1000))
  const [conteo, setConteo] = useState<Record<string, string>>({})
  const [manual, setManual] = useState<Partial<Record<keyof CostosTanda, string>>>({ indirectos: '0' })
  const ps = d.paquetes.filter(p => p.recetaId === r.id && p.activa).sort((a, b) => b.gramos - a.gramos)
  const cn = Object.fromEntries(Object.entries(conteo).map(([k, v]) => [k, +v || 0]))
  const over = Object.fromEntries(Object.entries(manual).map(([k, v]) => [k, +(v ?? 0) || 0])) as Partial<CostosTanda>
  const res = calcTanda(r, ps, +sem || 0, cn, over)
  const libre = res.salida - res.empacado
  const total = Object.values(res.costos).reduce((a, b) => a + b, 0)
  const cambiarReceta = (id: string) => { setRecId(id); const nr = d.recetas.find(x => x.id === id)!; setSem(String(semillaReceta(nr) || 1000)); setConteo({}); setManual({ indirectos: '0' }) }
  return (
    <form className="card" onSubmit={e => {
      e.preventDefault()
      if (!res.paquetes.length) return toast('Pon cuántos paquetes salieron')
      if (res.empacado > res.salida * 1.02) return toast('Los paquetes pesan más de lo que salió')
      crear('tandas', { fecha: valor(e.currentTarget, 'fecha'), recetaId: r.id, semilla: +sem, salida: Math.round(res.salida), empacado: res.empacado, costos: res.costos, paquetes: res.paquetes, nota: valor(e.currentTarget, 'nota') })
      toast('Producción guardada'); volver()
    }}>
      <label>Fecha<input name="fecha" type="date" defaultValue={iso(hoy())} required /></label>
      <label>Receta<select value={recId} onChange={e => cambiarReceta(e.target.value)}>{recs.map(x => <option key={x.id} value={x.id}>{x.nombre}</option>)}</select></label>
      <label>Semilla a tostar (g)<input type="number" inputMode="numeric" min="1" required value={sem} onChange={e => setSem(e.target.value)} /></label>
      <div className="note"><small>Usarás</small>{r.ingredientes.map(i => `${gramos(i.gramos * res.f)} de ${i.nombre.toLowerCase()}`).join(' · ')}<br /><b>Sale: {gramos(res.salida)} tostado</b></div>
      <h3 style={{ marginTop: 4 }}>Paquetes que salen</h3>
      {ps.length ? ps.map(p => <label key={p.id} className="row between" style={{ flexDirection: 'row', alignItems: 'center' }}>
        <span>Paquete de {gramos(p.gramos)} <span className="muted">(alcanza {Math.max(0, Math.floor((libre + (cn[p.id] || 0) * p.gramos) / p.gramos))})</span></span>
        <input type="number" inputMode="numeric" min="0" value={conteo[p.id] ?? ''} placeholder="0" onChange={e => setConteo({ ...conteo, [p.id]: e.target.value })} style={{ width: 96, flex: 'none' }} /></label>)
        : <div className="empty">Esta receta no tiene paquetes. Agrégalos en Recetas.</div>}
      <div className="total"><span>Empacado {gramos(res.empacado)} de {gramos(res.salida)}</span><span className={'num ' + (libre < 0 ? 'neg' : '')}>{libre < 0 ? 'faltan ' + gramos(-libre) : 'sobran ' + gramos(libre)}</span></div>
      <h3 style={{ marginTop: 4 }}>Costos</h3><div className="muted" style={{ fontSize: '.85rem' }}>Se llenan con la receta y los paquetes. Cámbialos por lo que de verdad gastaste.</div>
      {TCATS.map(([k, n]) => <label key={k}>{n}<input type="number" inputMode="numeric" min="0" value={manual[k] ?? String(res.def[k])} onChange={e => setManual({ ...manual, [k]: e.target.value })} /></label>)}
      <div className="total"><span>Total</span><span className="num">{plata(total)}</span></div>
      <div className="card list" style={{ padding: '4px 12px' }}>{res.paquetes.length ? res.paquetes.map(x => { const p = ps.find(y => y.id === x.refId)!; return <div className="li" key={x.refId}><div><b>Costo por paquete de {gramos(p.gramos)}</b><small>Precio {plata(p.precio)} · margen {pct(p.precio - x.costoU, p.precio)}</small></div><b className="num">{plata(x.costoU)}</b></div> })
        : <div className="li"><span className="muted">Pon cuántos paquetes salen para ver el costo de cada uno.</span></div>}</div>
      <label>Nota (opcional)<input name="nota" placeholder="Ej: semilla pelada de proveedor nuevo" /></label>
      <button className="btn full" type="submit">Guardar</button>
    </form>
  )
}

function Venta({ rec0, volver }: { rec0?: string; volver: () => void }) {
  const d = useTDatos()
  const recs = d.recetas.filter(r => r.activa)
  const activos = d.paquetes.filter(p => p.activa && recs.some(r => r.id === p.recetaId))
  const [pid, setPid] = useState(activos.find(p => p.recetaId === rec0)?.id || activos[0]?.id || '__nuevo')
  const p = d.paquetes.find(x => x.id === pid)
  const [u, setU] = useState(''), [precio, setPrecio] = useState(p ? String(p.precio) : '')
  return (
    <form className="card" onSubmit={e => {
      e.preventDefault(); const f = e.currentTarget
      let ref = pid
      if (pid === '__nuevo') ref = crear('paquetes', { recetaId: valor(f, 'nrec'), gramos: +valor(f, 'ng'), precio: +precio, empaque: +valor(f, 'ne') || 0, etiqueta: +valor(f, 'nt') || 0, activa: true })
      crear('tventas', { fecha: valor(f, 'fecha'), refId: ref, unidades: +u, precio: +precio, cliente: valor(f, 'cliente') })
      toast('Venta guardada'); volver()
    }}>
      <label>Fecha<input name="fecha" type="date" defaultValue={iso(hoy())} required /></label>
      <label>Paquete<select value={pid} onChange={e => { setPid(e.target.value); const np = d.paquetes.find(x => x.id === e.target.value); if (np) setPrecio(String(np.precio)) }}>
        {recs.map(r => <optgroup key={r.id} label={r.nombre}>{activos.filter(x => x.recetaId === r.id).sort((a, b) => b.gramos - a.gramos).map(x => <option key={x.id} value={x.id}>{r.nombre} · {gramos(x.gramos)}</option>)}</optgroup>)}
        <option value="__nuevo">+ Crear nueva referencia de paquete</option></select></label>
      {pid === '__nuevo' && <div className="stack" style={{ gap: 10 }}><div className="note">Nueva referencia: elige la receta y el tamaño.</div>
        <div className="two"><label>Receta<select name="nrec" defaultValue={rec0 || recs[0]?.id}>{recs.map(r => <option key={r.id} value={r.id}>{r.nombre}</option>)}</select></label><label>Tamaño (g)<input name="ng" type="number" inputMode="numeric" min="1" required placeholder="Ej: 50" /></label></div>
        <div className="two"><label>Costo empaque<input name="ne" type="number" inputMode="numeric" min="0" defaultValue={0} /></label><label>Costo etiqueta<input name="nt" type="number" inputMode="numeric" min="0" defaultValue={0} /></label></div></div>}
      <div className="two"><label>Unidades {p && <span className="muted">(hay {inventario(p.id, d.tandas, d.ventas)})</span>}<input type="number" inputMode="numeric" min="1" required value={u} onChange={e => setU(e.target.value)} /></label>
        <label>Precio unidad<input type="number" inputMode="numeric" min="0" required value={precio} onChange={e => setPrecio(e.target.value)} /></label></div>
      <div className="total"><span>Total</span><span className="num">{plata((+u || 0) * (+precio || 0))}</span></div>
      <label>Cliente (opcional)<input name="cliente" placeholder="Ej: Tienda en Duitama" /></label>
      <button className="btn full" type="submit">Guardar</button>
    </form>
  )
}

function Gasto({ volver }: { volver: () => void }) {
  return (
    <form className="card" onSubmit={e => {
      e.preventDefault(); const f = e.currentTarget
      crear('tgastos', { fecha: valor(f, 'fecha'), categoria: valor(f, 'cat'), detalle: valor(f, 'det'), valor: +valor(f, 'val') }); toast('Gasto guardado'); volver()
    }}>
      <label>Fecha<input name="fecha" type="date" defaultValue={iso(hoy())} required /></label>
      <label>Categoría<select name="cat">{TGASTOS.map(c => <option key={c}>{c}</option>)}</select></label>
      <label>Detalle<input name="det" placeholder="Ej: Registro sanitario" /></label>
      <label>Valor (pesos)<input name="val" type="number" inputMode="numeric" min="0" required /></label>
      <button className="btn full" type="submit">Guardar</button>
    </form>
  )
}

export default function TRegistrar({ tipo0, rec0 }: { tipo0?: string; rec0?: string }) {
  const d = useTDatos()
  const [tipo, setTipo] = useState<Tipo>((TIPOS.find(t => t[0] === tipo0)?.[0]) || 'produccion')
  const [n, setN] = useState(0)
  const volver = () => { if (rec0) ir('tostadas/receta/' + rec0); else setN(n + 1) }
  const sinRecetas = !d.recetas.some(r => r.activa)
  return (
    <div className="stack-lg"><h1>Registrar</h1>
      <div className="types">{TIPOS.map(([k, nm, s]) => <button key={k} className={'type ' + (tipo === k ? 'on' : '')} aria-pressed={tipo === k} onClick={() => setTipo(k)}><b>{nm}</b><small>{s}</small></button>)}</div>
      {tipo !== 'gasto' && sinRecetas ? <div className="empty">Primero crea una receta en <b>Recetas</b>.</div>
        : tipo === 'produccion' ? <Produccion key={'p' + n} rec0={rec0} volver={volver} /> : tipo === 'venta' ? <Venta key={'v' + n} rec0={rec0} volver={volver} /> : <Gasto key={'g' + n} volver={volver} />}
    </div>
  )
}
