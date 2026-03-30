import { useState, useEffect, useCallback } from 'react'
import { ref, push, onValue, query, orderByChild, limitToLast } from 'firebase/database'
import { db } from '../lib/firebase'

export function useComments(locationId) {
  const [comments, setComments] = useState([])

  useEffect(() => {
    if (!locationId) return
    const q = query(ref(db, `comments/${locationId}`), orderByChild('ts'), limitToLast(20))
    const unsub = onValue(q, (snap) => {
      const data = snap.val()
      if (!data) return setComments([])
      const list = Object.entries(data).map(([id, v]) => ({ id, ...v }))
      setComments(list.sort((a, b) => b.ts - a.ts))
    })
    return unsub
  }, [locationId])

  const addComment = useCallback(async (text, userId, userName, userPhoto) => {
    if (!text.trim() || !locationId) return
    await push(ref(db, `comments/${locationId}`), {
      text: text.trim().slice(0, 200),
      userId,
      userName,
      userPhoto,
      ts: Date.now(),
    })
  }, [locationId])

  return { comments, addComment }
}
