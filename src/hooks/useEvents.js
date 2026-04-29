import { useState, useEffect, useCallback } from 'react'
import { ref, push, onValue, query, orderByChild, limitToLast, serverTimestamp } from 'firebase/database'
import { db } from '../lib/firebase'
import { filterLiveEvents } from '../lib/hotspot'
import { SPAM_MAX_PER_MIN, SPAM_WINDOW_MS, EVENT_META } from '../lib/constants'

const spamMap = {}

export function useEvents(uid) {
  const [events, setEvents] = useState([])

  useEffect(() => {
    if (!uid) return

    const q = query(ref(db, 'events'), orderByChild('ts'), limitToLast(500))
    const unsub = onValue(q, (snap) => {
      const data = snap.val()
      if (!data) return setEvents([])
      const all = Object.entries(data).map(([id, v]) => ({ id, ...v }))
      setEvents(filterLiveEvents(all))
    }, (error) => {
      console.warn('[useEvents] erro:', error.message)
    })
    return unsub
  }, [uid])

  const addEvent = useCallback(async ({ locationId, type, userId, userName, userReports = 0 }) => {
    if (!uid) throw new Error('Usuário não autenticado')
    if (!EVENT_META[type]) throw new Error('Tipo inválido')

    const now = Date.now()
    const key = `${userId}:${type}`
    spamMap[key] = (spamMap[key] || []).filter(t => now - t < SPAM_WINDOW_MS)
    if (spamMap[key].length >= SPAM_MAX_PER_MIN) throw new Error('spam')
    spamMap[key].push(now)

    await push(ref(db, 'events'), {
      locationId, type, userId, userName, userReports,
      ts: serverTimestamp(),
    })
  }, [uid])

  return { events, addEvent }
}
