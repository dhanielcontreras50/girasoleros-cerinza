// Solo para pruebas locales (MOCK=1): usuario falso, sin Firebase.
import type { ReactNode } from 'react'
const user = { uid: 'prueba', displayName: 'Daniel (prueba)', email: 'prueba@ejemplo.com', photoURL: null }
export const AuthProvider = ({ children }: { children: ReactNode }) => <>{children}</>
export const useAuth = () => ({ user: user as never, cargando: false })
export const entrar = async () => {}
export const salir = async () => {}
