import { useState, useEffect, useCallback } from 'react'
import { ref, push, onValue, query, orderByChild, limitToLast, serverTimestamp } from 'firebase/database'
import { db } from '../lib/firebase'

export function useComments(locationId, uid) {
  const [comments, setComments] = useState([])

  useEffect(() => {
    if (!locationId) return setComments([])
    const q = query(ref(db, `comments/${locationId}`), orderByChild('ts'), limitToLast(30))
    const unsub = onValue(q, (snap) => {
      const data = snap.val()
      if (!data) return setComments([])
      const list = Object.entries(data)
        .map(([id, v]) => ({ id, ...v }))
        .sort((a, b) => b.ts - a.ts)
      setComments(list)
    })
    return unsub
  }, [locationId])

  const addComment = useCallback(async (text, userId, userName, userPhoto) => {
    if (!uid) throw new Error('Usuário não autenticado')
    if (!text.trim() || !locationId) return
    await push(ref(db, `comments/${locationId}`), {
      text:      text.trim().slice(0, 200),
      userId,
      userName,
      userPhoto,
      ts:        serverTimestamp(),
    })
  }, [locationId, uid])

  return { comments, addComment }
}
