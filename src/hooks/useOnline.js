import { useState, useEffect } from 'react'
import { ref, onValue, set, onDisconnect, serverTimestamp } from 'firebase/database'
import { db } from '../lib/firebase'

export function useOnline(uid) {
  const [count, setCount] = useState(1)

  useEffect(() => {
    if (!uid) return  // aguarda autenticação antes de qualquer escrita

    const myRef   = ref(db, `presence/${uid}`)
    const connRef = ref(db, '.info/connected')
    const allRef  = ref(db, 'presence')

    const unsubConn = onValue(connRef, snap => {
      if (!snap.val()) return
      // .catch() silencia erros enquanto o token de auth ainda está sendo validado
      onDisconnect(myRef).remove().catch(() => {})
      set(myRef, { online: true, ts: serverTimestamp() }).catch(() => {})
    })

    const unsubAll = onValue(allRef, snap => {
      setCount(snap.val() ? Object.keys(snap.val()).length : 1)
    }, () => {
      // Silencia permission_denied — ocorre no intervalo entre mount e auth pronta
    })

    return () => {
      unsubConn()
      unsubAll()
      set(myRef, null).catch(() => {})
    }
  }, [uid])

  return count
}
