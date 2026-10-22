import { useEffect, useState } from 'react'
import { collection, deleteDoc, doc, onSnapshot, setDoc, updateDoc, type DocumentData } from 'firebase/firestore'
import { db } from './firebase'
import { useAuth } from './auth'

// Todos los datos viven bajo users/{uid}/... y las reglas solo dejan entrar al dueño.
const base = (uid: string) => `users/${uid}`
let uidActual = ''
export const setUid = (uid: string) => { uidActual = uid }
const colRef = (name: string) => collection(db, `${base(uidActual)}/${name}`)

export type ConId<T> = T & { id: string; creado?: number }

export function useCol<T extends DocumentData>(name: string): ConId<T>[] | null {
  const { user } = useAuth()
  const [rows, setRows] = useState<ConId<T>[] | null>(null)
  useEffect(() => {
    if (!user) return
    return onSnapshot(collection(db, `${base(user.uid)}/${name}`), snap => {
      setRows(snap.docs.map(d => ({ id: d.id, ...(d.data() as T) })))
    })
  }, [user, name])
  return rows
}

// Las escrituras no esperan al servidor: sin señal quedan en el celular y se suben solas después.
export function crear(name: string, data: DocumentData): string {
  const ref = doc(colRef(name))
  setDoc(ref, { ...data, creado: Date.now() }).catch(console.error)
  return ref.id
}
export function crearConId(name: string, id: string, data: DocumentData) {
  setDoc(doc(colRef(name), id), { ...data, creado: Date.now() }).catch(console.error)
}
export function actualizar(name: string, id: string, data: DocumentData) {
  updateDoc(doc(colRef(name), id), data).catch(console.error)
}
export function borrar(name: string, id: string) {
  deleteDoc(doc(colRef(name), id)).catch(console.error)
}
