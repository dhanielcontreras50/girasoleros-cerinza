import { expect, it } from 'vitest'
import { mensajeOferta, mensajeProducto, OFERTA_BASE } from './oferta'

const recetas = [
  { id: 'c', nombre: 'Cubiertas de chocolate', activa: true, rendimiento: null, ingredientes: [] },
  { id: 'p', nombre: 'Sabor puro', activa: true, rendimiento: null, ingredientes: [] }
]
const paq = (id: string, recetaId: string, g: number, precio: number, activa = true) => ({ id, recetaId, gramos: g, precio, empaque: 0, etiqueta: 0, activa })
const paquetes = [paq('p200', 'p', 200, 12000), paq('p500', 'p', 500, 25000), paq('c25', 'c', 25, 2500), paq('p25', 'p', 25, 2000, false)]

it('arma la oferta con las presentaciones activas por defecto', () => {
  const m = mensajeOferta(recetas, paquetes, OFERTA_BASE, () => 3)
  expect(m).toContain('*Cubiertas de chocolate*\n• 25 g: $2.500')
  expect(m).toContain('*Sabor puro*\n• 500 g: $25.000\n• 200 g: $12.000')
  expect(m).not.toContain('$2.000')
  expect(m).not.toContain('hay 3')
})

it('muestra disponibles y respeta la selección', () => {
  const m = mensajeOferta(recetas, paquetes, { ...OFERTA_BASE, disponibles: true, seleccion: ['p500', 'p25'] }, id => id === 'p500' ? 4 : 0)
  expect(m).toContain('• 500 g: $25.000 (hay 4)')
  expect(m).toContain('• 25 g: $2.000 (por encargo)')
  expect(m).not.toContain('chocolate')
})

it('mensaje de un solo producto', () => {
  expect(mensajeProducto(recetas[1], paquetes[1])).toContain('Sabor puro*\nPresentación de 500 g: $25.000')
})
