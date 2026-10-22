import { useEffect, useState } from 'react'
import { entrar, salir, useAuth } from './auth'
import { setUid } from './db'
import { DatosProvider } from './datos'
import { subirPendientes, usePendientes } from './fotos'
import { useEnLinea } from './online'
import { ir, useRuta } from './ruta'
import { Flor, ICON, Pronto, Toasts } from './ui'
import Inicio from './pages/Inicio'
import Siembras from './pages/Siembras'
import LoteVista from './pages/Lote'

function Login() {
  const [error, setError] = useState('')
  return (
    <div className="login">
      <Flor size={64} />
      <div><div className="eyebrow">Cultivo y semillas tostadas</div><h1>Girasoleros Cerinza</h1></div>
      <p className="muted" style={{ margin: 0 }}>Entra con tu cuenta de Google. Tus datos quedan guardados en la nube y también en este celular, para usar la app sin señal.</p>
      <button className="btn full" onClick={() => entrar().catch(e => setError(e?.code === 'auth/network-request-failed' ? 'No hay señal. La primera vez necesitas internet para entrar.' : 'No se pudo entrar. Intenta de nuevo.'))}>Entrar con Google</button>
      {error && <p className="neg" role="alert" style={{ margin: 0 }}>{error}</p>}
    </div>
  )
}

function Estado() {
  const on = useEnLinea(), pend = usePendientes()
  const txt = on ? (pend ? `Subiendo ${pend} ${pend === 1 ? 'foto' : 'fotos'}…` : 'Todo guardado en la nube') : `Sin señal · se guarda en el celular${pend ? ` · ${pend} ${pend === 1 ? 'foto' : 'fotos'} por subir` : ''}`
  return <div className={'sync' + (on ? '' : ' off')} role="status"><i />{txt}</div>
}

function Menu() {
  const { user } = useAuth()
  const [open, setOpen] = useState(false)
  return (
    <div className="menu">
      <button className="avatar" aria-label="Tu cuenta" aria-expanded={open} onClick={() => setOpen(!open)}>
        {user?.photoURL ? <img src={user.photoURL} alt="" referrerPolicy="no-referrer" /> : (user?.displayName || 'D')[0]}
      </button>
      {open && <div className="sheet" onClick={e => { if (e.target === e.currentTarget) setOpen(false) }}><div role="dialog" aria-modal="true" className="stack">
        <h2>{user?.displayName}</h2><div className="muted">{user?.email}</div>
        <p className="muted" style={{ margin: 0, fontSize: '.88rem' }}>Si sales, lo que no haya subido a la nube se queda en este celular hasta que vuelvas a entrar.</p>
        <div className="two"><button className="btn ghost" onClick={() => setOpen(false)}>Cerrar</button><button className="btn" onClick={() => salir()}>Salir</button></div>
      </div></div>}
    </div>
  )
}

const NAV: Record<string, [string, string, string][]> = {
  cultivo: [['inicio', 'Inicio', 'inicio'], ['siembras', 'Siembras', 'siembras'], ['registrar', 'Registrar', 'registrar'], ['cuentas', 'Cuentas', 'cuentas']],
  tostadas: [['inicio', 'Inicio', 'inicio'], ['recetas', 'Recetas', 'recetas'], ['registrar', 'Registrar', 'registrar'], ['cuentas', 'Cuentas', 'cuentas']],
  analisis: [['cultivo', 'Cultivo', 'siembras'], ['tostadas', 'Semillas tostadas', 'recetas']]
}

function Contenido({ r }: { r: string[] }) {
  const [area, tab, id] = r
  if (area === 'tostadas') return <Pronto titulo="Semillas tostadas" fase={3} texto="Recetas con la pérdida al tostar, paquetes por tamaño, producción, ventas e inventario." />
  if (area === 'analisis') return <Pronto titulo={tab === 'tostadas' ? 'Análisis de semillas tostadas' : 'Análisis del cultivo'} fase={4} texto="Rentabilidad con indicadores y porcentajes, y los tiempos de cada etapa comparados con el promedio." />
  if (tab === 'siembras') return <Siembras />
  if (tab === 'lote' && id) return <LoteVista id={id} />
  if (tab === 'registrar') return <Pronto titulo="Registrar" fase={2} texto="Gastos, ventas (con productos nuevos), turistas, cosecha y labores." />
  if (tab === 'cuentas') return <Pronto titulo="Cuentas" fase={2} texto="Ingresos, gastos y ganancia por año, temporada y lote." />
  return <Inicio />
}

function Shell() {
  const r = useRuta()
  const [area, tab0] = r
  const tab = tab0 === 'lote' ? 'siembras' : tab0
  const items = NAV[area] || NAV.cultivo
  useEffect(() => { subirPendientes() }, [])
  return (
    <>
      <div className="app">
        <div className="row between" style={{ marginBottom: 10 }}><Estado /><Menu /></div>
        <div className="areas" role="group" aria-label="Apartados">
          {[['cultivo', 'Cultivo', 'cultivo/inicio'], ['tostadas', 'Semillas tostadas', 'tostadas/inicio'], ['analisis', 'Análisis', 'analisis/cultivo']].map(([k, n, to]) =>
            <button key={k} className={area === k ? 'on' : ''} aria-pressed={area === k} onClick={() => ir(to)}>{n}</button>)}
        </div>
        <Contenido r={r} />
      </div>
      <nav className="nav" aria-label="Secciones"><div style={{ gridTemplateColumns: `repeat(${items.length},1fr)` }}>
        {items.map(([k, n, ic]) => (
          <button key={k} className={k === 'registrar' ? 'add' : ''} aria-current={(area === 'analisis' ? tab0 : tab) === k ? 'page' : undefined} onClick={() => ir(`${area || 'cultivo'}/${k}`)}>
            {k === 'registrar' ? <span className="dot">{ICON[ic]}</span> : ICON[ic]}{n}
          </button>))}
      </div></nav>
    </>
  )
}

export default function App() {
  const { user, cargando } = useAuth()
  if (cargando) return <div className="login"><Flor size={64} /></div>
  if (!user) return <><Login /><Toasts /></>
  setUid(user.uid)
  return <DatosProvider><Shell /><Toasts /></DatosProvider>
}
