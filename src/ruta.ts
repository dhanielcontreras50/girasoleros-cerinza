import { useEffect, useState } from 'react'
// Rutas con # para que el botón Atrás de Android funcione dentro de la app.
export const ir = (r: string) => { location.hash = r }
export function useRuta() {
  const leer = () => (location.hash.replace(/^#\/?/, '') || 'cultivo/inicio').split('/')
  const [r, setR] = useState(leer)
  useEffect(() => {
    const f = () => { setR(leer()); window.scrollTo(0, 0) }
    window.addEventListener('hashchange', f)
    return () => window.removeEventListener('hashchange', f)
  }, [])
  return r
}
