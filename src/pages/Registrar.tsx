import { useMemo, useState } from 'react'
import { crear } from '../db'
import { useDatos } from '../datos'
import { CAT_GASTO, LABORES, PAQUETES, PRODUCTOS_BASE } from '../domain/cuentas'
import { hoy, iso, plata } from '../domain/fechas'
import { ir } from '../ruta'
import { toast } from '../ui'

const TIPOS = [['gasto', 'Gasto', 'Semilla, insumos, jornales'], ['venta', 'Venta', 'Semilla, flor y otros'], ['turistas', 'Turistas', 'Visitantes y lo cobrado'], ['cosecha', 'Cosecha', 'Kilos y tallos'], ['labor', 'Labor', 'Riego, deshierbe, cebo']] as const
type Tipo = typeof TIPOS[number][0]

export default function Registrar({ tipo0, lote0 }: { tipo0?: string; lote0?: string }) {
  const { temporadas, lotes, productos } = useDatos()
  const [tipo, setTipo] = useState<Tipo>((TIPOS.find(t => t[0] === tipo0)?.[0]) || 'gasto')
  const [cat, setCat] = useState('')
  const [cant, setCant] = useState(''), [unit, setUnit] = useState(''), [nuevaU, setNuevaU] = useState('')
  const prods = useMemo(() => {
    const m = new Map<string, string>(); PRODUCTOS_BASE.forEach(p => m.set(p.nombre, p.unidad)); productos.forEach(p => m.set(p.nombre, p.unidad)); return m
  }, [productos])
  const temps = [...temporadas].sort((a, b) => a.inicio < b.inicio ? 1 : -1)
  const lotesOrd = [...lotes].sort((a, b) => a.fechaSiembra < b.fechaSiembra ? 1 : -1)
  const defDonde = lote0 ? 'l:' + lote0 : lotesOrd[0] ? 'l:' + lotesOrd[0].id : temps[0] ? 't:' + temps[0].id : ''
  const catSel = cat || (tipo === 'gasto' ? CAT_GASTO[0] : tipo === 'venta' ? [...prods.keys()][0] : tipo === 'turistas' ? PAQUETES[0] : tipo === 'cosecha' ? 'Semilla' : LABORES[0])
  const unidad = tipo === 'venta' ? (catSel === '__nuevo' ? nuevaU : prods.get(catSel) || '') : tipo === 'cosecha' ? (catSel === 'Flor' ? 'tallos' : 'kg') : ''
  const total = (+cant || 0) * (+unit || 0)
  const cambiarTipo = (t: Tipo) => { setTipo(t); setCat(''); setCant(''); setUnit('') }

  const donde = <label>¿A qué corresponde?<select name="donde" defaultValue={defDonde}>{temps.map(t => <optgroup key={t.id} label={`${t.nombre} ${t.anio}`}>
    <option value={'t:' + t.id}>Toda la temporada</option>
    {lotes.filter(l => l.temporadaId === t.id).map(l => <option key={l.id} value={'l:' + l.id}>{l.nombre}</option>)}</optgroup>)}</select></label>
  const soloLote = <label>Lote<select name="lote" defaultValue={lote0 || lotesOrd[0]?.id}>{lotesOrd.map(l => { const t = temporadas.find(x => x.id === l.temporadaId); return <option key={l.id} value={l.id}>{l.nombre} · {t?.nombre} {t?.anio}</option> })}</select></label>

  const sinTemp = !temporadas.length, sinLote = !lotes.length && (tipo === 'cosecha' || tipo === 'labor')
  const guardar = (f: HTMLFormElement) => {
    const g = (n: string) => (f.elements.namedItem(n) as HTMLInputElement | null)?.value ?? ''
    const fecha = g('fecha')
    if (tipo === 'cosecha') crear('cosechas', { loteId: g('lote'), fecha, producto: catSel, cantidad: +cant, unidad })
    else if (tipo === 'labor') crear('labores', { loteId: g('lote'), fecha, tipo: catSel, nota: g('detalle') })
    else {
      const d = g('donde'); let temporadaId = d.slice(2), loteId: string | null = null
      if (d.startsWith('l:')) { loteId = d.slice(2); temporadaId = lotes.find(l => l.id === loteId)!.temporadaId }
      let categoria = catSel
      if (tipo === 'venta' && catSel === '__nuevo') {
        const nn = g('nuevoNombre').trim(); categoria = nn.charAt(0).toUpperCase() + nn.slice(1)
        crear('productos', { nombre: categoria, unidad: nuevaU.trim() || 'unidades' })
      }
      const base = { tipo, fecha, temporadaId, loteId, categoria, detalle: g('detalle') }
      if (tipo === 'gasto') crear('movs', { ...base, valor: +g('valor') })
      if (tipo === 'venta') crear('movs', { ...base, cantidad: +cant, unit: +unit, unidad: unidad || 'unidades', valor: total })
      if (tipo === 'turistas') crear('movs', { ...base, personas: +cant, unit: +unit, valor: total })
    }
    toast('Guardado')
    if (lote0) ir('cultivo/lote/' + lote0)
    else { f.reset(); setCant(''); setUnit(''); setCat('') }
  }

  return (
    <div className="stack-lg"><h1>Registrar</h1>
      <div className="types">{TIPOS.map(([k, n, s]) => <button key={k} className={'type ' + (tipo === k ? 'on' : '')} aria-pressed={tipo === k} onClick={() => cambiarTipo(k)}><b>{n}</b><small>{s}</small></button>)}</div>
      {sinTemp ? <div className="empty">Primero crea una temporada en <b>Siembras</b>.</div> : sinLote ? <div className="empty">Primero crea un lote en <b>Siembras</b>.</div> :
        <form key={tipo} className="card" onSubmit={e => { e.preventDefault(); guardar(e.currentTarget) }}>
          <label>Fecha<input name="fecha" type="date" defaultValue={iso(hoy())} required /></label>
          {tipo === 'gasto' && <>
            <label>Categoría<select value={catSel} onChange={e => setCat(e.target.value)}>{CAT_GASTO.map(c => <option key={c}>{c}</option>)}</select></label>
            <label>Detalle<input name="detalle" placeholder="Ej: 3 jornales de deshierbe" /></label>
            <label>Valor (pesos)<input name="valor" type="number" inputMode="numeric" min="0" step="any" required placeholder="0" /></label>
            {donde}</>}
          {tipo === 'venta' && <>
            <label>Producto<select value={catSel} onChange={e => setCat(e.target.value)}>{[...prods.keys()].map(c => <option key={c}>{c}</option>)}<option value="__nuevo">+ Agregar nuevo producto</option></select></label>
            {catSel === '__nuevo' && <div className="two"><label>Nombre del producto<input name="nuevoNombre" required placeholder="Ej: Ensilaje de girasol" /></label><label>Se vende por<input value={nuevaU} onChange={e => setNuevaU(e.target.value)} placeholder="Ej: bultos" /></label></div>}
            <div className="two"><label>Cantidad <span className="muted">{unidad}</span><input type="number" inputMode="decimal" min="0" step="any" required value={cant} onChange={e => setCant(e.target.value)} /></label>
              <label>Precio unidad<input type="number" inputMode="numeric" min="0" step="any" required value={unit} onChange={e => setUnit(e.target.value)} /></label></div>
            <div className="total"><span>Total</span><span className="num">{plata(total)}</span></div>
            <label>Cliente (opcional)<input name="detalle" placeholder="Ej: Tienda en Duitama" /></label>
            {donde}</>}
          {tipo === 'turistas' && <>
            <label>Paquete<select value={catSel} onChange={e => setCat(e.target.value)}>{PAQUETES.map(c => <option key={c}>{c}</option>)}</select></label>
            <div className="two"><label>Personas<input type="number" inputMode="numeric" min="1" required value={cant} onChange={e => setCant(e.target.value)} /></label>
              <label>Valor por persona<input type="number" inputMode="numeric" min="0" step="any" required value={unit} onChange={e => setUnit(e.target.value)} /></label></div>
            <div className="total"><span>Total</span><span className="num">{plata(total)}</span></div>
            <label>Nota (opcional)<input name="detalle" placeholder="Ej: Grupo de colegio" /></label>
            {donde}</>}
          {tipo === 'cosecha' && <>
            {soloLote}
            <label>Producto<select value={catSel} onChange={e => setCat(e.target.value)}><option>Semilla</option><option>Flor</option></select></label>
            <label>Cantidad <span className="muted">{unidad}</span><input type="number" inputMode="decimal" min="0" step="any" required value={cant} onChange={e => setCant(e.target.value)} /></label></>}
          {tipo === 'labor' && <>
            {soloLote}
            <label>Labor<select value={catSel} onChange={e => setCat(e.target.value)}>{LABORES.map(c => <option key={c}>{c}</option>)}</select></label>
            <label>Nota<textarea name="detalle" rows={2} placeholder="Qué se hizo, quién, cuántos jornales" /></label></>}
          <button className="btn full" type="submit">Guardar</button>
        </form>}
    </div>
  )
}
