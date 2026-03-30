import { useState, useEffect } from 'react'
import { ref, onValue, query, orderByChild, limitToLast } from 'firebase/database'
import { db } from '../lib/firebase'

export function useLeaderboard() {
  const [leaders, setLeaders] = useState([])

  useEffect(() => {
    const q = query(ref(db, 'users'), orderByChild('score'), limitToLast(10))
    const unsub = onValue(q, (snap) => {
      const data = snap.val()
      if (!data) return setLeaders([])
      const list = Object.entries(data)
        .map(([uid, u]) => ({ uid, ...u }))
        .sort((a, b) => (b.score || 0) - (a.score || 0))
      setLeaders(list)
    })
    return unsub
  }, [])

  return leaders
}
