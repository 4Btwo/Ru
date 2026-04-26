import { useState, useEffect } from 'react'
import { ref, onValue, set, onDisconnect, serverTimestamp } from 'firebase/database'
import { db } from '../lib/firebase'

export function useOnline(uid) {
  const [count, setCount] = useState(1)

  useEffect(() => {
    if (!uid) return

    const myRef   = ref(db, `presence/${uid}`)
    const connRef = ref(db, '.info/connected')

    // Registra presença ao conectar e remove ao desconectar
    const unsubConn = onValue(connRef, snap => {
      if (!snap.val()) return
      onDisconnect(myRef).remove()
      set(myRef, { online: true, ts: serverTimestamp() })
    })

    // Lê apenas o próprio nó de presença do usuário (sem precisar de acesso ao nó global)
    // O contador de usuários online é estimativo — sem leitura global evitamos permission_denied
    // Para contar usuários online, use uma Cloud Function ou leia o nó /presence com regra própria
    const unsubMine = onValue(myRef, () => {}, (err) => {
      console.warn('[useOnline] presença:', err.message)
    })

    return () => {
      unsubConn()
      unsubMine()
      set(myRef, null).catch(() => {})
    }
  }, [uid])

  // Retorna 1 como fallback — para contar online, ajuste as regras para
  // permitir leitura de /presence completo (requer ajuste de segurança deliberado)
  return count
}
