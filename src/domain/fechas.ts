export const DIA = 864e5
export const hoy = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d }
export const iso = (d: Date) => { const z = new Date(d.getTime() - d.getTimezoneOffset() * 6e4); return z.toISOString().slice(0, 10) }
export const parse = (s: string) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d) }
export const sumar = (d: Date, n: number) => { const x = new Date(d); x.setDate(x.getDate() + n); return x }
export const dias = (a: Date, b: Date) => Math.round((b.getTime() - a.getTime()) / DIA)
const aFecha = (d: Date | string) => typeof d === 'string' ? parse(d) : d
export const fcorta = (d: Date | string) => aFecha(d).toLocaleDateString('es-CO', { day: 'numeric', month: 'short' })
export const flarga = (d: Date | string) => aFecha(d).toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' })
export const plata = (v: number) => (v < 0 ? '−$' : '$') + Math.abs(Math.round(v)).toLocaleString('es-CO')
export const pct = (a: number, b: number) => b ? Math.round(a / b * 100) + '%' : '—'
export const prom = (a: number[]) => a.length ? a.reduce((x, y) => x + y, 0) / a.length : null
