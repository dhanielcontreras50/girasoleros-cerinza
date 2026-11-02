import { useState } from 'react'
import { useAuth } from '../../auth'
import { copiar, enviar } from '../../compartir'
import { crearConId, type ConId } from '../../db'
import { useDatos } from '../../datos'
import { plata } from '../../domain/fechas'
import { agrupar, mensajeOferta, mensajeProducto, OFERTA_BASE, type AjustesOferta } from '../../domain/oferta'
import type { Foto, Paquete, Receta } from '../../domain/tipos'
import { gramos, inventario } from '../../domain/tostadas'
import { agregarFotos } from '../../fotos'
import { ir } from '../../ruta'
import { toast } from '../../ui'
import { Cuadricula, Escogidas, esTostada, FotoImg, FotoPicker, portadaPaquete, Visor } from '../Galeria'
import { useTDatos } from './comun'

type F = ConId<Foto>
const MAX = 6

/** Sección de fotos dentro de una receta: se suben marcando de qué presentación son. */
export function FotosReceta({ r, ps }: { r: ConId<Receta>; ps: ConId<Paquete>[] }) {
  const { fotos } = useDatos()
  const { user } = useAuth()
  const [de, setDe] = useState('')
  const [ver, setVer] = useState<number | null>(null)
  const lista = fotos.filter(f => f.recetaId === r.id).sort((a, b) => (a.creado || 0) - (b.creado || 0))
  const subir = async (files: FileList | null) => {
    if (!files?.length || !user) return
    toast('Guardando fotos…')
    const n = await agregarFotos(user.uid, { recetaId: r.id, paqueteId: de || null }, [...files])
    toast(n === 1 ? 'Foto guardada' : `${n} fotos guardadas`)
  }
  return (
    <section className="card stack">
      <div className="row between"><h3>Fotos</h3><button className="link" onClick={() => ir('tostadas/galeria/' + r.id)}>Ver galería</button></div>
      <label>Las fotos nuevas son de<select value={de} onChange={e => setDe(e.target.value)}>
        <option value="">{r.nombre} (en general)</option>{ps.map(p => <option key={p.id} value={p.id}>Presentación de {gramos(p.gramos)}</option>)}</select></label>
      <div className="photos" style={{ marginTop: 0 }}>
        <Cuadricula lista={lista} onVer={setVer} />
        <label className="addph">📷 Tomar foto<input type="file" accept="image/*" capture="environment" onChange={e => { subir(e.target.files); e.target.value = '' }} /></label>
        <label className="addph">+ Desde galería<input type="file" accept="image/*" multiple onChange={e => { subir(e.target.files); e.target.value = '' }} /></label>
      </div>
      {lista.length > 0 && <small className="muted">Toca una foto para ponerla de portada, marcarla ⭐ o cambiar de qué presentación es.</small>}
      {ver !== null && <Visor lista={lista} inicio={ver} onCerrar={() => setVer(null)} />}
    </section>
  )
}

/** Cada presentación con su foto y un botón para mandarla sola. */
export function CompartirPresentaciones({ r, ps }: { r: ConId<Receta>; ps: ConId<Paquete>[] }) {
  const { fotos } = useDatos()
  const d = useTDatos()
  const act = ps.filter(p => p.activa)
  if (!act.length) return null
  return (
    <section className="card stack"><h3>Ofrecer una presentación</h3>
      <div className="list">{act.map(p => {
        const foto = portadaPaquete(p, r, fotos), n = inventario(p.id, d.tandas, d.ventas)
        return <div className="li" key={p.id} style={{ alignItems: 'center' }}>
          <div className="row" style={{ minWidth: 0 }}>{foto ? <FotoImg f={foto} className="mini" /> : <span className="mini ph" />}
            <div><b>{gramos(p.gramos)} · {plata(p.precio)}</b><small>{n > 0 ? `Hay ${n}` : 'Sin inventario'}{foto ? '' : ' · sin foto'}</small></div></div>
          <button className="btn small" onClick={() => enviar(mensajeProducto(r, p), foto ? [foto] : [])}>Compartir</button>
        </div>
      })}</div>
    </section>
  )
}

/** Galería de fotos de semillas tostadas, con filtros por receta y presentación. */
export function TGaleria({ receta0 }: { receta0?: string }) {
  const { fotos, recetas, paquetes, listo } = useDatos()
  const [solo, setSolo] = useState(false)
  const [rec, setRec] = useState(receta0 || '')
  const [paq, setPaq] = useState('')
  const [ver, setVer] = useState<number | null>(null)
  const recs = [...recetas].sort((a, b) => a.nombre.localeCompare(b.nombre))
  const paqs = paquetes.filter(p => p.recetaId === rec).sort((a, b) => b.gramos - a.gramos)
  const lista = fotos.filter(f => esTostada(f) && (!solo || f.favorita) && (!rec || f.recetaId === rec) && (!paq || (paq === 'general' ? !f.paqueteId : f.paqueteId === paq)))
    .sort((a, b) => (b.creado || 0) - (a.creado || 0))
  return (
    <div className="stack-lg">
      <div><button className="back" onClick={() => ir('tostadas/recetas')}>← Recetas</button><h1>Galería de tostadas</h1>
        <p className="muted" style={{ margin: '4px 0 0', fontSize: '.9rem' }}>Las fotos se suben desde cada receta. Toca una para ponerla de portada o marcarla ⭐.</p></div>
      <div className="stack">
        <div className="seg" role="group" aria-label="Qué fotos ver">
          <button className={!solo ? 'on' : ''} aria-pressed={!solo} onClick={() => setSolo(false)}>Todas</button>
          <button className={solo ? 'on' : ''} aria-pressed={solo} onClick={() => setSolo(true)}>★ Mejores fotos</button>
        </div>
        <div className="two">
          <label>Receta<select value={rec} onChange={e => { setRec(e.target.value); setPaq('') }}><option value="">Todas</option>{recs.map(r => <option key={r.id} value={r.id}>{r.nombre}</option>)}</select></label>
          <label>Presentación<select value={paq} disabled={!rec} onChange={e => setPaq(e.target.value)}><option value="">Todas</option><option value="general">En general</option>{paqs.map(p => <option key={p.id} value={p.id}>{gramos(p.gramos)}</option>)}</select></label>
        </div>
      </div>
      {!listo ? <div className="empty">Cargando…</div> : lista.length
        ? <div className="photos" style={{ marginTop: 0 }}><Cuadricula lista={lista} onVer={setVer} /></div>
        : <div className="empty">{fotos.some(esTostada) ? 'No hay fotos con estos filtros.' : 'Todavía no hay fotos. Entra a una receta y sube las fotos de cada presentación.'}</div>}
      {ver !== null && <Visor lista={lista} inicio={ver} onCerrar={() => setVer(null)} />}
    </div>
  )
}

/** Arma el mensaje con las presentaciones que se ofrecen y lo comparte con sus fotos. */
export function Oferta() {
  const { fotos, recetas, paquetes, ajustes, listo } = useDatos()
  const d = useTDatos()
  const guardado = ajustes.find(x => x.id === 'oferta') as unknown as Partial<AjustesOferta> | undefined
  const o: AjustesOferta = { ...OFERTA_BASE, ...(guardado ? { seleccion: guardado.seleccion, disponibles: !!guardado.disponibles, saludo: guardado.saludo ?? OFERTA_BASE.saludo, cierre: guardado.cierre ?? OFERTA_BASE.cierre, fotos: guardado.fotos } : {}) }
  const guardar = (c: Partial<AjustesOferta>) => {
    const n = { ...o, ...c }
    crearConId('ajustes', 'oferta', Object.fromEntries(Object.entries(n).filter(([, v]) => v !== undefined)))
  }
  const [escoger, setEscoger] = useState(false)
  const [todo, setTodo] = useState(false)
  const hay = (pid: string) => inventario(pid, d.tandas, d.ventas)
  const activos = paquetes.filter(p => p.activa)
  const sel = o.seleccion ?? activos.map(p => p.id)
  const grupos = agrupar(recetas.filter(r => paquetes.some(p => p.recetaId === r.id && p.activa)), activos, activos.map(p => p.id))
  const msg = mensajeOferta(recetas, paquetes, o, hay)
  const auto = o.fotos === undefined
  const deSel = agrupar(recetas, paquetes, sel).flatMap(g => g.ps.map(p => portadaPaquete(p, g.r, fotos))).filter((f): f is F => !!f)
  const paraEnviar = auto ? [...new Map(deSel.map(f => [f.id, f])).values()].slice(0, MAX) : o.fotos!.map(id => fotos.find(f => f.id === id)).filter((f): f is F => !!f)
  const tocar = (id: string) => guardar({ seleccion: sel.includes(id) ? sel.filter(x => x !== id) : [...sel, id] })

  if (!listo) return <div className="empty">Cargando…</div>
  return (
    <div className="stack-lg">
      <div><button className="back" onClick={() => ir('tostadas/inicio')}>← Inicio</button><h1>Ofrecer por WhatsApp</h1>
        <p className="muted" style={{ margin: '4px 0 0', fontSize: '.9rem' }}>Marca lo que quieres ofrecer. La app arma el mensaje y lo mandas con las fotos.</p></div>
      {!grupos.length ? <div className="empty">Primero crea tus recetas y sus presentaciones en <b>Recetas</b>.</div> : <>
        <section className="card stack"><h3>Qué ofreces</h3>
          {grupos.map(({ r, ps }) => <div key={r.id} className="stack" style={{ gap: 4 }}><b>{r.nombre}</b>
            {ps.map(p => { const foto = portadaPaquete(p, r, fotos), n = hay(p.id); return (
              <label key={p.id} className="chk"><input type="checkbox" checked={sel.includes(p.id)} onChange={() => tocar(p.id)} />
                {foto ? <FotoImg f={foto} className="mini" /> : <span className="mini ph" />}
                <span>{gramos(p.gramos)} · {plata(p.precio)}<small>{n > 0 ? `Hay ${n}` : 'Sin inventario'}</small></span></label>) })}
          </div>)}
          <label className="chk"><input type="checkbox" checked={o.disponibles} onChange={e => guardar({ disponibles: e.target.checked })} /><span>Decir cuántos paquetes hay<small>Los que no tienen inventario salen "por encargo".</small></span></label>
        </section>
        <section className="card stack"><h3>Mensaje</h3>
          <label>Saludo<textarea rows={2} defaultValue={o.saludo} key={'s' + o.saludo} onBlur={e => e.target.value !== o.saludo && guardar({ saludo: e.target.value })} /></label>
          <label>Despedida<textarea rows={2} defaultValue={o.cierre} key={'c' + o.cierre} onBlur={e => e.target.value !== o.cierre && guardar({ cierre: e.target.value })} /></label>
          <pre className={'msg' + (todo ? '' : ' corto')}>{msg}</pre>
          <button className="link" style={{ alignSelf: 'flex-start' }} onClick={() => setTodo(!todo)}>{todo ? 'Ver menos' : 'Ver todo el mensaje'}</button>
          <div className="row between"><b style={{ fontSize: '.92rem' }}>Fotos que van con el mensaje</b><button className="link" onClick={() => setEscoger(true)}>Escoger fotos</button></div>
          {paraEnviar.length ? <Escogidas lista={paraEnviar} /> : <small className="muted">Sin fotos. Súbelas en cada receta o toca "Escoger fotos".</small>}
          {auto && paraEnviar.length > 0 && <small className="muted">Por ahora va la foto de portada de cada presentación marcada.</small>}
          {!auto && <button className="link" style={{ alignSelf: 'flex-start' }} onClick={() => guardar({ fotos: undefined })}>Volver a usar las portadas</button>}
          <div className="two">
            <button className="btn ghost" onClick={() => copiar(msg).then(() => toast('Mensaje copiado'))}>Copiar</button>
            <button className="btn" onClick={() => enviar(msg, paraEnviar)}>{paraEnviar.length ? `Compartir con ${paraEnviar.length} ${paraEnviar.length === 1 ? 'foto' : 'fotos'}` : 'Compartir'}</button>
          </div>
        </section>
      </>}
      {escoger && <FotoPicker filtro={esTostada} titulo="Fotos para la oferta" max={MAX} sel={paraEnviar.map(f => f.id)} onCerrar={() => setEscoger(false)} onGuardar={ids => { guardar({ fotos: ids }); toast(ids.length ? `${ids.length} ${ids.length === 1 ? 'foto lista' : 'fotos listas'}` : 'La oferta va sin fotos') }} />}
    </div>
  )
}
