// ─── FIREBASE CONFIG ────────────────────────────────────────────────────────
// Substitua com suas credenciais do Firebase Console
// https://console.firebase.google.com → Project Settings → Your Apps
import { initializeApp } from 'firebase/app'
import { getAuth, GoogleAuthProvider } from 'firebase/auth'
import { getDatabase } from 'firebase/database'
import { getMessaging, isSupported } from 'firebase/messaging'

const firebaseConfig = {
  apiKey:            "SUA_API_KEY",
  authDomain:        "seu-projeto.firebaseapp.com",
  databaseURL:       "https://seu-projeto-default-rtdb.firebaseio.com",
  projectId:         "seu-projeto",
  storageBucket:     "seu-projeto.appspot.com",
  messagingSenderId: "SEU_SENDER_ID",
  appId:             "SEU_APP_ID",
}

const app      = initializeApp(firebaseConfig)
export const auth      = getAuth(app)
export const db        = getDatabase(app)
export const googleProvider = new GoogleAuthProvider()

// Messaging só funciona em HTTPS — inicializa de forma segura
export let messaging = null
isSupported().then(ok => {
  if (ok) messaging = getMessaging(app)
})

export default app
