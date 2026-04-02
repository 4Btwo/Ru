import { useState, useEffect } from 'react'
import {
  onAuthStateChanged,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signOut,
  setPersistence,
  indexedDBLocalPersistence
} from 'firebase/auth'

import { ref, set, get, onValue } from 'firebase/database'
import { auth, googleProvider, db } from '../lib/firebase'

// Detecta mobile/Safari (popup quebra nesses casos)
function isMobileOrSafari() {
  const ua = navigator.userAgent
  const isSafari = /Safari/i.test(ua) && !/Chrome/i.test(ua)
  const isMobile = /Android|iPhone|iPad|iPod/i.test(ua)
  return isMobile || isSafari
}

export function useAuth() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let unsubProfile = null

    const initAuth = async () => {
      try {
        // 🔥 PERSISTÊNCIA FORTE (resolve mobile)
        await setPersistence(auth, indexedDBLocalPersistence)

        // 🔥 PROCESSA RETORNO DO GOOGLE (evita loop)
        await getRedirectResult(auth)
      } catch (err) {
        console.error('Auth init error:', err)
      }
    }

    initAuth()

    const unsubAuth = onAuthStateChanged(auth, async (fireUser) => {
      if (unsubProfile) {
        unsubProfile()
        unsubProfile = null
      }

      if (fireUser) {
        const profileRef = ref(db, `users/${fireUser.uid}`)
        const snap = await get(profileRef)

        if (!snap.exists()) {
          await set(profileRef, {
            name: fireUser.displayName,
            photo: fireUser.photoURL,
            score: 0,
            reports: 0,
            createdAt: Date.now(),
          })
        }

        // 🔥 realtime do usuário (score etc)
        unsubProfile = onValue(profileRef, (s) => {
          const d = s.val() || {}

          setUser({
            uid: fireUser.uid,
            name: fireUser.displayName,
            photo: fireUser.photoURL,
            score: d.score || 0,
            reports: d.reports || 0,
          })
        })

        setLoading(false)
      } else {
        setUser(null)
        setLoading(false)
      }
    })

    return () => {
      unsubAuth()
      if (unsubProfile) unsubProfile()
    }
  }, [])

  const login = async () => {
    if (isMobileOrSafari()) {
      // 🔥 MOBILE → REDIRECT (100% confiável)
      await signInWithRedirect(auth, googleProvider)
    } else {
      // 🔥 DESKTOP → POPUP (mais rápido)
      try {
        await signInWithPopup(auth, googleProvider)
      } catch (e) {
        // fallback automático
        if (
          e.code === 'auth/popup-blocked' ||
          e.code === 'auth/popup-closed-by-user'
        ) {
          await signInWithRedirect(auth, googleProvider)
        } else {
          throw e
        }
      }
    }
  }

  const logout = () => signOut(auth)

  return {
    user,
    loading,
    login,
    logout,
  }
}
