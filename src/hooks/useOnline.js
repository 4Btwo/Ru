import { useState, useEffect } from 'react'
import { ref, onValue, set, onDisconnect, serverTimestamp } from 'firebase/database'
import { db } from '../lib/firebase'

export function useOnline(uid) {
  const [count, setCount] = useState(1)

  useEffect(() => {
    if (!uid) return   // aguarda autenticação

    const myRef   = ref(db, `presence/${uid}`)
    const connRef = ref(db, '.info/connected')
    const allRef  = ref(db, 'presence')

    const unsubConn = onValue(connRef, snap => {
      if (!snap.val()) return
      onDisconnect(myRef).remove()
      set(myRef, { online: true, ts: serverTimestamp() })
    })
    const unsubAll = onValue(allRef, snap => {
      setCount(snap.val() ? Object.keys(snap.val()).length : 1)
    }, (error) => {
      console.warn('[useOnline] erro:', error.message)
    })

    return () => {
      unsubConn()
      unsubAll()
      set(myRef, null)
    }
  }, [uid])

  return count
}
