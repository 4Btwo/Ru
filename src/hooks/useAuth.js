import { useState, useEffect } from 'react'
import { onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth'
import { ref, set, get, onValue } from 'firebase/database'
import { auth, googleProvider, db } from '../lib/firebase'

export function useAuth() {
  const [user,    setUser]    = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let unsubProfile = null

    const unsubAuth = onAuthStateChanged(auth, async (fireUser) => {
      if (unsubProfile) { unsubProfile(); unsubProfile = null }

      if (fireUser) {
        const profileRef = ref(db, `users/${fireUser.uid}`)
        const snap = await get(profileRef)
        if (!snap.exists()) {
          await set(profileRef, {
            name: fireUser.displayName, photo: fireUser.photoURL,
            score: 0, reports: 0, createdAt: Date.now(),
          })
        }
        // Escuta perfil em tempo real → score atualiza ao vivo
        unsubProfile = onValue(profileRef, (s) => {
          const d = s.val() || {}
          setUser({ uid: fireUser.uid, name: fireUser.displayName,
            photo: fireUser.photoURL, score: d.score || 0, reports: d.reports || 0 })
        })
        setLoading(false)
      } else {
        setUser(null)
        setLoading(false)
      }
    })

    return () => { unsubAuth(); if (unsubProfile) unsubProfile() }
  }, [])

  return {
    user, loading,
    login:  () => signInWithPopup(auth, googleProvider),
    logout: () => signOut(auth),
  }
}
