import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { GoogleAuthProvider, onAuthStateChanged, signInWithPopup, signInWithRedirect, signOut, type User } from 'firebase/auth'
import { auth } from './firebase'

type AuthState = { user: User | null; cargando: boolean }
const Ctx = createContext<AuthState>({ user: null, cargando: true })

export function AuthProvider({ children }: { children: ReactNode }) {
  const [st, setSt] = useState<AuthState>({ user: null, cargando: true })
  useEffect(() => onAuthStateChanged(auth, user => setSt({ user, cargando: false })), [])
  return <Ctx.Provider value={st}>{children}</Ctx.Provider>
}
export const useAuth = () => useContext(Ctx)

export async function entrar() {
  const provider = new GoogleAuthProvider()
  provider.setCustomParameters({ prompt: 'select_account' })
  try {
    await signInWithPopup(auth, provider)
  } catch (e: unknown) {
    const code = (e as { code?: string }).code
    if (code === 'auth/popup-blocked' || code === 'auth/operation-not-supported-in-this-environment') {
      await signInWithRedirect(auth, provider)
    } else throw e
  }
}
export const salir = () => signOut(auth)
