import { useState, useEffect } from 'react'
import {
  onAuthStateChanged,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signOut,
  setPersistence,
  browserLocalPersistence
} from 'firebase/auth'

import { ref, set, get, onValue } from 'firebase/database'
import { auth, googleProvider, db } from '../lib/firebase'

// Detecta mobile/Safari
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

    // 🔥 ESSENCIAL PRA MOBILE
    setPersistence(auth, browserLocalPersistence)

    // 🔥 PROCESSA RETORNO DO GOOGLE
    getRedirectResult(auth)
      .then((result) => {
        if (result?.user) {
          console.log('Login via redirect OK')
        }
      })
      .catch((err) => {
        console.error('Redirect error:', err)
      })

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
      await signInWithRedirect(auth, googleProvider)
    } else {
      try {
        await signInWithPopup(auth, googleProvider)
      } catch (e) {
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

  return {
    user,
    loading,
    login,
    logout: () => signOut(auth),
  }
}
