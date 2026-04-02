import { useState, useEffect } from 'react'
import {
  onAuthStateChanged, signInWithPopup, signInWithRedirect,
  getRedirectResult, signOut
} from 'firebase/auth'
import { ref, set, get, onValue } from 'firebase/database'
import { auth, googleProvider, db } from '../lib/firebase'

// Detecta se é mobile/Safari — nesses casos popup é bloqueado
function isMobileOrSafari() {
  const ua = navigator.userAgent
  const isSafari = /Safari/i.test(ua) && !/Chrome/i.test(ua)
  const isMobile = /Android|iPhone|iPad|iPod/i.test(ua)
  return isMobile || isSafari
}

export function useAuth() {
  const [user,    setUser]    = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let unsubProfile = null

    // Captura resultado do redirect (caso tenha voltado de um login via redirect)
    getRedirectResult(auth).catch(() => {})

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
          setUser({
            uid: fireUser.uid, name: fireUser.displayName,
            photo: fireUser.photoURL, score: d.score || 0, reports: d.reports || 0,
          })
        })
        setLoading(false)
      } else {
        setUser(null)
        setLoading(false)
      }
    })

    return () => { unsubAuth(); if (unsubProfile) unsubProfile() }
  }, [])

  const login = async () => {
    if (isMobileOrSafari()) {
      // Mobile/Safari: redirect é mais confiável que popup
      await signInWithRedirect(auth, googleProvider)
    } else {
      // Desktop: popup é mais fluido
      try {
        await signInWithPopup(auth, googleProvider)
      } catch (e) {
        // Se popup falhar (ex: bloqueado pelo browser), cai no redirect
        if (e.code === 'auth/popup-blocked' || e.code === 'auth/popup-closed-by-user') {
          await signInWithRedirect(auth, googleProvider)
        } else {
          throw e
        }
      }
    }
  }

  return {
    user, loading,
    login,
    logout: () => signOut(auth),
  }
}
