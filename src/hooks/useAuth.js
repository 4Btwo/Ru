import { useState, useEffect } from 'react'
import {
  onAuthStateChanged,
  signInWithRedirect,
  signInWithPopup,
  getRedirectResult,
  signOut,
  setPersistence,
  indexedDBLocalPersistence,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
  sendEmailVerification,
  sendPasswordResetEmail,
} from 'firebase/auth'
import { ref, set, get, onValue, update } from 'firebase/database'
import { auth, googleProvider, db } from '../lib/firebase'

export function useAuth() {
  const [user,      setUser]      = useState(null)
  const [loading,   setLoading]   = useState(true)
  const [authError, setAuthError] = useState(null)

  useEffect(() => {
    let unsubProfile = null
    let unsubAuth    = null
    let cancelled    = false

    const hydrateUser = async (fireUser) => {
      const profileRef = ref(db, `users/${fireUser.uid}`)
      const snap = await get(profileRef)

      if (!snap.exists()) {
        await set(profileRef, {
          name:      fireUser.displayName || fireUser.email?.split('@')[0] || 'Usuário',
          photo:     fireUser.photoURL || null,
          score:     0,
          reports:   0,
          createdAt: Date.now(),
        })
      } else if (fireUser.displayName && snap.val().name !== fireUser.displayName) {
        await update(profileRef, { name: fireUser.displayName, photo: fireUser.photoURL || null })
      }

      unsubProfile = onValue(profileRef, (s) => {
        const d = s.val() || {}
        if (!cancelled) {
          setUser({
            uid:      fireUser.uid,
            name:     d.name  || fireUser.displayName || fireUser.email?.split('@')[0] || 'Usuário',
            photo:    d.photo || fireUser.photoURL    || null,
            email:    fireUser.email,
            score:    d.score   || 0,
            reports:  d.reports || 0,
          })
        }
      })
    }

    const run = async () => {
      try {
        await setPersistence(auth, indexedDBLocalPersistence)
        const result = await getRedirectResult(auth)
        if (result?.user) {
          console.log('[Auth] Redirect result OK:', result.user.displayName)
        }
      } catch (err) {
        console.error('[Auth] Init error:', err.code, err.message)
        if (err.code === 'auth/unauthorized-domain') setAuthError('unauthorized-domain')
        if (!cancelled) setLoading(false)
        return
      }

      if (cancelled) return

      unsubAuth = onAuthStateChanged(auth, async (fireUser) => {
        if (unsubProfile) { unsubProfile(); unsubProfile = null }

        if (fireUser) {
          setAuthError(null)
          await hydrateUser(fireUser)
          if (!cancelled) setLoading(false)
        } else {
          if (!cancelled) { setUser(null); setLoading(false) }
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

  // ── Google (redirect em mobile/Safari, popup em desktop) ──────────────────
  const loginWithGoogle = async () => {
    try {
      setAuthError(null)
      const isMobileSafari = /iPhone|iPad|iPod/i.test(navigator.userAgent)
      if (isMobileSafari) {
        await signInWithRedirect(auth, googleProvider)
      } else {
        await signInWithPopup(auth, googleProvider)
      }
    } catch (e) {
      console.error('[Auth] Google error:', e.code, e.message)
      if (e.code === 'auth/unauthorized-domain') setAuthError('unauthorized-domain')
      else if (e.code === 'auth/popup-blocked') {
        // Fallback para redirect se popup bloqueado
        await signInWithRedirect(auth, googleProvider)
      } else {
        setAuthError(e.message)
      }
    }
  }

  // ── Cadastro com e-mail ────────────────────────────────────────────────────
  const registerWithEmail = async (name, email, password) => {
    try {
      setAuthError(null)
      const cred = await createUserWithEmailAndPassword(auth, email, password)
      await updateProfile(cred.user, { displayName: name })
      await sendEmailVerification(cred.user)
      return { ok: true }
    } catch (e) {
      console.error('[Auth] Register error:', e.code, e.message)
      const msg = friendlyError(e.code)
      setAuthError(msg)
      return { ok: false, error: msg }
    }
  }

  // ── Login com e-mail ───────────────────────────────────────────────────────
  const loginWithEmail = async (email, password) => {
    try {
      setAuthError(null)
      await signInWithEmailAndPassword(auth, email, password)
      return { ok: true }
    } catch (e) {
      console.error('[Auth] Email login error:', e.code, e.message)
      const msg = friendlyError(e.code)
      setAuthError(msg)
      return { ok: false, error: msg }
    }
  }

  // ── Recuperação de senha ───────────────────────────────────────────────────
  const resetPassword = async (email) => {
    try {
      setAuthError(null)
      await sendPasswordResetEmail(auth, email)
      return { ok: true }
    } catch (e) {
      const msg = friendlyError(e.code)
      setAuthError(msg)
      return { ok: false, error: msg }
    }
  }

  // Manter compatibilidade: "login" sem argumento = Google
  const login = loginWithGoogle

  const logout = () => signOut(auth)

  return { user, loading, login, loginWithGoogle, loginWithEmail, registerWithEmail, resetPassword, logout, authError, setAuthError }
}

// ── Mensagens de erro amigáveis em PT-BR ──────────────────────────────────────
function friendlyError(code) {
  const map = {
    'auth/email-already-in-use':    'Este e-mail já está cadastrado.',
    'auth/invalid-email':           'E-mail inválido.',
    'auth/weak-password':           'Senha fraca. Use pelo menos 6 caracteres.',
    'auth/user-not-found':          'Nenhuma conta com este e-mail.',
    'auth/wrong-password':          'Senha incorreta.',
    'auth/invalid-credential':      'E-mail ou senha incorretos.',
    'auth/too-many-requests':       'Muitas tentativas. Aguarde alguns minutos.',
    'auth/network-request-failed':  'Sem conexão. Verifique sua internet.',
    'auth/unauthorized-domain':     'Domínio não autorizado no Firebase.',
    'auth/user-disabled':           'Esta conta foi desativada.',
  }
  return map[code] || 'Ocorreu um erro. Tente novamente.'
}
