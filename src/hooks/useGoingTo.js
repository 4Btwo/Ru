// ── VOu LÁ ────────────────────────────────────────────────────────────────────
// Salva/cancela intenção de ir a um local. Expira em 3 horas automaticamente.
import { useState, useEffect, useCallback } from 'react'
import { ref, set, remove, onValue, query, orderByChild } from 'firebase/database'
import { db } from '../lib/firebase'

const EXPIRY_MS = 3 * 60 * 60 * 1000 // 3 horas

export function useGoingTo(locationId, uid) {
  const [goingList, setGoingList] = useState([])
  const [isGoing,   setIsGoing]   = useState(false)

  useEffect(() => {
    if (!locationId) return
    const q = query(ref(db, `going/${locationId}`), orderByChild('ts'))
    const unsub = onValue(q, (snap) => {
      const data = snap.val()
      if (!data) { setGoingList([]); setIsGoing(false); return }
      const now  = Date.now()
      const live = Object.entries(data)
        .map(([id, v]) => ({ id, ...v }))
        .filter(g => now - g.ts < EXPIRY_MS)
      setGoingList(live)
      setIsGoing(live.some(g => g.userId === uid))
    })
    return unsub
  }, [locationId, uid])

  const toggleGoing = useCallback(async (userName) => {
    if (!locationId || !uid) return
    const nodeRef = ref(db, `going/${locationId}/${uid}`)
    if (isGoing) {
      await remove(nodeRef)
    } else {
      await set(nodeRef, { userId: uid, userName, ts: Date.now() })
    }
  }, [locationId, uid, isGoing])

  return { goingList, isGoing, toggleGoing }
}
