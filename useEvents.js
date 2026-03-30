import { useState, useEffect, useCallback } from 'react'
import { ref, push, onValue, serverTimestamp, query, orderByChild, limitToLast } from 'firebase/database'
import { db } from '../lib/firebase'
import { EVENT_META } from '../lib/constants'

export function useEvents() {
  const [events, setEvents] = useState([])

  useEffect(() => {
    // Escuta últimos 200 eventos em tempo real
    const eventsRef = query(ref(db, 'events'), orderByChild('ts'), limitToLast(200))
    const unsub = onValue(eventsRef, (snap) => {
      const data = snap.val()
      if (!data) return setEvents([])
      const list = Object.entries(data).map(([id, val]) => ({ id, ...val }))
      // Filtra eventos com mais de 1h
      const cutoff = Date.now() - 3600000
      setEvents(list.filter(e => e.ts > cutoff))
    })
    return unsub
  }, [])

  const addEvent = useCallback(async (locationId, type, userId, userName) => {
    if (!EVENT_META[type]) return
    await push(ref(db, 'events'), {
      locationId,
      type,
      userId,
      userName,
      ts: Date.now(),
      simulated: false,
    })
  }, [])

  return { events, addEvent }
}
