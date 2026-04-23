import { useState, useEffect } from 'react'
import {
  onAuthStateChanged,
  signInWithRedirect,
  getRedirectResult,
  signOut,
  setPersistence,
  indexedDBLocalPersistence,
} from 'firebase/auth'
import { ref, set, get, onValue } from 'firebase/database'
import { auth, googleProvider, db } from '../lib/firebase'

export function useAuth() {
  const [user,      setUser]      = useState(null)
  const [loading,   setLoading]   = useState(true)
  const [authError, setAuthError] = useState(null)

  useEffect(() => {
    let unsubProfile = null
    let unsubAuth    = null
    let cancelled    = false

    const run = async () => {
      // ── 1. Configura persistência e processa redirect ANTES de registrar
      //       o onAuthStateChanged, evitando a race condition onde o listener
      //       dispara com fireUser=null antes do getRedirectResult resolver.
      try {
        await setPersistence(auth, indexedDBLocalPersistence)
        const result = await getRedirectResult(auth)
        if (result?.user) {
          console.log('[Auth] Redirect result OK:', result.user.displayName)
        }
      } catch (err) {
        console.error('[Auth] Init error:', err.code, err.message)
        if (err.code === 'auth/unauthorized-domain') {
          setAuthError('unauthorized-domain')
        }
        if (!cancelled) setLoading(false)
        return
      }

      if (cancelled) return

      // ── 2. Só registra o listener depois que o redirect foi processado
      unsubAuth = onAuthStateChanged(auth, async (fireUser) => {
        if (unsubProfile) { unsubProfile(); unsubProfile = null }

        if (fireUser) {
          setAuthError(null)
          const profileRef = ref(db, `users/${fireUser.uid}`)
          const snap = await get(profileRef)

          if (!snap.exists()) {
            await set(profileRef, {
              name:      fireUser.displayName,
              photo:     fireUser.photoURL,
              score:     0,
              reports:   0,
              createdAt: Date.now(),
            })
          }

          unsubProfile = onValue(profileRef, (s) => {
            const d = s.val() || {}
            if (!cancelled) {
              setUser({
                uid:     fireUser.uid,
                name:    fireUser.displayName,
                photo:   fireUser.photoURL,
                score:   d.score   || 0,
                reports: d.reports || 0,
              })
            }
          })

          if (!cancelled) setLoading(false)
        } else {
          if (!cancelled) {
            setUser(null)
            setLoading(false)
          }
        }
      })
    }

    run()

    return () => {
      cancelled = true
      if (unsubAuth)    unsubAuth()
      if (unsubProfile) unsubProfile()
    }
  }, [])

  // SEMPRE usa redirect — funciona em qualquer domínio/browser/mobile.
  // Popup falha quando o domínio não está autorizado no Firebase Console.
  const login = async () => {
    try {
      setAuthError(null)
      await signInWithRedirect(auth, googleProvider)
    } catch (e) {
      console.error('[Auth] Login error:', e.code, e.message)
      if (e.code === 'auth/unauthorized-domain') {
        setAuthError('unauthorized-domain')
      }
    }
  }

  const logout = () => signOut(auth)

  return { user, loading, login, logout, authError }
}
