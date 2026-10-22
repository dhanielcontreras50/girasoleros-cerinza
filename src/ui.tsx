import { useEffect, useState, type FormEvent, type ReactNode } from 'react'

export const Flor = ({ size = 34 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 40 40" aria-hidden="true">
    <g fill="var(--sun)">{Array.from({ length: 12 }, (_, i) => <ellipse key={i} cx="20" cy="7" rx="4" ry="7.5" transform={`rotate(${i * 30} 20 20)`} />)}</g>
    <circle cx="20" cy="20" r="8" fill="var(--soil)" />
  </svg>
)

const sv = { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }
export const ICON: Record<string, ReactNode> = {
  inicio: <svg {...sv}><path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z" /></svg>,
  siembras: <svg {...sv}><circle cx="12" cy="8" r="3" /><path d="M12 2v1M12 13v1M6 8H5M19 8h-1M7.8 3.8l.7.7M15.5 11.5l.7.7M7.8 12.2l.7-.7M15.5 4.5l.7-.7M12 14v8M12 18c-2-2-4-2-6-1M12 20c2-2 4-2 6-1" /></svg>,
  registrar: <svg {...sv} strokeWidth={2.4}><path d="M12 6v12M6 12h12" /></svg>,
  cuentas: <svg {...sv}><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3 10h18M7 15h4" /></svg>,
  recetas: <svg {...sv}><path d="M7 3h10l-1 4H8z" /><path d="M8 7c-2 2-3 4-3 7a7 7 0 0 0 14 0c0-3-1-5-3-7" /></svg>
}

let mostrarToast: (m: string) => void = () => {}
export const toast = (m: string) => mostrarToast(m)
export function Toasts() {
  const [m, setM] = useState<string | null>(null)
  useEffect(() => {
    let t: number | undefined
    mostrarToast = msg => { setM(msg); clearTimeout(t); t = window.setTimeout(() => setM(null), 2200) }
  }, [])
  return m ? <div className="toast" role="status">{m}</div> : null
}

export function Sheet({ titulo, children, onCerrar, onGuardar, textoGuardar = 'Guardar' }: {
  titulo: string; children: ReactNode; onCerrar: () => void; onGuardar: (f: HTMLFormElement) => void; textoGuardar?: string
}) {
  const enviar = (e: FormEvent<HTMLFormElement>) => { e.preventDefault(); onGuardar(e.currentTarget) }
  return (
    <div className="sheet" onClick={e => { if (e.target === e.currentTarget) onCerrar() }}>
      <div role="dialog" aria-modal="true" aria-label={titulo}>
        <form onSubmit={enviar}>
          <h2>{titulo}</h2>
          {children}
          <div className="two"><button type="button" className="btn ghost" onClick={onCerrar}>Cancelar</button><button className="btn" type="submit">{textoGuardar}</button></div>
        </form>
      </div>
    </div>
  )
}

export function Confirmar({ titulo, texto, si, onSi, onCerrar }: { titulo: string; texto: string; si: string; onSi: () => void; onCerrar: () => void }) {
  return (
    <div className="sheet" onClick={e => { if (e.target === e.currentTarget) onCerrar() }}>
      <div role="dialog" aria-modal="true" className="stack">
        <h2>{titulo}</h2><p className="muted" style={{ margin: 0 }}>{texto}</p>
        <div className="two"><button className="btn ghost" onClick={onCerrar}>Cancelar</button><button className="btn" onClick={() => { onCerrar(); onSi() }}>{si}</button></div>
      </div>
    </div>
  )
}

export const valor = (f: HTMLFormElement, name: string) => (f.elements.namedItem(name) as HTMLInputElement).value

export function Pronto({ titulo, fase, texto }: { titulo: string; fase: number; texto: string }) {
  return <div className="stack-lg"><h1>{titulo}</h1><div className="empty pronto"><b>Llega en la fase {fase}.</b><span>{texto}</span></div></div>
}
