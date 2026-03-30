import { useState, useEffect } from 'react'
import { onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth'
import { ref, set, get } from 'firebase/database'
import { auth, googleProvider, db } from '../lib/firebase'

export function useAuth() {
  const [user, setUser]     = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (fireUser) => {
      if (fireUser) {
        // Garante perfil no Realtime DB
        const profileRef = ref(db, `users/${fireUser.uid}`)
        const snap = await get(profileRef)
        if (!snap.exists()) {
          await set(profileRef, {
            name:   fireUser.displayName,
            photo:  fireUser.photoURL,
            score:  0,
            reports: 0,
            createdAt: Date.now(),
          })
        }
        setUser({ uid: fireUser.uid, name: fireUser.displayName, photo: fireUser.photoURL })
      } else {
        setUser(null)
      }
      setLoading(false)
    })
    return unsub
  }, [])

  const login  = () => signInWithPopup(auth, googleProvider)
  const logout = () => signOut(auth)

  return { user, loading, login, logout }
}
