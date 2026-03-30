// hooks/usePresence.js
// Gerencia presença em tempo real usando Firebase RTDB + onDisconnect()
// Retorna o número de usuários online no momento.

import { useEffect, useState } from 'react'
import { ref, onValue, set, onDisconnect, serverTimestamp } from 'firebase/database'
import { db } from '../lib/firebase'

export function usePresence(uid) {
  const [onlineCount, setOnlineCount] = useState(0)

  useEffect(() => {
    if (!uid) return

    const presenceRef    = ref(db, `presence/${uid}`)
    const connectedRef   = ref(db, '.info/connected')

    // Escuta conexão com o Firebase
    const unsub = onValue(connectedRef, async snap => {
      if (!snap.val()) return

      // Marca presença ao conectar
      await set(presenceRef, {
        online:    true,
        lastSeen:  serverTimestamp(),
      })

      // Remove presença automaticamente ao desconectar
      onDisconnect(presenceRef).set({
        online:   false,
        lastSeen: serverTimestamp(),
      })
    })

    return () => unsub()
  }, [uid])

  useEffect(() => {
    // Conta usuários com online === true
    const presenceAllRef = ref(db, 'presence')
    const unsub = onValue(presenceAllRef, snap => {
      if (!snap.exists()) { setOnlineCount(0); return }
      let count = 0
      snap.forEach(child => {
        if (child.val()?.online === true) count++
      })
      setOnlineCount(count)
    })
    return () => unsub()
  }, [])

  return onlineCount
}
