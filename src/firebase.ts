import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from 'firebase/firestore'
import { getStorage } from 'firebase/storage'

// Configuración web del proyecto. No es secreta: solo identifica el proyecto.
// La seguridad la dan las reglas de Firestore y Storage (firestore.rules, storage.rules).
const firebaseConfig = {
  apiKey: 'AIzaSyDBGRif-nlLwfgeVEmQRHI7NqiBGLK_VIM',
  authDomain: 'girasoleros-cerinza.firebaseapp.com',
  projectId: 'girasoleros-cerinza',
  storageBucket: 'girasoleros-cerinza.firebasestorage.app',
  messagingSenderId: '814549437377',
  appId: '1:814549437377:web:62304c4b4b2ed79b457d40'
}

export const app = initializeApp(firebaseConfig)
export const auth = getAuth(app)
// La caché local guarda todo en el celular: se puede registrar sin señal y se sincroniza al volver.
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() })
})
export const storage = getStorage(app)
